import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { User, UserRole } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { StudentAssessment, AssessmentType, AssessmentStatus } from '../models/AssessmentRubric';
import { Establishment } from '../models/Establishment';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { WeeklySummary } from '../models/WeeklySummary';
import { DigitalStorageService } from '../services/digitalStorageService';
import { Types } from 'mongoose';

export const getSystemMetrics = async (req: AuthRequest, res: Response) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalLogs = await LogEntry.countDocuments();
        const totalAssessments = await StudentAssessment.countDocuments();
        
        const logsByStatus = await LogEntry.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const weeklyTrends = await WeeklySummary.aggregate([
            { $group: { _id: '$week_number', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const roleDistribution = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            overview: { totalUsers, totalLogs, totalAssessments },
            logsByStatus,
            weeklyTrends,
            roleDistribution
        });
    } catch(err) {
        res.status(500).json({ message: 'Error retrieving analytics data' });
    }
};

import { generateFinalITFReport } from '../utils/pdfGenerator';
import { AssessorType } from '../models/Assessment';

export const getFinalITFReportDoc = async (req: AuthRequest, res: Response) => {
    try {
        const students = await StudentProfile.find().populate('user_id', 'first_name last_name email');
        const reportData = [];

        for (const student of students) {
            // Get total hours
            const logs = await LogEntry.find({ student_id: student._id });
            const total_hours = logs.reduce((sum, log) => sum + (log.total_hours || 0), 0);

            // Get industry score
            const industryAssessment = await StudentAssessment.findOne({ student_id: student._id, assessment_type: AssessmentType.INDUSTRY_SUPERVISOR });
            // Get school score
            const schoolAssessment = await StudentAssessment.findOne({ student_id: student._id, assessment_type: AssessmentType.SCHOOL_SUPERVISOR });

            const user: any = student.user_id;

            reportData.push({
                matriculation_number: student.matriculation_number,
                student_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
                program_level: student.program_level,
                total_hours,
                industry_score: industryAssessment ? industryAssessment.total_score : null,
                school_score: schoolAssessment ? schoolAssessment.total_score : null
            });
        }

        const pdfBuffer = await generateFinalITFReport(reportData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=final-itf-report.pdf');
        res.send(pdfBuffer);
    } catch(e) {
        console.error('Error generating ITF report:', e);
        res.status(500).json({ message: 'Error generating ITF report' });
    }
};

export const getTrendAnalysis = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

        const { period = '12', metric = 'all' } = req.query;
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - Number(period));

        // Skills trend analysis
        const skillsTrend = await DigitalStorageService.getSkillsAnalytics({
            dateRange: {
                start: monthsAgo,
                end: new Date()
            }
        });

        // Regional comparison
        const regionalComparison = await getRegionalComparison(monthsAgo);

        // Performance trends
        const performanceTrends = await getPerformanceTrends(monthsAgo);

        // Activity trends
        const activityTrends = await getActivityTrends(monthsAgo);

        res.status(200).json({
            period: Number(period),
            skillsTrend,
            regionalComparison,
            performanceTrends,
            activityTrends
        });
    } catch (error) {
        console.error('getTrendAnalysis error:', error);
        res.status(500).json({ message: 'Error fetching trend analysis' });
    }
};

export const getRegionalComparisons = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

        const { state, dateRange } = req.query;

        const startDate = dateRange ? new Date(dateRange as string) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        // State-wise performance metrics
        const statePerformance = await Establishment.aggregate([
            {
                $lookup: {
                    from: 'studentprofiles',
                    localField: '_id',
                    foreignField: 'establishment_id',
                    as: 'students'
                }
            },
            {
                $lookup: {
                    from: 'logentries',
                    let: { studentIds: '$students._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$student_id', '$$studentIds'] },
                                        { $gte: ['$submitted_at', startDate] },
                                        { $lte: ['$submitted_at', endDate] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'logs'
                }
            },
            {
                $lookup: {
                    from: 'studentassessments',
                    let: { studentIds: '$students._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$student_id', '$$studentIds'] },
                                        { $eq: ['$status', AssessmentStatus.APPROVED] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'assessments'
                }
            },
            {
                $group: {
                    _id: '$state',
                    establishments: { $sum: 1 },
                    totalStudents: { $sum: { $size: '$students' } },
                    totalLogEntries: { $sum: { $size: '$logs' } },
                    totalAssessments: { $sum: { $size: '$assessments' } },
                    avgAssessmentScore: { $avg: '$assessments.weighted_total' },
                    uniqueSkills: { $addToSet: '$logs.skills_learned' }
                }
            },
            {
                $project: {
                    state: '$_id',
                    establishments: 1,
                    totalStudents: 1,
                    totalLogEntries: 1,
                    totalAssessments: 1,
                    avgAssessmentScore: { $round: ['$avgAssessmentScore', 2] },
                    uniqueSkillCount: { $size: '$uniqueSkills' },
                    engagementRate: {
                        $multiply: [
                            { $divide: ['$totalLogEntries', '$totalStudents'] },
                            100
                        ]
                    },
                    completionRate: {
                        $multiply: [
                            { $divide: ['$totalAssessments', '$totalStudents'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { avgAssessmentScore: -1 } }
        ]);

        // Filter by state if specified
        const filteredData = state 
            ? statePerformance.filter(s => s.state === state)
            : statePerformance;

        res.status(200).json({
            regionalData: filteredData,
            summary: {
                totalStates: statePerformance.length,
                avgStudentsPerState: statePerformance.reduce((sum, s) => sum + s.totalStudents, 0) / statePerformance.length,
                avgAssessmentScore: statePerformance.reduce((sum, s) => sum + s.avgAssessmentScore, 0) / statePerformance.length
            }
        });
    } catch (error) {
        console.error('getRegionalComparisons error:', error);
        res.status(500).json({ message: 'Error fetching regional comparisons' });
    }
};

export const getSupervisorPerformanceAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

        const { period = '90', role } = req.query;
        const daysAgo = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);

        // Supervisor performance metrics
        const supervisorMetrics = await User.aggregate([
            {
                $match: {
                    role: role ? role : { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] }
                }
            },
            {
                $lookup: {
                    from: 'supervisorassignments',
                    let: { supervisorId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$industry_supervisor_id', '$$supervisorId'] },
                                        { $eq: ['$school_supervisor_id', '$$supervisorId'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'assignments'
                }
            },
            {
                $lookup: {
                    from: 'studentassessments',
                    let: { supervisorId: '$_id', assignmentIds: '$assignments._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$assessor_id', '$$supervisorId'] },
                                        { $gte: ['$created_at', daysAgo] },
                                        { $eq: ['$status', AssessmentStatus.APPROVED] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'assessments'
                    }
                },
                {
                $lookup: {
                    from: 'logentries',
                    let: { assignmentIds: '$assignments._id' },
                    pipeline: [
                        {
                            $lookup: {
                                from: 'supervisorassignments',
                                localField: 'student_id',
                                foreignField: 'student_id',
                                as: 'assignment'
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $gte: ['$submitted_at', daysAgo] },
                                        {
                                            $in: [
                                                '$assignment.industry_supervisor_id',
                                                '$$supervisorId'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'relatedLogs'
                }
            },
            {
                $project: {
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    role: 1,
                    totalAssignments: { $size: '$assignments' },
                    totalAssessments: { $size: '$assessments' },
                    avgAssessmentScore: { $avg: '$assessments.weighted_total' },
                    avgResponseTime: {
                        $avg: {
                            $map: {
                                input: '$assessments',
                                as: 'assessment',
                                in: {
                                    $divide: [
                                        { $subtract: ['$$assessment.approved_at', '$$assessment.submitted_at'] },
                                        1000 * 60 * 60 // Convert to hours
                                    ]
                                }
                            }
                        }
                    },
                    totalReviews: { $size: '$relatedLogs' },
                    avgReviewTime: {
                        $avg: {
                            $map: {
                                input: '$relatedLogs',
                                as: 'log',
                                in: {
                                    $divide: [
                                        { $subtract: ['$$log.approved_at', '$$log.submitted_at'] },
                                        1000 * 60 * 60
                                    ]
                                }
                            }
                        }
                    },
                    lastActivity: { $max: '$assessments.created_at' }
                }
            },
            { $match: { totalAssessments: { $gt: 0 } } },
            { $sort: { avgAssessmentScore: -1, avgResponseTime: 1 } }
        ]);

        // Performance categories
        const performanceCategories = {
            excellent: supervisorMetrics.filter(s => s.avgAssessmentScore >= 80 && s.avgResponseTime <= 24),
            good: supervisorMetrics.filter(s => s.avgAssessmentScore >= 60 && s.avgResponseTime <= 48),
            needsImprovement: supervisorMetrics.filter(s => s.avgAssessmentScore < 60 || s.avgResponseTime > 72)
        };

        res.status(200).json({
            supervisorMetrics,
            performanceCategories,
            summary: {
                totalSupervisors: supervisorMetrics.length,
                avgResponseTime: supervisorMetrics.reduce((sum, s) => sum + (s.avgResponseTime || 0), 0) / supervisorMetrics.length,
                avgAssessmentScore: supervisorMetrics.reduce((sum, s) => sum + (s.avgAssessmentScore || 0), 0) / supervisorMetrics.length
            }
        });
    } catch (error) {
        console.error('getSupervisorPerformanceAnalytics error:', error);
        res.status(500).json({ message: 'Error fetching supervisor performance analytics' });
    }
};

// Helper functions
async function getRegionalComparison(startDate: Date) {
    const regionalData = await Establishment.aggregate([
        {
            $lookup: {
                from: 'studentprofiles',
                localField: '_id',
                foreignField: 'establishment_id',
                as: 'students'
            }
        },
        {
            $group: {
                _id: '$state',
                establishments: { $sum: 1 },
                students: { $sum: { $size: '$students' } },
                cities: { $addToSet: '$city' }
            }
        },
        {
            $project: {
                state: '$_id',
                establishments: 1,
                students: 1,
                cities: { $size: '$cities' },
                avgStudentsPerEstablishment: { $divide: ['$students', '$establishments'] }
            }
        },
        { $sort: { students: -1 } }
    ]);

    return regionalData;
}

async function getPerformanceTrends(startDate: Date) {
    const monthlyTrends = await StudentAssessment.aggregate([
        {
            $match: {
                created_at: { $gte: startDate },
                status: AssessmentStatus.APPROVED
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$created_at' },
                    month: { $month: '$created_at' }
                },
                totalAssessments: { $sum: 1 },
                avgScore: { $avg: '$weighted_total' },
                maxScore: { $max: '$weighted_total' },
                minScore: { $min: '$weighted_total' }
            }
        },
        {
            $project: {
                month: { $concat: [{ $toString: '$_id.year' }, '-', { $toString: '$_id.month' }] },
                totalAssessments: 1,
                avgScore: { $round: ['$avgScore', 2] },
                maxScore: 1,
                minScore: 1
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return monthlyTrends;
}

async function getActivityTrends(startDate: Date) {
    const activityTrends = await LogEntry.aggregate([
        {
            $match: {
                submitted_at: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$submitted_at' },
                    month: { $month: '$submitted_at' },
                    day: { $dayOfMonth: '$submitted_at' }
                },
                totalEntries: { $sum: 1 },
                totalHours: { $sum: '$total_hours' },
                uniqueStudents: { $addToSet: '$student_id' }
            }
        },
        {
            $project: {
                date: { $concat: [{ $toString: '$_id.year' }, '-', { $toString: '$_id.month' }, '-', { $toString: '$_id.day' }] },
                totalEntries: 1,
                totalHours: 1,
                activeStudents: { $size: '$uniqueStudents' },
                avgHoursPerEntry: { $divide: ['$totalHours', '$totalEntries'] }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return activityTrends;
}
