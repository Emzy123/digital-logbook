import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';
import { Notification, NotificationType } from '../models/Notification';
import { SupervisorAssignment } from '../models/SupervisorAssignment';

const getStudentId = async (userId: string) => {
  const profile = await StudentProfile.findOne({ user_id: userId });
  return profile ? profile._id : null;
};

const notifySupervisorOnSubmit = async (student_id: string, log_title: string) => {
  const assignment = await SupervisorAssignment.findOne({ student_id, is_active: true });
  if (assignment && assignment.industry_supervisor_id) {
    await Notification.create({
      user_id: assignment.industry_supervisor_id,
      type: NotificationType.LOG_SUBMITTED,
      title: 'Log Entry Submitted',
      message: `A student has submitted a log entry: "${log_title}" for your review.`,
      metadata: { student_id }
    });
  }
};

export const createLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const student_id = await getStudentId(req.user.userId);
    if (!student_id) {
       return res.status(400).json({ message: 'Student profile required to create logs' });
    }

    const logData = { ...req.body, student_id };
    
    // Parse tools_used if sent as stringified JSON from form data
    if (typeof logData.tools_used === 'string') {
        try {
            logData.tools_used = JSON.parse(logData.tools_used);
        } catch(e) {}
    }

    if (req.files && Array.isArray(req.files)) {
      logData.attachments = req.files.map((file: Express.Multer.File) => ({
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size
      }));
    }

    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    logData.audit_trail = {
      created_by: req.user.userId,
      created_at: new Date(),
      created_ip: ipAddress,
      modification_count: 0
    };

    const newLog = new LogEntry(logData);
    await newLog.save();

    if (newLog.status === LogStatus.SUBMITTED) {
      await notifySupervisorOnSubmit(student_id.toString(), newLog.task_title);
    }

    res.status(201).json(newLog);
  } catch (error) {
    console.error('createLogEntry error:', error);
    res.status(500).json({ message: 'Server error creating log entry' });
  }
};

export const getLogEntries = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const student_id = await getStudentId(req.user.userId);
    if (!student_id) {
       return res.status(200).json({ logs: [], pagination: { total: 0, page: 1, pages: 0 }});
    }

    const { status, page = 1, limit = 20 } = req.query;
    
    const query: any = { student_id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const logs = await LogEntry.find(query)
      .sort({ entry_date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await LogEntry.countDocuments(query);

    res.status(200).json({
      logs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('getLogEntries error:', error);
    res.status(500).json({ message: 'Server error retrieving log entries' });
  }
};

export const updateLogEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const student_id = await getStudentId(req.user.userId);
    
    const log = await LogEntry.findOne({ _id: id, student_id });
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    if (log.status !== LogStatus.DRAFT && log.status !== LogStatus.NEEDS_REVISION) {
      return res.status(400).json({ message: 'Can only update draft or revision logs' });
    }

    const updateData = req.body;
    
    if (typeof updateData.tools_used === 'string') {
        try {
            updateData.tools_used = JSON.parse(updateData.tools_used);
        } catch(e) {}
    }

    if (req.files && Array.isArray(req.files)) {
      const newAttachments = req.files.map((file: Express.Multer.File) => ({
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size
      }));
      updateData.attachments = [...(log.attachments || []), ...newAttachments];
    }

    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    Object.assign(log, updateData);
    
    if (!log.audit_trail) {
      log.audit_trail = {
        created_by: req.user.userId as any,
        created_at: new Date(),
        created_ip: ipAddress,
        modification_count: 0
      };
    }
    
    log.audit_trail.last_modified_by = req.user.userId as any;
    log.audit_trail.last_modified_at = new Date();
    log.audit_trail.modification_count = (log.audit_trail.modification_count || 0) + 1;

    await log.save();

    if (updateData.status === LogStatus.SUBMITTED && student_id) {
      await notifySupervisorOnSubmit(student_id.toString(), log.task_title);
    }

    res.status(200).json(log);
  } catch (error) {
    console.error('updateLogEntry error:', error);
    res.status(500).json({ message: 'Server error updating log entry' });
  }
};

export const getLogEntryById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const student_id = await getStudentId(req.user.userId);
    
    const log = await LogEntry.findOne({ _id: id, student_id });
    if (!log) return res.status(404).json({ message: 'Log entry not found' });
    
    res.status(200).json(log);
  } catch(error) {
     console.error('getLog error:', error);
     res.status(500).json({ message: 'Error retrieving' });
  }
};
