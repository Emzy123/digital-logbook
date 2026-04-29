"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const LogEntry_1 = require("../models/LogEntry");
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const StudentProfile_1 = require("../models/StudentProfile");
const mongoose_1 = require("mongoose");
class ReminderService {
    /**
     * Send reminders to supervisors for pending log reviews
     */
    static async sendPendingReviewReminders() {
        try {
            // Get all supervisors with pending reviews
            const supervisorsWithPending = await LogEntry_1.LogEntry.aggregate([
                {
                    $match: {
                        status: LogEntry_1.LogStatus.SUBMITTED,
                        submitted_at: {
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                        }
                    }
                },
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
                        'assignment.0': { $exists: true },
                        'assignment.0.industry_supervisor_id': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$assignment.0.industry_supervisor_id',
                        pendingCount: { $sum: 1 },
                        oldestPending: { $min: '$submitted_at' },
                        students: {
                            $push: {
                                student_id: '$student_id',
                                log_id: '$_id',
                                task_title: '$task_title',
                                submitted_at: '$submitted_at'
                            }
                        }
                    }
                }
            ]);
            for (const supervisor of supervisorsWithPending) {
                const supervisorId = supervisor._id;
                const pendingCount = supervisor.pendingCount;
                const oldestPending = supervisor.oldestPending;
                // Check if supervisor should receive reminder
                const hoursSinceOldest = (Date.now() - oldestPending.getTime()) / (1000 * 60 * 60);
                let reminderType = '';
                let urgency = 'low';
                if (hoursSinceOldest > 72) { // More than 3 days
                    reminderType = 'urgent';
                    urgency = 'high';
                }
                else if (hoursSinceOldest > 48) { // More than 2 days
                    reminderType = 'follow_up';
                    urgency = 'medium';
                }
                else if (hoursSinceOldest > 24) { // More than 1 day
                    reminderType = 'reminder';
                    urgency = 'low';
                }
                if (reminderType) {
                    await this.createReminderNotification(supervisorId.toString(), pendingCount, reminderType, urgency);
                }
            }
            console.log(`Processed ${supervisorsWithPending.length} supervisors for pending review reminders`);
        }
        catch (error) {
            console.error('Error sending pending review reminders:', error);
        }
    }
    /**
     * Send email digest to inactive supervisors
     */
    static async sendInactiveSupervisorDigests() {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            // Get supervisors who haven't logged in or reviewed in 7 days
            const inactiveSupervisors = await User_1.User.aggregate([
                {
                    $match: {
                        role: { $in: [User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR] },
                        last_login: { $lt: sevenDaysAgo }
                    }
                },
                {
                    $lookup: {
                        from: 'supervisorassignments',
                        localField: '_id',
                        foreignField: 'industry_supervisor_id',
                        as: 'industryAssignments'
                    }
                },
                {
                    $lookup: {
                        from: 'supervisorassignments',
                        localField: '_id',
                        foreignField: 'school_supervisor_id',
                        as: 'schoolAssignments'
                    }
                },
                {
                    $lookup: {
                        from: 'logentries',
                        let: {
                            supervisorId: '$_id',
                            industryIds: '$industryAssignments.student_id',
                            schoolIds: '$schoolAssignments.student_id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $gte: ['$submitted_at', sevenDaysAgo] },
                                            {
                                                $or: [
                                                    { $in: ['$student_id', '$$industryIds'] },
                                                    { $in: ['$student_id', '$$schoolIds'] }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'recentLogs'
                    }
                },
                {
                    $project: {
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        role: 1,
                        last_login: 1,
                        totalStudents: {
                            $add: [{ $size: '$industryAssignments' }, { $size: '$schoolAssignments' }]
                        },
                        recentSubmissions: { $size: '$recentLogs' },
                        pendingReviews: {
                            $size: {
                                $filter: {
                                    input: '$recentLogs',
                                    cond: { $eq: ['$$this.status', LogEntry_1.LogStatus.SUBMITTED] }
                                }
                            }
                        }
                    }
                }
            ]);
            for (const supervisor of inactiveSupervisors) {
                if (supervisor.totalStudents > 0 && (supervisor.recentSubmissions > 0 || supervisor.pendingReviews > 0)) {
                    await this.createDigestNotification(supervisor);
                }
            }
            console.log(`Sent digests to ${inactiveSupervisors.length} inactive supervisors`);
        }
        catch (error) {
            console.error('Error sending inactive supervisor digests:', error);
        }
    }
    /**
     * Send alerts to coordinators about students with no activity
     */
    static async sendStudentInactivityAlerts() {
        try {
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            // Get students with no submissions in 14 days
            const inactiveStudents = await StudentProfile_1.StudentProfile.aggregate([
                {
                    $lookup: {
                        from: 'logentries',
                        localField: '_id',
                        foreignField: 'student_id',
                        as: 'logs'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $lookup: {
                        from: 'establishments',
                        localField: 'establishment_id',
                        foreignField: '_id',
                        as: 'establishment'
                    }
                },
                {
                    $match: {
                        $or: [
                            { logs: { $size: 0 } }, // No submissions ever
                            {
                                $and: [
                                    { logs: { $gt: [] } },
                                    { 'logs.submitted_at': { $lt: fourteenDaysAgo } }
                                ]
                            }
                        ]
                    }
                },
                {
                    $project: {
                        student: { $arrayElemAt: ['$user', 0] },
                        establishment: { $arrayElemAt: ['$establishment', 0] },
                        matriculation_number: 1,
                        lastSubmission: { $max: '$logs.submitted_at' },
                        totalSubmissions: { $size: '$logs' },
                        daysInactive: {
                            $divide: [
                                { $subtract: [new Date(), { $max: ['$logs.submitted_at', fourteenDaysAgo] }] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            ]);
            if (inactiveStudents.length > 0) {
                // Notify all coordinators
                const coordinators = await User_1.User.find({ role: User_1.UserRole.COORDINATOR });
                for (const coordinator of coordinators) {
                    await Notification_1.Notification.create({
                        user_id: coordinator._id,
                        type: Notification_1.NotificationType.DEADLINE,
                        title: 'Student Inactivity Alert',
                        message: `${inactiveStudents.length} students have been inactive for 14+ days`,
                        metadata: {
                            inactive_students: inactiveStudents,
                            alert_type: 'student_inactivity',
                            total_inactive: inactiveStudents.length
                        }
                    });
                }
            }
            console.log(`Processed ${inactiveStudents.length} inactive students for alerts`);
        }
        catch (error) {
            console.error('Error sending student inactivity alerts:', error);
        }
    }
    /**
     * Send weekly progress summaries to school supervisors
     */
    static async sendWeeklyProgressSummaries() {
        try {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7); // End of current week
            // Get all school supervisors
            const schoolSupervisors = await User_1.User.find({ role: User_1.UserRole.SCHOOL_SUPERVISOR });
            for (const supervisor of schoolSupervisors) {
                const weeklyData = await this.getSupervisorWeeklyData(supervisor._id, weekStart, weekEnd);
                if (weeklyData.totalStudents > 0) {
                    await this.createWeeklySummaryNotification(supervisor, weeklyData, weekStart, weekEnd);
                }
            }
            console.log(`Sent weekly summaries to ${schoolSupervisors.length} school supervisors`);
        }
        catch (error) {
            console.error('Error sending weekly progress summaries:', error);
        }
    }
    /**
     * Create reminder notification for supervisor
     */
    static async createReminderNotification(supervisorId, pendingCount, reminderType, urgency) {
        const messages = {
            reminder: `You have ${pendingCount} pending log review${pendingCount > 1 ? 's' : ''} awaiting your attention.`,
            follow_up: `Follow-up: ${pendingCount} log review${pendingCount > 1 ? 's' : ''} have been pending for over 48 hours.`,
            urgent: `URGENT: ${pendingCount} log review${pendingCount > 1 ? 's' : ''} have been pending for over 72 hours. Please review immediately.`
        };
        await Notification_1.Notification.create({
            user_id: new mongoose_1.Types.ObjectId(supervisorId),
            type: Notification_1.NotificationType.DEADLINE,
            title: `Pending Review ${reminderType === 'urgent' ? 'URGENT' : reminderType === 'follow_up' ? 'Follow-up' : 'Reminder'}`,
            message: messages[reminderType],
            metadata: {
                pending_count: pendingCount,
                reminder_type: reminderType,
                urgency
            }
        });
    }
    /**
     * Create digest notification for inactive supervisor
     */
    static async createDigestNotification(supervisor) {
        const message = `Weekly Digest: You have ${supervisor.pendingReviews} pending review${supervisor.pendingReviews > 1 ? 's' : ''} and ${supervisor.recentSubmissions} recent submission${supervisor.recentSubmissions > 1 ? 's' : ''} from your ${supervisor.totalStudents} assigned student${supervisor.totalStudents > 1 ? 's' : ''}.`;
        await Notification_1.Notification.create({
            user_id: supervisor._id,
            type: Notification_1.NotificationType.SYSTEM,
            title: 'Weekly Activity Digest',
            message,
            metadata: {
                digest_type: 'weekly',
                pending_reviews: supervisor.pendingReviews,
                recent_submissions: supervisor.recentSubmissions,
                total_students: supervisor.totalStudents,
                last_login: supervisor.last_login
            }
        });
    }
    /**
     * Create weekly summary notification
     */
    static async createWeeklySummaryNotification(supervisor, weeklyData, weekStart, weekEnd) {
        const message = `Weekly Summary: ${weeklyData.activeStudents} of ${weeklyData.totalStudents} students submitted entries this week. Total: ${weeklyData.totalSubmissions} submissions, ${weeklyData.approvedSubmissions} approved.`;
        await Notification_1.Notification.create({
            user_id: supervisor._id,
            type: Notification_1.NotificationType.SYSTEM,
            title: 'Weekly Progress Summary',
            message,
            metadata: {
                summary_type: 'weekly_progress',
                week_start: weekStart,
                week_end: weekEnd,
                ...weeklyData
            }
        });
    }
    /**
     * Get weekly data for a supervisor
     */
    static async getSupervisorWeeklyData(supervisorId, weekStart, weekEnd) {
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({
            school_supervisor_id: supervisorId,
            is_active: true
        });
        const studentIds = assignments.map(a => a.student_id);
        const weeklyStats = await LogEntry_1.LogEntry.aggregate([
            {
                $match: {
                    student_id: { $in: studentIds },
                    submitted_at: { $gte: weekStart, $lt: weekEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    approvedSubmissions: {
                        $sum: {
                            $cond: [{ $eq: ['$status', LogEntry_1.LogStatus.APPROVED] }, 1, 0]
                        }
                    },
                    activeStudents: { $addToSet: '$student_id' }
                }
            }
        ]);
        return {
            totalStudents: studentIds.length,
            activeStudents: weeklyStats[0]?.activeStudents?.length || 0,
            totalSubmissions: weeklyStats[0]?.totalSubmissions || 0,
            approvedSubmissions: weeklyStats[0]?.approvedSubmissions || 0
        };
    }
    /**
     * Run all reminder services (called by scheduler)
     */
    static async runAllReminderServices() {
        console.log('Running reminder services...');
        await Promise.all([
            this.sendPendingReviewReminders(),
            this.sendStudentInactivityAlerts(),
            this.sendWeeklyProgressSummaries(),
            this.sendInactiveSupervisorDigests()
        ]);
        console.log('Reminder services completed');
    }
}
exports.ReminderService = ReminderService;
