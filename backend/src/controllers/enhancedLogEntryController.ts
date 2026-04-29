import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';
import { Notification, NotificationType } from '../models/Notification';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { AuditLog } from '../models/AuditLog';
import { FraudDetection, FraudType, FraudSeverity } from '../models/FraudDetection';
import { FraudDetectionEngine } from '../utils/fraudDetection';
import { CryptographicHash } from '../utils/cryptographicHash';
import { DateValidation } from '../utils/dateValidation';
import { Types } from 'mongoose';

const getStudentId = async (userId: string) => {
  const profile = await StudentProfile.findOne({ user_id: userId });
  return profile ? profile._id : null;
};

const createAuditLog = async (
  userId: string,
  action: string,
  targetResource: string,
  targetId: string,
  snapshot?: any,
  ipAddress?: string
) => {
  try {
    await AuditLog.create({
      user_id: new Types.ObjectId(userId),
      action,
      target_resource: targetResource,
      target_id: targetId,
      snapshot,
      ip_address: ipAddress
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

const notifySupervisorOnSubmit = async (studentId: string, logTitle: string, fraudScore: number) => {
  const assignment = await SupervisorAssignment.findOne({ student_id: studentId, is_active: true });
  if (assignment && assignment.industry_supervisor_id) {
    const message = fraudScore > 50 
      ? `High-risk log entry submitted: "${logTitle}" (Risk Score: ${fraudScore})`
      : `A student has submitted a log entry: "${logTitle}" for your review.`;

    await Notification.create({
      user_id: assignment.industry_supervisor_id,
      type: NotificationType.LOG_SUBMITTED,
      title: fraudScore > 50 ? 'High-Risk Log Entry Submitted' : 'Log Entry Submitted',
      message,
      metadata: { student_id: studentId, risk_score: fraudScore }
    });
  }
};

export const createEnhancedLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const student_id = await getStudentId(req.user.userId);
    if (!student_id) {
       return res.status(400).json({ message: 'Student profile required to create logs' });
    }

    const logData = { ...req.body };
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate entry date
    const dateValidation = await DateValidation.validateEntryDate(student_id.toString(), new Date(logData.entry_date));
    if (!dateValidation.isValid) {
      if (dateValidation.requiresBackdatingApproval) {
        return res.status(400).json({ 
          message: dateValidation.reason,
          requiresBackdatingApproval: true,
          daysPast: dateValidation.daysPast
        });
      }
      return res.status(400).json({ message: dateValidation.reason });
    }

    // Check for existing entry
    const existingEntry = await DateValidation.checkExistingEntry(student_id.toString(), new Date(logData.entry_date));
    if (existingEntry.exists && !existingEntry.canEdit) {
      return res.status(400).json({ 
        message: 'Entry already exists for this date and cannot be edited',
        entry: existingEntry.entry
      });
    }

    // Validate required fields
    const requiredFieldsValidation = DateValidation.validateRequiredFields(logData);
    if (!requiredFieldsValidation.isValid) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: requiredFieldsValidation.missingFields
      });
    }

    // Validate work hours
    if (logData.start_time && logData.end_time) {
      const hoursValidation = DateValidation.validateWorkHours(logData.start_time, logData.end_time);
      if (!hoursValidation.isValid) {
        return res.status(400).json({ message: hoursValidation.reason });
      }
    }

    // Check for rapid entry pattern
    const rapidPattern = await DateValidation.checkRapidEntryPattern(student_id.toString());
    if (rapidPattern.isRapid) {
      return res.status(429).json({ 
        message: `Too many entries created recently. Please wait before creating more entries.`,
        recentCount: rapidPattern.recentCount,
        timeWindow: rapidPattern.timeWindow
      });
    }

    // Parse tools_used if sent as stringified JSON
    if (typeof logData.tools_used === 'string') {
      try {
        logData.tools_used = JSON.parse(logData.tools_used);
      } catch(e) {}
    }

    // Process attachments with optional geotagging
    if (req.files && Array.isArray(req.files)) {
      logData.attachments = req.files.map((file: Express.Multer.File) => ({
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        uploaded_at: new Date(),
        geotag: req.body.geotag ? JSON.parse(req.body.geotag) : undefined
      }));
    }

    // Initialize audit trail
    const auditTrail = {
      created_by: new Types.ObjectId(req.user.userId),
      created_at: new Date(),
      created_ip: ipAddress,
      created_device: req.get('User-Agent') || 'unknown',
      modification_count: 0
    };

    // Initialize fraud flags
    const fraudFlags = {
      rapid_submission: false,
      identical_description: false,
      unusual_hours: false,
      missing_evidence: false,
      suspicious_pattern: false,
      risk_score: 0
    };

    // Create log entry with enhanced fields
    const newLog = new LogEntry({
      ...logData,
      student_id,
      audit_trail: auditTrail,
      fraud_flags: fraudFlags,
      is_immutable: false,
      backdating_approved: dateValidation.requiresBackdatingApproval || false
    });

    await newLog.save();

    // Run fraud detection
    const fraudAnalysis = await FraudDetectionEngine.analyzeLogEntry(newLog, student_id!.toString());
    
    // Update fraud flags
    newLog.fraud_flags = fraudAnalysis.fraudFlags;
    await newLog.save();

    // Create fraud detection records if needed
    for (const fraud of fraudAnalysis.detectedFrauds) {
      await FraudDetectionEngine.createFraudDetectionRecord(
        student_id!.toString(),
        newLog._id.toString(),
        fraud.type,
        fraud.severity,
        fraud.description,
        fraud.metadata
      );
    }

    // Create audit log
    await createAuditLog(
      req.user.userId,
      'CREATE_LOG_ENTRY',
      'LogEntry',
      newLog._id.toString(),
      {
        entry_date: newLog.entry_date,
        task_title: newLog.task_title,
        fraud_score: fraudAnalysis.riskScore
      },
      ipAddress
    );

    // Notify supervisor if submitted
    if (newLog.status === LogStatus.SUBMITTED) {
      await notifySupervisorOnSubmit(student_id!.toString(), newLog.task_title, fraudAnalysis.riskScore);
    }

    res.status(201).json({
      ...newLog.toObject(),
      fraudAnalysis: {
        riskScore: fraudAnalysis.riskScore,
        detectedFrauds: fraudAnalysis.detectedFrauds
      }
    });
  } catch (error) {
    console.error('createEnhancedLogEntry error:', error);
    res.status(500).json({ message: 'Server error creating log entry' });
  }
};

export const submitLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const student_id = await getStudentId(req.user.userId);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    const log = await LogEntry.findOne({ _id: id, student_id });
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    if (log.status !== LogStatus.DRAFT && log.status !== LogStatus.NEEDS_REVISION) {
      return res.status(400).json({ message: 'Can only submit draft or revision logs' });
    }

    if (log.is_immutable) {
      return res.status(400).json({ message: 'Cannot submit immutable entry' });
    }

    // Validate required fields before submission
    const requiredFieldsValidation = DateValidation.validateRequiredFields(log.toObject());
    if (!requiredFieldsValidation.isValid) {
      return res.status(400).json({ 
        message: 'Cannot submit entry with missing required fields',
        missingFields: requiredFieldsValidation.missingFields
      });
    }

    // Update submission details
    log.status = LogStatus.SUBMITTED;
    log.submitted_at = new Date();
    log.audit_trail.submitted_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.submitted_at = new Date();
    log.audit_trail.submitted_ip = ipAddress;
    log.audit_trail.last_modified_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.last_modified_at = new Date();
    log.audit_trail.modification_count += 1;

    await log.save();

    // Run final fraud detection before submission
    const fraudAnalysis = await FraudDetectionEngine.analyzeLogEntry(log, student_id!.toString());
    log.fraud_flags = fraudAnalysis.fraudFlags;
    await log.save();

    // Create audit log
    await createAuditLog(
      req.user.userId,
      'SUBMIT_LOG_ENTRY',
      'LogEntry',
      log._id.toString(),
      {
        entry_date: log.entry_date,
        task_title: log.task_title,
        fraud_score: fraudAnalysis.riskScore
      },
      ipAddress
    );

    // Notify supervisor
    await notifySupervisorOnSubmit(student_id!.toString(), log.task_title, fraudAnalysis.riskScore);

    res.status(200).json({
      ...log.toObject(),
      fraudAnalysis: {
        riskScore: fraudAnalysis.riskScore,
        detectedFrauds: fraudAnalysis.detectedFrauds
      }
    });
  } catch (error) {
    console.error('submitLogEntry error:', error);
    res.status(500).json({ message: 'Server error submitting log entry' });
  }
};

export const approveLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    const log = await LogEntry.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    if (log.status !== LogStatus.SUBMITTED) {
      return res.status(400).json({ message: 'Can only approve submitted logs' });
    }

    // Verify supervisor is assigned to this student
    const assignment = await SupervisorAssignment.findOne({
      student_id: log.student_id,
      industry_supervisor_id: req.user.userId,
      is_active: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to approve this student\'s logs' });
    }

    // Check for supervisor approval anomalies
    await FraudDetectionEngine.checkSupervisorApprovalAnomalies(req.user.userId);

    // Create blockchain hash for immutability
    const blockchainHash = await CryptographicHash.makeImmutable(log._id.toString());

    // Update approval details
    log.status = LogStatus.APPROVED;
    log.approved_at = new Date();
    log.approved_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.approved_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.approved_at = new Date();
    log.audit_trail.approved_ip = ipAddress;
    log.is_immutable = true;

    await log.save();

    // Create audit log
    await createAuditLog(
      req.user.userId,
      'APPROVE_LOG_ENTRY',
      'LogEntry',
      log._id.toString(),
      {
        entry_date: log.entry_date,
        task_title: log.task_title,
        blockchain_hash: blockchainHash
      },
      ipAddress
    );

    // Notify student
    const studentProfile = await StudentProfile.findById(log.student_id);
    if (studentProfile) {
      await Notification.create({
        user_id: studentProfile.user_id,
        type: NotificationType.LOG_APPROVED,
        title: 'Log Entry Approved',
        message: `Your log entry "${log.task_title}" has been approved.`,
        metadata: { log_id: log._id }
      });
    }

    res.status(200).json({
      ...log.toObject(),
      blockchain_hash: blockchainHash
    });
  } catch (error) {
    console.error('approveLogEntry error:', error);
    res.status(500).json({ message: 'Server error approving log entry' });
  }
};

export const rejectLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const log = await LogEntry.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    if (log.status !== LogStatus.SUBMITTED) {
      return res.status(400).json({ message: 'Can only reject submitted logs' });
    }

    if (log.is_immutable) {
      return res.status(400).json({ message: 'Cannot reject immutable entry' });
    }

    // Verify supervisor is assigned to this student
    const assignment = await SupervisorAssignment.findOne({
      student_id: log.student_id,
      industry_supervisor_id: req.user.userId,
      is_active: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to reject this student\'s logs' });
    }

    // Update rejection details
    log.status = LogStatus.REJECTED;
    log.rejection_reason = rejection_reason;
    log.audit_trail.last_modified_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.last_modified_at = new Date();
    log.audit_trail.modification_count += 1;

    await log.save();

    // Create audit log
    await createAuditLog(
      req.user.userId,
      'REJECT_LOG_ENTRY',
      'LogEntry',
      log._id.toString(),
      {
        entry_date: log.entry_date,
        task_title: log.task_title,
        rejection_reason
      },
      ipAddress
    );

    // Notify student
    const studentProfile = await StudentProfile.findById(log.student_id);
    if (studentProfile) {
      await Notification.create({
        user_id: studentProfile.user_id,
        type: NotificationType.LOG_REJECTED,
        title: 'Log Entry Rejected',
        message: `Your log entry "${log.task_title}" has been rejected. Reason: ${rejection_reason}`,
        metadata: { log_id: log._id }
      });
    }

    res.status(200).json(log);
  } catch (error) {
    console.error('rejectLogEntry error:', error);
    res.status(500).json({ message: 'Server error rejecting log entry' });
  }
};

export const requestLogRevision = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const { instructions } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!instructions || instructions.trim() === '') {
      return res.status(400).json({ message: 'Revision instructions are required' });
    }
    
    const log = await LogEntry.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    if (log.status !== LogStatus.SUBMITTED) {
      return res.status(400).json({ message: 'Can only request revision for submitted logs' });
    }

    if (log.is_immutable) {
      return res.status(400).json({ message: 'Cannot request revision for immutable entry' });
    }

    // Verify supervisor is assigned to this student
    const assignment = await SupervisorAssignment.findOne({
      student_id: log.student_id,
      industry_supervisor_id: req.user.userId,
      is_active: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to request revision for this student\'s logs' });
    }

    // Update revision request details
    log.status = LogStatus.NEEDS_REVISION;
    log.revision_request = {
      requested_at: new Date(),
      requested_by: new Types.ObjectId(req.user.userId),
      instructions
    };
    log.audit_trail.last_modified_by = new Types.ObjectId(req.user.userId);
    log.audit_trail.last_modified_at = new Date();
    log.audit_trail.modification_count += 1;

    await log.save();

    // Create audit log
    await createAuditLog(
      req.user.userId,
      'REQUEST_LOG_REVISION',
      'LogEntry',
      log._id.toString(),
      {
        entry_date: log.entry_date,
        task_title: log.task_title,
        revision_instructions: instructions
      },
      ipAddress
    );

    // Notify student
    const studentProfile = await StudentProfile.findById(log.student_id);
    if (studentProfile) {
      await Notification.create({
        user_id: studentProfile.user_id,
        type: NotificationType.LOG_REVISION_REQUESTED,
        title: 'Log Entry Revision Requested',
        message: `Your supervisor has requested revisions for "${log.task_title}". Instructions: ${instructions}`,
        metadata: { log_id: log._id }
      });
    }

    res.status(200).json(log);
  } catch (error) {
    console.error('requestLogRevision error:', error);
    res.status(500).json({ message: 'Server error requesting log revision' });
  }
};
