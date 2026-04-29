"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFinalGrade = exports.getAssessmentById = exports.getAssessments = exports.submitAssessment = exports.createAssessment = exports.getAssessmentRubric = void 0;
const AssessmentRubric_1 = require("../models/AssessmentRubric");
const AssessmentRubric_2 = require("../models/AssessmentRubric");
const StudentProfile_1 = require("../models/StudentProfile");
const LogEntry_1 = require("../models/LogEntry");
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const AuditLog_1 = require("../models/AuditLog");
const cryptographicHash_1 = require("../utils/cryptographicHash");
const mongoose_1 = require("mongoose");
const getAssessmentRubric = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { assessment_type } = req.query;
        let criteria;
        if (assessment_type === AssessmentRubric_1.AssessmentType.INDUSTRY_SUPERVISOR) {
            // Industry supervisor rubric criteria
            criteria = await AssessmentRubric_2.AssessmentCriterion.find({
                category: { $in: ['punctuality', 'professional_conduct', 'technical_skills', 'communication', 'initiative'] },
                is_active: true
            }).sort({ category: 1, code: 1 });
        }
        else if (assessment_type === AssessmentRubric_1.AssessmentType.SCHOOL_SUPERVISOR) {
            // School supervisor rubric criteria
            criteria = await AssessmentRubric_2.AssessmentCriterion.find({
                category: { $in: ['academic_integration', 'learning_outcomes', 'report_quality', 'industry_relevance'] },
                is_active: true
            }).sort({ category: 1, code: 1 });
        }
        else {
            criteria = await AssessmentRubric_2.AssessmentCriterion.find({ is_active: true }).sort({ category: 1, code: 1 });
        }
        res.status(200).json(criteria);
    }
    catch (error) {
        console.error('getAssessmentRubric error:', error);
        res.status(500).json({ message: 'Error fetching assessment rubric' });
    }
};
exports.getAssessmentRubric = getAssessmentRubric;
const createAssessment = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { student_id, assessment_type, academic_year, semester, scores, overall_comments, strengths, areas_for_improvement, recommendations } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        // Validate required fields
        if (!student_id || !assessment_type || !academic_year || !semester || !scores || scores.length === 0) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Verify supervisor is assigned to this student
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            is_active: true
        });
        if (!assignment) {
            return res.status(403).json({ message: 'Not assigned to supervise this student' });
        }
        // Check if supervisor has correct role for assessment type
        const isIndustrySupervisor = assignment.industry_supervisor_id?.toString() === req.user.userId;
        const isSchoolSupervisor = assignment.school_supervisor_id?.toString() === req.user.userId;
        if (assessment_type === AssessmentRubric_1.AssessmentType.INDUSTRY_SUPERVISOR && !isIndustrySupervisor) {
            return res.status(403).json({ message: 'Only industry supervisors can create industry assessments' });
        }
        if (assessment_type === AssessmentRubric_1.AssessmentType.SCHOOL_SUPERVISOR && !isSchoolSupervisor) {
            return res.status(403).json({ message: 'Only school supervisors can create school assessments' });
        }
        // Validate scores against criteria
        const criteriaIds = scores.map((s) => s.criterion_id);
        const criteria = await AssessmentRubric_2.AssessmentCriterion.find({ _id: { $in: criteriaIds } });
        if (criteria.length !== criteriaIds.length) {
            return res.status(400).json({ message: 'Invalid assessment criteria' });
        }
        // Validate score ranges
        for (const score of scores) {
            const criterion = criteria.find(c => c._id.toString() === score.criterion_id);
            if (criterion && (score.score < 0 || score.score > criterion.max_score)) {
                return res.status(400).json({
                    message: `Invalid score for criterion ${criterion.code}. Must be between 0 and ${criterion.max_score}`
                });
            }
        }
        // Check for existing assessment
        const existingAssessment = await AssessmentRubric_1.StudentAssessment.findOne({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            assessment_type,
            academic_year,
            semester,
            status: { $in: [AssessmentRubric_1.AssessmentStatus.SUBMITTED, AssessmentRubric_1.AssessmentStatus.REVIEWED, AssessmentRubric_1.AssessmentStatus.APPROVED] }
        });
        if (existingAssessment) {
            return res.status(400).json({ message: 'Assessment already exists for this student and period' });
        }
        // Calculate late submission deductions
        const studentProfile = await StudentProfile_1.StudentProfile.findById(student_id);
        let lateSubmissionDeductions = { days_late: 0, deduction_percentage: 0, reason: '' };
        if (studentProfile?.end_date) {
            const endDate = new Date(studentProfile.end_date);
            const today = new Date();
            if (today > endDate) {
                const daysLate = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                lateSubmissionDeductions = {
                    days_late: daysLate,
                    deduction_percentage: Math.min(daysLate * 2, 20), // 2% per day, max 20%
                    reason: `Late submission: ${daysLate} days after SIWES end date`
                };
            }
        }
        // Create assessment
        const assessment = new AssessmentRubric_1.StudentAssessment({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            assessment_type,
            assessor_id: new mongoose_1.Types.ObjectId(req.user.userId),
            assessor_role: req.user.role,
            academic_year,
            semester,
            status: AssessmentRubric_1.AssessmentStatus.DRAFT,
            scores: scores.map((s) => ({
                criterion_id: new mongoose_1.Types.ObjectId(s.criterion_id),
                score: s.score,
                max_score: s.max_score,
                weight: s.weight,
                comments: s.comments,
                evidence_references: s.evidence_references || []
            })),
            overall_comments,
            strengths: strengths || [],
            areas_for_improvement: areas_for_improvement || [],
            recommendations,
            digital_signature: {
                signature_data: 'draft', // Will be updated on submission
                signed_at: new Date(),
                ip_address: ipAddress,
                device_info: req.get('User-Agent') || 'unknown'
            },
            lateSubmissionDeductions
        });
        await assessment.save();
        // Create audit log
        await AuditLog_1.AuditLog.create({
            user_id: new mongoose_1.Types.ObjectId(req.user.userId),
            action: 'CREATE_ASSESSMENT',
            target_resource: 'StudentAssessment',
            target_id: assessment._id.toString(),
            snapshot: {
                student_id,
                assessment_type,
                academic_year,
                semester,
                scores_count: scores.length
            },
            ip_address: ipAddress
        });
        res.status(201).json(assessment);
    }
    catch (error) {
        console.error('createAssessment error:', error);
        res.status(500).json({ message: 'Error creating assessment' });
    }
};
exports.createAssessment = createAssessment;
const submitAssessment = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const assessment = await AssessmentRubric_1.StudentAssessment.findById(id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        if (assessment.assessor_id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Can only submit your own assessments' });
        }
        if (assessment.status !== AssessmentRubric_1.AssessmentStatus.DRAFT) {
            return res.status(400).json({ message: 'Can only submit draft assessments' });
        }
        // Validate all criteria are scored
        const criteria = await AssessmentRubric_2.AssessmentCriterion.find({ is_active: true });
        const requiredCriteria = criteria.filter(c => assessment.assessment_type === AssessmentRubric_1.AssessmentType.INDUSTRY_SUPERVISOR
            ? ['punctuality', 'professional_conduct', 'technical_skills', 'communication', 'initiative'].includes(c.category)
            : ['academic_integration', 'learning_outcomes', 'report_quality', 'industry_relevance'].includes(c.category));
        const scoredCriteriaIds = assessment.scores.map(s => s.criterion_id.toString());
        const requiredCriteriaIds = requiredCriteria.map(c => c._id.toString());
        const missingCriteria = requiredCriteriaIds.filter(id => !scoredCriteriaIds.includes(id));
        if (missingCriteria.length > 0) {
            return res.status(400).json({
                message: 'Cannot submit assessment. Missing scores for required criteria',
                missing_criteria: missingCriteria
            });
        }
        // Create digital signature
        const signatureData = cryptographicHash_1.CryptographicHash.createSupervisorSignature(req.user.userId, assessment._id.toString(), new Date());
        // Update assessment
        assessment.status = AssessmentRubric_1.AssessmentStatus.SUBMITTED;
        assessment.digital_signature = {
            signature_data: signatureData,
            signed_at: new Date(),
            ip_address: ipAddress,
            device_info: req.get('User-Agent') || 'unknown'
        };
        // Add to submission history
        assessment.submission_history.push({
            action: 'submitted',
            timestamp: new Date(),
            user_id: new mongoose_1.Types.ObjectId(req.user.userId),
            snapshot: assessment.toObject()
        });
        await assessment.save();
        // Create audit log
        await AuditLog_1.AuditLog.create({
            user_id: new mongoose_1.Types.ObjectId(req.user.userId),
            action: 'SUBMIT_ASSESSMENT',
            target_resource: 'StudentAssessment',
            target_id: assessment._id.toString(),
            snapshot: {
                weighted_total: assessment.weighted_total,
                status: AssessmentRubric_1.AssessmentStatus.SUBMITTED
            },
            ip_address: ipAddress
        });
        // Notify relevant parties
        await notifyAssessmentSubmission(assessment);
        res.status(200).json({
            message: 'Assessment submitted successfully',
            assessment
        });
    }
    catch (error) {
        console.error('submitAssessment error:', error);
        res.status(500).json({ message: 'Error submitting assessment' });
    }
};
exports.submitAssessment = submitAssessment;
const getAssessments = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { assessment_type, academic_year, semester, status, page = 1, limit = 20 } = req.query;
        // Build query
        let query = {};
        if (assessment_type)
            query.assessment_type = assessment_type;
        if (academic_year)
            query.academic_year = academic_year;
        if (semester)
            query.semester = semester;
        if (status)
            query.status = status;
        // Filter by user role
        if (req.user.role === User_1.UserRole.INDUSTRY_SUPERVISOR) {
            query.assessor_id = new mongoose_1.Types.ObjectId(req.user.userId);
        }
        else if (req.user.role === User_1.UserRole.SCHOOL_SUPERVISOR) {
            query.assessor_id = new mongoose_1.Types.ObjectId(req.user.userId);
        }
        else if (req.user.role === User_1.UserRole.COORDINATOR || req.user.role === User_1.UserRole.SYSTEM_ADMIN || req.user.role === User_1.UserRole.ITF_ADMIN) {
            // Coordinators can see all assessments
        }
        else {
            // Students can only see their own assessments
            const studentProfile = await StudentProfile_1.StudentProfile.findOne({ user_id: new mongoose_1.Types.ObjectId(req.user.userId) });
            if (studentProfile) {
                query.student_id = studentProfile._id;
            }
            else {
                return res.status(200).json({ assessments: [], pagination: { total: 0, page: 1, pages: 0 } });
            }
        }
        const skip = (Number(page) - 1) * Number(limit);
        const assessments = await AssessmentRubric_1.StudentAssessment.find(query)
            .populate('student_id', 'matriculation_number')
            .populate({
            path: 'student_id',
            populate: [
                { path: 'user_id', select: 'first_name last_name email' },
                { path: 'establishment_id', select: 'name city state' }
            ]
        })
            .populate('assessor_id', 'first_name last_name email')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await AssessmentRubric_1.StudentAssessment.countDocuments(query);
        res.status(200).json({
            assessments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('getAssessments error:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
};
exports.getAssessments = getAssessments;
const getAssessmentById = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const assessment = await AssessmentRubric_1.StudentAssessment.findById(id)
            .populate('student_id', 'matriculation_number')
            .populate({
            path: 'student_id',
            populate: [
                { path: 'user_id', select: 'first_name last_name email' },
                { path: 'establishment_id', select: 'name city state' }
            ]
        })
            .populate('assessor_id', 'first_name last_name email')
            .populate({
            path: 'scores.criterion_id',
            select: 'code title description max_score weight category scoring_guide'
        });
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        // Check access permissions
        if (req.user.role === User_1.UserRole.STUDENT) {
            const studentProfile = await StudentProfile_1.StudentProfile.findOne({ user_id: new mongoose_1.Types.ObjectId(req.user.userId) });
            if (!studentProfile || studentProfile._id.toString() !== assessment.student_id._id.toString()) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        // Get log entries for evidence references
        if (assessment.scores.length > 0) {
            const logEntries = await LogEntry_1.LogEntry.find({
                student_id: assessment.student_id._id,
                status: LogEntry_1.LogStatus.APPROVED
            })
                .sort({ entry_date: -1 })
                .limit(50);
            const logEntryMap = new Map();
            logEntries.forEach(log => {
                logEntryMap.set(log._id.toString(), log);
            });
            // Add log entry details to scores
            assessment.scores.forEach(score => {
                if (score.evidence_references && score.evidence_references.length > 0) {
                    score.evidence_references = score.evidence_references.map(ref => {
                        const logEntry = logEntryMap.get(ref);
                        return logEntry ? {
                            log_id: ref,
                            entry_date: logEntry.entry_date,
                            task_title: logEntry.task_title,
                            task_description: logEntry.task_description
                        } : { log_id: ref, error: 'Log entry not found' };
                    });
                }
            });
        }
        res.status(200).json(assessment);
    }
    catch (error) {
        console.error('getAssessmentById error:', error);
        res.status(500).json({ message: 'Error fetching assessment' });
    }
};
exports.getAssessmentById = getAssessmentById;
const calculateFinalGrade = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { student_id, academic_year, semester } = req.body;
        if (!student_id || !academic_year || !semester) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Get both assessments
        const industryAssessment = await AssessmentRubric_1.StudentAssessment.findOne({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            assessment_type: AssessmentRubric_1.AssessmentType.INDUSTRY_SUPERVISOR,
            academic_year,
            semester,
            status: AssessmentRubric_1.AssessmentStatus.APPROVED
        });
        const schoolAssessment = await AssessmentRubric_1.StudentAssessment.findOne({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            assessment_type: AssessmentRubric_1.AssessmentType.SCHOOL_SUPERVISOR,
            academic_year,
            semester,
            status: AssessmentRubric_1.AssessmentStatus.APPROVED
        });
        if (!industryAssessment || !schoolAssessment) {
            return res.status(400).json({
                message: 'Both industry and school assessments must be approved before calculating final grade'
            });
        }
        // Get logbook completeness score (40%)
        const studentProfile = await StudentProfile_1.StudentProfile.findById(student_id);
        const startDate = studentProfile?.start_date;
        const endDate = studentProfile?.end_date;
        let logbookCompleteness = 0;
        if (startDate && endDate) {
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const approvedLogs = await LogEntry_1.LogEntry.countDocuments({
                student_id: new mongoose_1.Types.ObjectId(student_id),
                status: LogEntry_1.LogStatus.APPROVED
            });
            // Expect at least 3 entries per week
            const expectedEntries = Math.ceil(totalDays / 7) * 3;
            logbookCompleteness = Math.min((approvedLogs / expectedEntries) * 100, 100);
        }
        // Calculate weighted final grade
        const weights = {
            logbook_completeness: 0.40,
            entry_quality: 0.20,
            skills_acquisition: 0.20,
            industry_supervisor: 0.20
        };
        // Extract scores from assessments (normalized to 100)
        const entryQualityScore = schoolAssessment.weighted_total || 0;
        const skillsAcquisitionScore = schoolAssessment.weighted_total || 0;
        const industrySupervisorScore = industryAssessment.weighted_total || 0;
        // Apply late submission deductions
        const totalDeduction = Math.max(industryAssessment.late_submission_deductions.deduction_percentage, schoolAssessment.late_submission_deductions.deduction_percentage);
        const weightedScore = ((logbookCompleteness * weights.logbook_completeness) +
            (entryQualityScore * weights.entry_quality) +
            (skillsAcquisitionScore * weights.skills_acquisition) +
            (industrySupervisorScore * weights.industry_supervisor));
        const finalScore = Math.max(0, weightedScore - totalDeduction);
        // Convert to letter grade and GPA
        const { letter_grade, gpa_points } = convertToLetterGrade(finalScore);
        // Update student assessments with final grade
        await AssessmentRubric_1.StudentAssessment.updateMany({
            student_id: new mongoose_1.Types.ObjectId(student_id),
            academic_year,
            semester
        }, {
            final_grade: {
                letter_grade,
                gpa_points,
                percentage: finalScore,
                calculated_at: new Date(),
                calculated_by: new mongoose_1.Types.ObjectId(req.user.userId)
            }
        });
        // Create audit log
        await AuditLog_1.AuditLog.create({
            user_id: new mongoose_1.Types.ObjectId(req.user.userId),
            action: 'CALCULATE_FINAL_GRADE',
            target_resource: 'StudentAssessment',
            target_id: student_id,
            snapshot: {
                academic_year,
                semester,
                final_score: finalScore,
                letter_grade,
                gpa_points,
                deductions: totalDeduction
            },
            ip_address: req.ip || 'unknown'
        });
        // Notify student
        if (studentProfile) {
            await Notification_1.Notification.create({
                user_id: studentProfile.user_id,
                type: Notification_1.NotificationType.SYSTEM,
                title: 'Final Grade Calculated',
                message: `Your final grade for ${academic_year} ${semester} is ${letter_grade} (${finalScore.toFixed(1)}%)`,
                metadata: {
                    grade: letter_grade,
                    percentage: finalScore,
                    academic_year,
                    semester
                }
            });
        }
        res.status(200).json({
            final_grade: {
                letter_grade,
                gpa_points,
                percentage: finalScore,
                components: {
                    logbook_completeness: logbookCompleteness,
                    entry_quality: entryQualityScore,
                    skills_acquisition: skillsAcquisitionScore,
                    industry_supervisor: industrySupervisorScore
                },
                deductions: totalDeduction,
                weights
            }
        });
    }
    catch (error) {
        console.error('calculateFinalGrade error:', error);
        res.status(500).json({ message: 'Error calculating final grade' });
    }
};
exports.calculateFinalGrade = calculateFinalGrade;
function convertToLetterGrade(percentage) {
    if (percentage >= 70)
        return { letter_grade: 'A', gpa_points: 4.0 };
    if (percentage >= 60)
        return { letter_grade: 'B', gpa_points: 3.0 };
    if (percentage >= 50)
        return { letter_grade: 'C', gpa_points: 2.0 };
    if (percentage >= 45)
        return { letter_grade: 'D', gpa_points: 1.0 };
    return { letter_grade: 'F', gpa_points: 0.0 };
}
async function notifyAssessmentSubmission(assessment) {
    try {
        // Notify coordinator
        const coordinators = await User_1.User.find({ role: User_1.UserRole.COORDINATOR });
        for (const coordinator of coordinators) {
            await Notification_1.Notification.create({
                user_id: coordinator._id,
                type: Notification_1.NotificationType.SYSTEM,
                title: 'Assessment Submitted',
                message: `${assessment.assessor_role} has submitted a ${assessment.assessment_type} assessment`,
                metadata: {
                    assessment_id: assessment._id,
                    student_id: assessment.student_id,
                    assessment_type: assessment.assessment_type
                }
            });
        }
        // Notify other supervisor if applicable
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id: assessment.student_id
        });
        if (assignment) {
            const otherSupervisorId = assessment.assessment_type === AssessmentRubric_1.AssessmentType.INDUSTRY_SUPERVISOR
                ? assignment.school_supervisor_id
                : assignment.industry_supervisor_id;
            if (otherSupervisorId) {
                await Notification_1.Notification.create({
                    user_id: otherSupervisorId,
                    type: Notification_1.NotificationType.SYSTEM,
                    title: 'Assessment Available for Review',
                    message: `A ${assessment.assessment_type} assessment has been submitted for your review`,
                    metadata: {
                        assessment_id: assessment._id,
                        student_id: assessment.student_id
                    }
                });
            }
        }
    }
    catch (error) {
        console.error('Error notifying assessment submission:', error);
    }
}
