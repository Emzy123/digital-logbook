import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { Assessment } from '../models/Assessment';
import { Notification, NotificationType } from '../models/Notification';
import { StudentProfile } from '../models/StudentProfile';

const notifyStudent = async (studentProfileId: any, type: NotificationType, title: string, message: string) => {
    const profile = await StudentProfile.findById(studentProfileId);
    if (profile && profile.user_id) {
        await Notification.create({
            user_id: profile.user_id,
            type,
            title,
            message,
            metadata: { studentProfileId }
        });
    }
};

export const getAssignedStudents = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.user?.userId;
    const assignments = await SupervisorAssignment.find({
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
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving students' });
  }
};

export const getStudentLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const logs = await LogEntry.find({ student_id: studentId, status: { $ne: LogStatus.DRAFT } })
            .sort({ entry_date: -1 });
        res.status(200).json(logs);
    } catch(err) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
};

export const reviewLog = async (req: AuthRequest, res: Response) => {
    try {
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        const { status, supervisor_comment } = req.body;

        if (![LogStatus.APPROVED, LogStatus.REJECTED, LogStatus.NEEDS_REVISION].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const log = await LogEntry.findById(id);
        if (!log) return res.status(404).json({ message: 'Log not found' });

        log.status = status;
        log.supervisor_comment = supervisor_comment;
        
        if (status === LogStatus.APPROVED) {
            log.approved_at = new Date();
            log.approved_by = supervisorId as any;
        }

        await log.save();

        let notifType = NotificationType.LOG_APPROVED;
        let title = 'Log Entry Approved';
        if (status === LogStatus.REJECTED) { notifType = NotificationType.LOG_REJECTED; title = 'Log Entry Rejected'; }
        if (status === LogStatus.NEEDS_REVISION) { notifType = NotificationType.FEEDBACK; title = 'Log Requires Revision'; }

        await notifyStudent(log.student_id, notifType, title, `Your log "${log.task_title}" has been reviewed. Comment: ${supervisor_comment || 'None'}`);

        res.status(200).json(log);
    } catch(err) {
        res.status(500).json({ message: 'Error reviewing log' });
    }
};

export const submitAssessment = async (req: AuthRequest, res: Response) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;
        const assessmentData = req.body; // rubric_scores, comments, etc

        const assignment = await SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized to assess this student' });

        let assessorType = assignment.industry_supervisor_id?.toString() === supervisorId ? 'industry' : 'school';
        let itf_form_type = assessorType === 'industry' ? 'ITF_8C' : 'ITF_8B';

        let total_score = 0;
        let max_possible = 0;

        if (itf_form_type === 'ITF_8C' && assessmentData.itf_8c_scores) {
            max_possible = 50; // standard ITF 8C max weight
            const scores = assessmentData.itf_8c_scores;
            total_score = (scores.attendance || 0) + (scores.punctuality || 0) + (scores.initiative || 0) + 
                          (scores.relationship_with_staff || 0) + (scores.practical_skills || 0) + (scores.general_conduct || 0);
        } else if (itf_form_type === 'ITF_8B' && assessmentData.itf_8b_scores) {
            max_possible = 50; // standard ITF 8B max weight
            const scores = assessmentData.itf_8b_scores;
            total_score = (scores.logbook_maintenance || 0) + (scores.knowledge_of_reports || 0) + 
                          (scores.student_participation || 0) + (scores.technical_skills_gained || 0);
        }
        
        const percentage = max_possible > 0 ? Math.round((total_score / max_possible) * 100) : 0;
        let grade = 'F';
        if (percentage >= 70) grade = 'A';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 45) grade = 'D';

        const assessment = new Assessment({
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
    } catch(err: any) {
        console.error(err);
        if (err.code === 11000) return res.status(400).json({ message: 'Assessment already exists for this student by this supervisor' });
        res.status(500).json({ message: 'Error submitting assessment' });
    }
};

import { WeeklySummary } from '../models/WeeklySummary';

export const getStudentWeeklySummaries = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const summaries = await WeeklySummary.find({ student_id: studentId, status: { $ne: 'draft' } }).sort({ week_number: 1 });
        res.status(200).json(summaries);
    } catch(err) {
        res.status(500).json({ message: 'Error fetching weekly summaries' });
    }
};

export const reviewWeeklySummary = async (req: AuthRequest, res: Response) => {
    try {
        const supervisorId = req.user?.userId;
        const { id } = req.params;
        const { status, supervisor_comment } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const summary = await WeeklySummary.findById(id);
        if (!summary) return res.status(404).json({ message: 'Weekly summary not found' });

        summary.status = status as any;
        summary.supervisor_comment = supervisor_comment;
        
        if (status === 'approved') {
            summary.approved_at = new Date();
            summary.approved_by = supervisorId as any;
        }

        await summary.save();

        let notifType = status === 'approved' ? NotificationType.LOG_APPROVED : NotificationType.LOG_REJECTED;
        let title = status === 'approved' ? 'Weekly Summary Approved' : 'Weekly Summary Rejected';

        await notifyStudent(summary.student_id, notifType, title, `Your summary for Week ${summary.week_number} has been reviewed. Comment: ${supervisor_comment || 'None'}`);

        res.status(200).json(summary);
    } catch(err) {
        res.status(500).json({ message: 'Error reviewing weekly summary' });
    }
};

import { SupervisorVisit } from '../models/SupervisorVisit';

export const logSupervisorVisit = async (req: AuthRequest, res: Response) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;
        const { 
            visit_date, duration_hours, student_present, logbook_inspected,
            remarks, issues_identified, recommendations, next_visit_date 
        } = req.body;

        const assignment = await SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized for this student' });

        const visit = await SupervisorVisit.create({
            student_id: studentId,
            supervisor_id: supervisorId,
            visit_date, duration_hours, student_present, logbook_inspected,
            remarks, issues_identified, recommendations, next_visit_date
        });

        res.status(201).json(visit);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Error logging visit' });
    }
};

export const getStudentVisits = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const visits = await SupervisorVisit.find({ student_id: studentId })
            .populate('supervisor_id', 'first_name last_name email role')
            .sort({ visit_date: -1 });
        res.status(200).json(visits);
    } catch(err) {
        res.status(500).json({ message: 'Error fetching visits' });
    }
};

export const getAssessmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const supervisorId = req.user?.userId;
        const { studentId } = req.params;

        const assignment = await SupervisorAssignment.findOne({
            student_id: studentId,
            $or: [
                { industry_supervisor_id: supervisorId },
                { school_supervisor_id: supervisorId }
            ]
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized' });

        let assessorType = assignment.industry_supervisor_id?.toString() === supervisorId ? 'industry' : 'school';
        
        const assessment = await Assessment.findOne({
            student_id: studentId,
            assessor_id: supervisorId
        });

        res.status(200).json({
            assessorType,
            assessment
        });
    } catch(err) {
        res.status(500).json({ message: 'Error fetching assessment status' });
    }
};
