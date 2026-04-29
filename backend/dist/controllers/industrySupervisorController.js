"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupervisorAnalytics = exports.compareStudentEntries = exports.getStudentLogHistory = exports.getAssignedStudents = exports.getSupervisorDashboard = void 0;
const LogEntry_1 = require("../models/LogEntry");
const StudentProfile_1 = require("../models/StudentProfile");
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const SupervisorComment_1 = require("../models/SupervisorComment");
const FraudDetection_1 = require("../models/FraudDetection");
const mongoose_1 = require("mongoose");
const getSupervisorDashboard = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const supervisorId = req.user.userId;
        // Get assigned students
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({
            industry_supervisor_id: new mongoose_1.Types.ObjectId(supervisorId),
            is_active: true
        }).populate('student_id');
        // Get dashboard metrics
        const studentIds = assignments.map(a => a.student_id._id);
        // Count pending logs
        const pendingCount = await LogEntry_1.LogEntry.countDocuments({
            student_id: { $in: studentIds },
            status: LogEntry_1.LogStatus.SUBMITTED
        });
        // Count total students
        const totalStudents = assignments.length;
        // Count students with recent activity
        const recentActivity = await LogEntry_1.LogEntry.countDocuments({
            student_id: { $in: studentIds },
            submitted_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        // Get high-risk alerts
        const highRiskAlerts = await FraudDetection_1.FraudDetection.countDocuments({
            student_id: { $in: studentIds },
            severity: { $in: ['high', 'critical'] },
            resolved: false
        });
        // Get recent submissions
        const recentSubmissions = await LogEntry_1.LogEntry.find({
            student_id: { $in: studentIds },
            status: LogEntry_1.LogStatus.SUBMITTED
        })
            .populate('student_id', 'matriculation_number')
            .populate({
            path: 'student_id',
            populate: { path: 'user_id', select: 'first_name last_name email' }
        })
            .sort({ submitted_at: -1 })
            .limit(10);
        // Get student progress summary
        const studentProgress = await Promise.all(assignments.map(async (assignment) => {
            const studentId = assignment.student_id._id;
            const totalEntries = await LogEntry_1.LogEntry.countDocuments({
                student_id: studentId,
                status: { $in: [LogEntry_1.LogStatus.APPROVED, LogEntry_1.LogStatus.SUBMITTED] }
            });
            const approvedEntries = await LogEntry_1.LogEntry.countDocuments({
                student_id: studentId,
                status: LogEntry_1.LogStatus.APPROVED
            });
            const totalHours = await LogEntry_1.LogEntry.aggregate([
                { $match: { student_id: studentId, status: LogEntry_1.LogStatus.APPROVED } },
                { $group: { _id: null, totalHours: { $sum: '$total_hours' } } }
            ]);
            const lastSubmission = await LogEntry_1.LogEntry.findOne({
                student_id: studentId,
                status: { $in: [LogEntry_1.LogStatus.SUBMITTED, LogEntry_1.LogStatus.APPROVED] }
            }).sort({ submitted_at: -1 });
            return {
                student: assignment.student_id,
                totalEntries,
                approvedEntries,
                totalHours: totalHours[0]?.totalHours || 0,
                lastSubmissionDate: lastSubmission?.submitted_at,
                approvalRate: totalEntries > 0 ? (approvedEntries / totalEntries) * 100 : 0
            };
        }));
        res.status(200).json({
            metrics: {
                totalStudents,
                pendingReviews: pendingCount,
                recentActivity,
                highRiskAlerts
            },
            recentSubmissions,
            studentProgress
        });
    }
    catch (error) {
        console.error('getSupervisorDashboard error:', error);
        res.status(500).json({ message: 'Error fetching supervisor dashboard' });
    }
};
exports.getSupervisorDashboard = getSupervisorDashboard;
const getAssignedStudents = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const supervisorId = req.user.userId;
        const { page = 1, limit = 20, status } = req.query;
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({
            industry_supervisor_id: new mongoose_1.Types.ObjectId(supervisorId),
            is_active: true
        })
            .populate({
            path: 'student_id',
            populate: [
                { path: 'user_id', select: 'first_name last_name email' },
                { path: 'establishment_id', select: 'name city state' }
            ]
        })
            .sort({ assignment_date: -1 });
        const studentIds = assignments.map(a => a.student_id._id);
        // Build status filter for logs
        let logFilter = { student_id: { $in: studentIds } };
        if (status && status !== 'all') {
            logFilter.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const logs = await LogEntry_1.LogEntry.find(logFilter)
            .populate('student_id', 'matriculation_number')
            .populate({
            path: 'student_id',
            populate: { path: 'user_id', select: 'first_name last_name' }
        })
            .sort({ submitted_at: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await LogEntry_1.LogEntry.countDocuments(logFilter);
        // Enrich logs with student details
        const enrichedLogs = logs.map(log => {
            const assignment = assignments.find(a => a.student_id._id.toString() === log.student_id._id.toString());
            return {
                ...log.toObject(),
                student_details: assignment?.student_id
            };
        });
        res.status(200).json({
            logs: enrichedLogs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('getAssignedStudents error:', error);
        res.status(500).json({ message: 'Error fetching assigned students' });
    }
};
exports.getAssignedStudents = getAssignedStudents;
const getStudentLogHistory = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { studentId } = req.params;
        const { page = 1, limit = 20, status, dateRange } = req.query;
        // Verify supervisor is assigned to this student
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            industry_supervisor_id: new mongoose_1.Types.ObjectId(req.user.userId),
            is_active: true
        });
        if (!assignment) {
            return res.status(403).json({ message: 'Not assigned to supervise this student' });
        }
        // Build query
        let query = { student_id: new mongoose_1.Types.ObjectId(studentId) };
        if (status && status !== 'all') {
            query.status = status;
        }
        if (dateRange) {
            const { start, end } = JSON.parse(dateRange);
            query.entry_date = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
        }
        const skip = (Number(page) - 1) * Number(limit);
        const logs = await LogEntry_1.LogEntry.find(query)
            .sort({ entry_date: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await LogEntry_1.LogEntry.countDocuments(query);
        // Get comments for each log
        const logsWithComments = await Promise.all(logs.map(async (log) => {
            const comments = await SupervisorComment_1.SupervisorComment.find({
                log_entry_id: log._id,
                is_internal: { $ne: true }
            })
                .populate('author_id', 'first_name last_name email')
                .sort({ created_at: 1 });
            return {
                ...log.toObject(),
                comments
            };
        }));
        // Get student progress metrics
        const totalEntries = await LogEntry_1.LogEntry.countDocuments({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            status: { $in: [LogEntry_1.LogStatus.APPROVED, LogEntry_1.LogStatus.SUBMITTED] }
        });
        const approvedEntries = await LogEntry_1.LogEntry.countDocuments({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            status: LogEntry_1.LogStatus.APPROVED
        });
        const totalHours = await LogEntry_1.LogEntry.aggregate([
            { $match: { student_id: new mongoose_1.Types.ObjectId(studentId), status: LogEntry_1.LogStatus.APPROVED } },
            { $group: { _id: null, totalHours: { $sum: '$total_hours' } } }
        ]);
        const studentProfile = await StudentProfile_1.StudentProfile.findById(studentId)
            .populate('user_id', 'first_name last_name email')
            .populate('establishment_id', 'name address city state');
        res.status(200).json({
            logs: logsWithComments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            },
            metrics: {
                totalEntries,
                approvedEntries,
                totalHours: totalHours[0]?.totalHours || 0,
                approvalRate: totalEntries > 0 ? (approvedEntries / totalEntries) * 100 : 0
            },
            studentProfile
        });
    }
    catch (error) {
        console.error('getStudentLogHistory error:', error);
        res.status(500).json({ message: 'Error fetching student log history' });
    }
};
exports.getStudentLogHistory = getStudentLogHistory;
const compareStudentEntries = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;
        // Verify supervisor is assigned to this student
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            industry_supervisor_id: new mongoose_1.Types.ObjectId(req.user.userId),
            is_active: true
        });
        if (!assignment) {
            return res.status(403).json({ message: 'Not assigned to supervise this student' });
        }
        const logs = await LogEntry_1.LogEntry.find({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            entry_date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: { $in: [LogEntry_1.LogStatus.APPROVED, LogEntry_1.LogStatus.SUBMITTED] }
        })
            .sort({ entry_date: 1 });
        // Analyze patterns
        const patterns = {
            consistentHours: true,
            variedTasks: true,
            regularSubmissions: true,
            suspiciousPatterns: []
        };
        const hourlyData = logs.map(log => ({
            date: log.entry_date,
            hours: log.total_hours || 0,
            taskTitle: log.task_title,
            description: log.task_description
        }));
        // Check for consistent hours (should vary)
        const hours = hourlyData.map(d => d.hours).filter(h => h > 0);
        if (hours.length > 1) {
            const avgHours = hours.reduce((a, b) => a + b, 0) / hours.length;
            const variance = hours.reduce((sum, hour) => sum + Math.pow(hour - avgHours, 2), 0) / hours.length;
            patterns.consistentHours = variance > 0.5; // Some variance is good
        }
        // Check for varied tasks
        const taskTitles = logs.map(log => log.task_title.toLowerCase());
        const uniqueTasks = new Set(taskTitles);
        patterns.variedTasks = uniqueTasks.size > taskTitles.length * 0.7; // At least 70% variety
        // Check submission regularity
        const submissionDates = logs.map(log => new Date(log.submitted_at || log.createdAt).toDateString());
        const uniqueDates = new Set(submissionDates);
        patterns.regularSubmissions = uniqueDates.size === submissionDates.length;
        // Check for suspicious patterns
        const descriptions = logs.map(log => log.task_description.toLowerCase());
        const suspiciousPatterns = [];
        for (let i = 0; i < descriptions.length - 1; i++) {
            for (let j = i + 1; j < descriptions.length; j++) {
                const similarity = calculateSimilarity(descriptions[i], descriptions[j]);
                if (similarity > 0.8) {
                    suspiciousPatterns.push({
                        type: 'identical_descriptions',
                        dates: [logs[i].entry_date, logs[j].entry_date],
                        similarity
                    });
                }
            }
        }
        patterns.suspiciousPatterns = suspiciousPatterns;
        res.status(200).json({
            logs: hourlyData,
            patterns,
            analysis: {
                totalEntries: logs.length,
                averageHours: hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
                taskVariety: uniqueTasks.size,
                submissionRegularity: patterns.regularSubmissions
            }
        });
    }
    catch (error) {
        console.error('compareStudentEntries error:', error);
        res.status(500).json({ message: 'Error comparing student entries' });
    }
};
exports.compareStudentEntries = compareStudentEntries;
// Helper function to calculate text similarity
function calculateSimilarity(text1, text2) {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    if (longer.length === 0)
        return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[str2.length][str1.length];
}
const getSupervisorAnalytics = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const supervisorId = req.user.userId;
        const { period = '30' } = req.query; // days
        const daysAgo = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
        // Get assigned students
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({
            industry_supervisor_id: new mongoose_1.Types.ObjectId(supervisorId),
            is_active: true
        });
        const studentIds = assignments.map(a => a.student_id);
        // Response time analytics
        const responseTimes = await LogEntry_1.LogEntry.aggregate([
            {
                $match: {
                    student_id: { $in: studentIds },
                    approved_at: { $gte: daysAgo },
                    submitted_at: { $gte: daysAgo }
                }
            },
            {
                $project: {
                    responseTime: {
                        $subtract: ['$approved_at', '$submitted_at']
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgResponseTime: { $avg: '$responseTime' },
                    minResponseTime: { $min: '$responseTime' },
                    maxResponseTime: { $max: '$responseTime' }
                }
            }
        ]);
        // Submission trends
        const submissionTrends = await LogEntry_1.LogEntry.aggregate([
            {
                $match: {
                    student_id: { $in: studentIds },
                    submitted_at: { $gte: daysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$submitted_at'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Approval rates
        const approvalStats = await LogEntry_1.LogEntry.aggregate([
            {
                $match: {
                    student_id: { $in: studentIds },
                    submitted_at: { $gte: daysAgo }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Student activity levels
        const studentActivity = await Promise.all(studentIds.map(async (studentId) => {
            const activity = await LogEntry_1.LogEntry.aggregate([
                {
                    $match: {
                        student_id: studentId,
                        submitted_at: { $gte: daysAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        submissions: { $sum: 1 },
                        approvals: {
                            $sum: {
                                $cond: [{ $eq: ['$status', LogEntry_1.LogStatus.APPROVED] }, 1, 0]
                            }
                        }
                    }
                }
            ]);
            return {
                studentId,
                activity: activity[0] || { submissions: 0, approvals: 0 }
            };
        }));
        res.status(200).json({
            responseTime: responseTimes[0] || { avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 },
            submissionTrends,
            approvalStats,
            studentActivity,
            period: Number(period)
        });
    }
    catch (error) {
        console.error('getSupervisorAnalytics error:', error);
        res.status(500).json({ message: 'Error fetching supervisor analytics' });
    }
};
exports.getSupervisorAnalytics = getSupervisorAnalytics;
