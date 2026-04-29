import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { StudentAssessment, AssessmentType, AssessmentStatus } from '../models/AssessmentRubric';
import { StudentProfile } from '../models/StudentProfile';
import { User, UserRole } from '../models/User';
import { Establishment } from '../models/Establishment';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { CompanyRequest, CompanyRequestStatus } from '../models/CompanyRequest';
import { Types } from 'mongoose';

export const getNationalStatistics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { academic_year, semester, institution, state, company_type } = req.query;

    // Build base query filters
    let institutionFilter = {};
    if (institution) {
      institutionFilter = { 'establishment.name': institution };
    }
    
    let stateFilter = {};
    if (state) {
      stateFilter = { 'establishment.state': state };
    }

    let companyTypeFilter = {};
    if (company_type) {
      companyTypeFilter = { 'establishment.nature_of_business': company_type };
    }

    // Overall program statistics
    const totalStudents = await StudentProfile.countDocuments();
    const activeStudents = await LogEntry.distinct('student_id');
    const totalEstablishments = await Establishment.countDocuments({ is_active: true });

    // Assessment completion rates
    const industryAssessments = await StudentAssessment.aggregate([
      {
        $match: {
          assessment_type: AssessmentType.INDUSTRY_SUPERVISOR,
          status: AssessmentStatus.APPROVED,
          ...(academic_year && { academic_year }),
          ...(semester && { semester })
        }
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'student_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'student.establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $match: {
          ...institutionFilter,
          ...stateFilter,
          ...companyTypeFilter
        }
      },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgScore: { $avg: '$weighted_total' },
          students: { $addToSet: '$student_id' }
        }
      }
    ]);

    const schoolAssessments = await StudentAssessment.aggregate([
      {
        $match: {
          assessment_type: AssessmentType.SCHOOL_SUPERVISOR,
          status: AssessmentStatus.APPROVED,
          ...(academic_year && { academic_year }),
          ...(semester && { semester })
        }
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'student_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'student.establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $match: {
          ...institutionFilter,
          ...stateFilter,
          ...companyTypeFilter
        }
      },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgScore: { $avg: '$weighted_total' },
          students: { $addToSet: '$student_id' }
        }
      }
    ]);

    // Grade distribution
    const gradeDistribution = await StudentAssessment.aggregate([
      {
        $match: {
          final_grade: { $exists: true },
          ...(academic_year && { academic_year }),
          ...(semester && { semester })
        }
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'student_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'student.establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $match: {
          ...institutionFilter,
          ...stateFilter,
          ...companyTypeFilter
        }
      },
      {
        $group: {
          _id: '$final_grade.letter_grade',
          count: { $sum: 1 },
          avgPercentage: { $avg: '$final_grade.percentage' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Company performance analytics
    const companyPerformance = await Establishment.aggregate([
      {
        $match: { is_active: true }
      },
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
          from: 'studentassessments',
          let: { studentIds: '$students._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$student_id', '$$studentIds'] },
                    { $eq: ['$assessment_type', AssessmentType.INDUSTRY_SUPERVISOR] },
                    { $eq: ['$status', AssessmentStatus.APPROVED] },
                    ...(academic_year ? [{ $eq: ['$academic_year', academic_year] }] : []),
                    ...(semester ? [{ $eq: ['$semester', semester] }] : [])
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
          let: { studentIds: '$students._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$student_id', '$$studentIds'] },
                    { $eq: ['$status', LogStatus.APPROVED] }
                  ]
                }
              }
            }
          ],
          as: 'logs'
        }
      },
      {
        $project: {
          name: 1,
          city: 1,
          state: 1,
          nature_of_business: 1,
          studentCount: { $size: '$students' },
          assessmentCount: { $size: '$assessments' },
          avgAssessmentScore: { $avg: '$assessments.weighted_total' },
          totalLogEntries: { $size: '$logs' },
          avgHoursPerStudent: {
            $avg: {
              $divide: [{ $sum: '$logs.total_hours' }, { $size: '$students' }]
            }
          }
        }
      },
      { $match: { studentCount: { $gt: 0 } } },
      { $sort: { avgAssessmentScore: -1 } }
    ]);

    // State-wise statistics
    const stateStatistics = await Establishment.aggregate([
      {
        $match: { is_active: true }
      },
      {
        $group: {
          _id: '$state',
          establishmentCount: { $sum: 1 },
          studentCount: { $sum: '$student_count' }
        }
      },
      { $sort: { studentCount: -1 } }
    ]);

    // Program completion rates
    const completionRates = await StudentAssessment.aggregate([
      {
        $match: {
          final_grade: { $exists: true },
          ...(academic_year && { academic_year }),
          ...(semester && { semester })
        }
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'student_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'student.establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $match: {
          ...institutionFilter,
          ...stateFilter,
          ...companyTypeFilter
        }
      },
      {
        $group: {
          _id: null,
          completedStudents: { $sum: 1 },
          avgGPA: { $avg: '$final_grade.gpa_points' },
          avgPercentage: { $avg: '$final_grade.percentage' }
        }
      }
    ]);

    // Supervisor performance metrics
    const supervisorMetrics = await User.aggregate([
      {
        $match: {
          role: { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] }
        }
      },
      {
        $lookup: {
          from: 'studentassessments',
          let: { supervisorId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assessor_id', '$$supervisorId'] },
                    { $eq: ['$status', AssessmentStatus.APPROVED] },
                    ...(academic_year ? [{ $eq: ['$academic_year', academic_year] }] : []),
                    ...(semester ? [{ $eq: ['$semester', semester] }] : [])
                  ]
                }
              }
            }
          ],
          as: 'assessments'
        }
      },
      {
        $project: {
          first_name: 1,
          last_name: 1,
          email: 1,
          role: 1,
          assessmentCount: { $size: '$assessments' },
          avgScore: { $avg: '$assessments.weighted_total' }
        }
      },
      { $match: { assessmentCount: { $gt: 0 } } },
      { $sort: { avgScore: -1 } }
    ]);

    // System health metrics
    const systemHealth = {
      pendingAssessments: await StudentAssessment.countDocuments({
        status: AssessmentStatus.SUBMITTED,
        ...(academic_year && { academic_year }),
        ...(semester && { semester })
      }),
      pendingCompanyRequests: await CompanyRequest.countDocuments({
        status: CompanyRequestStatus.PENDING
      }),
      inactiveStudents: await StudentProfile.aggregate([
        {
          $lookup: {
            from: 'logentries',
            localField: '_id',
            foreignField: 'student_id',
            as: 'logs'
          }
        },
        {
          $match: {
            $or: [
              { logs: { $size: 0 } },
              {
                'logs.submitted_at': {
                  $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            ]
          }
        },
        { $count: 'inactiveCount' }
      ]),
      systemUptime: '99.9%', // This would come from monitoring system
      averageResponseTime: '2.3s' // This would come from performance monitoring
    };

    res.status(200).json({
      overview: {
        totalStudents,
        activeStudents: activeStudents.length,
        totalEstablishments,
        industryAssessments: industryAssessments[0] || { totalAssessments: 0, avgScore: 0, students: [] },
        schoolAssessments: schoolAssessments[0] || { totalAssessments: 0, avgScore: 0, students: [] }
      },
      gradeDistribution,
      companyPerformance,
      stateStatistics,
      completionRates: completionRates[0] || { completedStudents: 0, avgGPA: 0, avgPercentage: 0 },
      supervisorMetrics,
      systemHealth
    });
  } catch (error) {
    console.error('getNationalStatistics error:', error);
    res.status(500).json({ message: 'Error fetching national statistics' });
  }
};

export const getInstitutionalBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { academic_year, semester } = req.query;

    // Get detailed breakdown by institution
    const institutionalBreakdown = await Establishment.aggregate([
      {
        $match: { is_active: true }
      },
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
          from: 'studentassessments',
          let: { studentIds: '$students._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$student_id', '$$studentIds'] },
                    { $eq: ['$assessment_type', AssessmentType.INDUSTRY_SUPERVISOR] },
                    { $eq: ['$status', AssessmentStatus.APPROVED] },
                    ...(academic_year ? [{ $eq: ['$academic_year', academic_year] }] : []),
                    ...(semester ? [{ $eq: ['$semester', semester] }] : [])
                  ]
                }
              }
            }
          ],
          as: 'industryAssessments'
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
                    { $eq: ['$assessment_type', AssessmentType.SCHOOL_SUPERVISOR] },
                    { $eq: ['$status', AssessmentStatus.APPROVED] },
                    ...(academic_year ? [{ $eq: ['$academic_year', academic_year] }] : []),
                    ...(semester ? [{ $eq: ['$semester', semester] }] : [])
                  ]
                }
              }
            }
          ],
          as: 'schoolAssessments'
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
                    { $eq: ['$final_grade.letter_grade', 'A'] },
                    ...(academic_year ? [{ $eq: ['$academic_year', academic_year] }] : []),
                    ...(semester ? [{ $eq: ['$semester', semester] }] : [])
                  ]
                }
              }
            }
          ],
          as: 'topPerformers'
        }
      },
      {
        $project: {
          name: 1,
          city: 1,
          state: 1,
          nature_of_business: 1,
          studentCount: { $size: '$students' },
          industryAssessmentCount: { $size: '$industryAssessments' },
          schoolAssessmentCount: { $size: '$schoolAssessments' },
          avgIndustryScore: { $avg: '$industryAssessments.weighted_total' },
          avgSchoolScore: { $avg: '$schoolAssessments.weighted_total' },
          topPerformersCount: { $size: '$topPerformers' },
          completionRate: {
            $multiply: [
              { $divide: [{ $size: '$schoolAssessments' }, { $size: '$students' }] },
              100
            ]
          }
        }
      },
      { $match: { studentCount: { $gt: 0 } } },
      { $sort: { avgIndustryScore: -1 } }
    ]);

    res.status(200).json(institutionalBreakdown);
  } catch (error) {
    console.error('getInstitutionalBreakdown error:', error);
    res.status(500).json({ message: 'Error fetching institutional breakdown' });
  }
};

export const getTrendAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { period = '12' } = req.query; // months

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - Number(period));

    // Monthly assessment trends
    const assessmentTrends = await StudentAssessment.aggregate([
      {
        $match: {
          created_at: { $gte: monthsAgo },
          status: AssessmentStatus.APPROVED
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            assessment_type: '$assessment_type'
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$weighted_total' }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          industryAssessments: {
            $push: {
              $cond: [
                { $eq: ['$_id.assessment_type', AssessmentType.INDUSTRY_SUPERVISOR] },
                { count: '$count', avgScore: '$avgScore' },
                null
              ]
            }
          },
          schoolAssessments: {
            $push: {
              $cond: [
                { $eq: ['$_id.assessment_type', AssessmentType.SCHOOL_SUPERVISOR] },
                { count: '$count', avgScore: '$avgScore' },
                null
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Grade trends over time
    const gradeTrends = await StudentAssessment.aggregate([
      {
        $match: {
          final_grade: { $exists: true },
          created_at: { $gte: monthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            grade: '$final_grade.letter_grade'
          },
          count: { $sum: 1 },
          avgPercentage: { $avg: '$final_grade.percentage' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.grade': 1 } }
    ]);

    // Company registration trends
    const companyTrends = await CompanyRequest.aggregate([
      {
        $match: {
          created_at: { $gte: monthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      assessmentTrends,
      gradeTrends,
      companyTrends,
      period: Number(period)
    });
  } catch (error) {
    console.error('getTrendAnalysis error:', error);
    res.status(500).json({ message: 'Error fetching trend analysis' });
  }
};

export const getSystemAlerts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const alerts = [];

    // Low-performing companies
    const lowPerformingCompanies = await Establishment.aggregate([
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
          from: 'studentassessments',
          let: { studentIds: '$students._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$student_id', '$$studentIds'] },
                    { $eq: ['$assessment_type', AssessmentType.INDUSTRY_SUPERVISOR] },
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
        $match: {
          studentCount: { $gt: 0 },
          $expr: { $lt: [{ $avg: '$assessments.weighted_total' }, 40] }
        }
      },
      {
        $project: {
          name: 1,
          city: 1,
          state: 1,
          avgScore: { $avg: '$assessments.weighted_total' },
          studentCount: { $size: '$students' }
        }
      },
      { $sort: { avgScore: 1 } }
    ]);

    if (lowPerformingCompanies.length > 0) {
      alerts.push({
        type: 'low_performing_companies',
        severity: 'high',
        count: lowPerformingCompanies.length,
        message: `${lowPerformingCompanies.length} companies with below-average performance`,
        data: lowPerformingCompanies
      });
    }

    // High failure rates
    const highFailureRates = await StudentAssessment.aggregate([
      {
        $match: {
          final_grade: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$final_grade.letter_grade',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalGrades = highFailureRates.reduce((sum, grade) => sum + grade.count, 0);
    const failureCount = highFailureRates
      .filter(grade => ['F', 'D'].includes(grade._id))
      .reduce((sum, grade) => sum + grade.count, 0);

    if (totalGrades > 0 && (failureCount / totalGrades) > 0.15) {
      alerts.push({
        type: 'high_failure_rate',
        severity: 'medium',
        count: failureCount,
        message: `High failure rate: ${((failureCount / totalGrades) * 100).toFixed(1)}%`,
        data: { failureCount, totalGrades, rate: (failureCount / totalGrades) * 100 }
      });
    }

    // Pending assessments
    const pendingCount = await StudentAssessment.countDocuments({
      status: AssessmentStatus.SUBMITTED
    });

    if (pendingCount > 50) {
      alerts.push({
        type: 'pending_assessments',
        severity: 'medium',
        count: pendingCount,
        message: `${pendingCount} assessments pending review`,
        data: { pendingCount }
      });
    }

    // System issues
    const systemIssues = [];

    // Check for very old pending assessments
    const oldPending = await StudentAssessment.countDocuments({
      status: AssessmentStatus.SUBMITTED,
      created_at: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    if (oldPending > 0) {
      systemIssues.push({
        type: 'old_pending_assessments',
        severity: 'high',
        count: oldPending,
        message: `${oldPending} assessments pending for over 7 days`
      });
    }

    res.status(200).json({
      alerts,
      systemIssues,
      totalAlerts: alerts.length + systemIssues.length
    });
  } catch (error) {
    console.error('getSystemAlerts error:', error);
    res.status(500).json({ message: 'Error fetching system alerts' });
  }
};
