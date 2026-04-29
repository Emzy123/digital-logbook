"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssessmentStatus = exports.getStudentVisits = exports.logSupervisorVisit = exports.reviewWeeklySummary = exports.getStudentWeeklySummaries = exports.submitAssessment = exports.reviewLog = exports.getStudentLogs = exports.getAssignedStudents = void 0;
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const LogEntry_1 = require("../models/LogEntry");
const Assessment_1 = require("../models/Assessment");
const Notification_1 = require("../models/Notification");
const StudentProfile_1 = require("../models/StudentProfile");
const notifyStudent = async (studentProfileId, type, title, message) => {
    const profile = await StudentProfile_1.StudentProfile.findById(studentProfileId);
    if (profile && profile.user_id) {
        await Notification_1.Notification.create({
            user_id: profile.user_id,
            type,
            title,
            message,
            metadata: { studentProfileId }
        });
    }
};
const getAssignedStudents = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ],
            is_active: true
        }).populate({
            path: 'student_id',
            populate: [
                { path: 'user_id', select: 'first_name last_name email avatar_url' },
                { path: 'establishment_id', select: 'name city state' }
            ]
        });
        res.status(200).json(assignments);
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving students' });
    }
};
exports.getAssignedStudents = getAssignedStudents;
const getStudentLogs = async (req, res) => {
    try {
        const { studentId } = req.params;
        const logs = await LogEntry_1.LogEntry.find({ student_id: studentId, status: { $ne: LogEntry_1.LogStatus.DRAFT } })
            .sort({ entry_date: -1 });
        res.status(200).json(logs);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
};
exports.getStudentLogs = getStudentLogs;
const reviewLog = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        const { status, supervisor_comment } = req.body;
        if (![LogEntry_1.LogStatus.APPROVED, LogEntry_1.LogStatus.REJECTED, LogEntry_1.LogStatus.NEEDS_REVISION].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const log = await LogEntry_1.LogEntry.findById(id);
        if (!log)
            return res.status(404).json({ message: 'Log not found' });
        log.status = status;
        log.supervisor_comment = supervisor_comment;
        if (status === LogEntry_1.LogStatus.APPROVED) {
            log.approved_at = new Date();
            log.approved_by = supervisorId;
        }
        await log.save();
        let notifType = Notification_1.NotificationType.LOG_APPROVED;
        let title = 'Log Entry Approved';
        if (status === LogEntry_1.LogStatus.REJECTED) {
            notifType = Notification_1.NotificationType.LOG_REJECTED;
            title = 'Log Entry Rejected';
        }
        if (status === LogEntry_1.LogStatus.NEEDS_REVISION) {
            notifType = Notification_1.NotificationType.FEEDBACK;
            title = 'Log Requires Revision';
        }
        await notifyStudent(log.student_id, notifType, title, `Your log "${log.task_title}" has been reviewed. Comment: ${supervisor_comment || 'None'}`);
        res.status(200).json(log);
    }
    catch (err) {
        res.status(500).json({ message: 'Error reviewing log' });
    }
};
exports.reviewLog = reviewLog;
const submitAssessment = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;
        const assessmentData = req.body; // rubric_scores, comments, etc
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });
        if (!assignment)
            return res.status(403).json({ message: 'Not authorized to assess this student' });
        let assessorType = assignment.industry_supervisor_id?.toString() === supervisorId ? 'industry' : 'school';
        let itf_form_type = assessorType === 'industry' ? 'ITF_8C' : 'ITF_8B';
        let total_score = 0;
        let max_possible = 0;
        if (itf_form_type === 'ITF_8C' && assessmentData.itf_8c_scores) {
            max_possible = 50; // standard ITF 8C max weight
            const scores = assessmentData.itf_8c_scores;
            total_score = (scores.attendance || 0) + (scores.punctuality || 0) + (scores.initiative || 0) +
                (scores.relationship_with_staff || 0) + (scores.practical_skills || 0) + (scores.general_conduct || 0);
        }
        else if (itf_form_type === 'ITF_8B' && assessmentData.itf_8b_scores) {
            max_possible = 50; // standard ITF 8B max weight
            const scores = assessmentData.itf_8b_scores;
            total_score = (scores.logbook_maintenance || 0) + (scores.knowledge_of_reports || 0) +
                (scores.student_participation || 0) + (scores.technical_skills_gained || 0);
        }
        const percentage = max_possible > 0 ? Math.round((total_score / max_possible) * 100) : 0;
        let grade = 'F';
        if (percentage >= 70)
            grade = 'A';
        else if (percentage >= 60)
            grade = 'B';
        else if (percentage >= 50)
            grade = 'C';
        else if (percentage >= 45)
            grade = 'D';
        const assessment = new Assessment_1.Assessment({
            student_id: studentId,
            assessor_id: supervisorId,
            assessor_type: assessorType,
            itf_form_type,
            itf_8c_scores: assessmentData.itf_8c_scores,
            itf_8b_scores: assessmentData.itf_8b_scores,
            comments: assessmentData.comments,
            total_score,
            percentage,
            grade
        });
        await assessment.save();
        res.status(201).json(assessment);
    }
    catch (err) {
        console.error(err);
        if (err.code === 11000)
            return res.status(400).json({ message: 'Assessment already exists for this student by this supervisor' });
        res.status(500).json({ message: 'Error submitting assessment' });
    }
};
exports.submitAssessment = submitAssessment;
const WeeklySummary_1 = require("../models/WeeklySummary");
const getStudentWeeklySummaries = async (req, res) => {
    try {
        const { studentId } = req.params;
        const summaries = await WeeklySummary_1.WeeklySummary.find({ student_id: studentId, status: { $ne: 'draft' } }).sort({ week_number: 1 });
        res.status(200).json(summaries);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching weekly summaries' });
    }
};
exports.getStudentWeeklySummaries = getStudentWeeklySummaries;
const reviewWeeklySummary = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        const { status, supervisor_comment } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const summary = await WeeklySummary_1.WeeklySummary.findById(id);
        if (!summary)
            return res.status(404).json({ message: 'Weekly summary not found' });
        summary.status = status;
        summary.supervisor_comment = supervisor_comment;
        if (status === 'approved') {
            summary.approved_at = new Date();
            summary.approved_by = supervisorId;
        }
        await summary.save();
        let notifType = status === 'approved' ? Notification_1.NotificationType.LOG_APPROVED : Notification_1.NotificationType.LOG_REJECTED;
        let title = status === 'approved' ? 'Weekly Summary Approved' : 'Weekly Summary Rejected';
        await notifyStudent(summary.student_id, notifType, title, `Your summary for Week ${summary.week_number} has been reviewed. Comment: ${supervisor_comment || 'None'}`);
        res.status(200).json(summary);
    }
    catch (err) {
        res.status(500).json({ message: 'Error reviewing weekly summary' });
    }
};
exports.reviewWeeklySummary = reviewWeeklySummary;
const SupervisorVisit_1 = require("../models/SupervisorVisit");
const logSupervisorVisit = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;
        const { visit_date, duration_hours, student_present, logbook_inspected, remarks, issues_identified, recommendations, next_visit_date } = req.body;
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });
        if (!assignment)
            return res.status(403).json({ message: 'Not authorized for this student' });
        const visit = await SupervisorVisit_1.SupervisorVisit.create({
            student_id: studentId,
            supervisor_id: supervisorId,
            visit_date, duration_hours, student_present, logbook_inspected,
            remarks, issues_identified, recommendations, next_visit_date
        });
        res.status(201).json(visit);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging visit' });
    }
};
exports.logSupervisorVisit = logSupervisorVisit;
const getStudentVisits = async (req, res) => {
    try {
        const { studentId } = req.params;
        const visits = await SupervisorVisit_1.SupervisorVisit.find({ student_id: studentId })
            .populate('supervisor_id', 'first_name last_name email role')
            .sort({ visit_date: -1 });
        res.status(200).json(visits);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching visits' });
    }
};
exports.getStudentVisits = getStudentVisits;
const getAssessmentStatus = async (req, res) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });
        if (!assignment)
            return res.status(403).json({ message: 'Not authorized' });
        let assessorType = assignment.industry_supervisor_id?.toString() === supervisorId ? 'industry' : 'school';
        const assessment = await Assessment_1.Assessment.findOne({
            student_id: studentId,
            assessor_id: supervisorId
        });
        res.status(200).json({
            assessorType,
            assessment
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching assessment status' });
    }
};
exports.getAssessmentStatus = getAssessmentStatus;
