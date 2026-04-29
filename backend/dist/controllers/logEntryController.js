"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogEntryById = exports.updateLogEntry = exports.getLogEntries = exports.createLogEntry = void 0;
const LogEntry_1 = require("../models/LogEntry");
const StudentProfile_1 = require("../models/StudentProfile");
const Notification_1 = require("../models/Notification");
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const getStudentId = async (userId) => {
    const profile = await StudentProfile_1.StudentProfile.findOne({ user_id: userId });
    return profile ? profile._id : null;
};
const notifySupervisorOnSubmit = async (student_id, log_title) => {
    const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({ student_id, is_active: true });
    if (assignment && assignment.industry_supervisor_id) {
        await Notification_1.Notification.create({
            user_id: assignment.industry_supervisor_id,
            type: Notification_1.NotificationType.LOG_SUBMITTED,
            title: 'Log Entry Submitted',
            message: `A student has submitted a log entry: "${log_title}" for your review.`,
            metadata: { student_id }
        });
    }
};
const createLogEntry = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const student_id = await getStudentId(req.user.userId);
        if (!student_id) {
            return res.status(400).json({ message: 'Student profile required to create logs' });
        }
        const logData = { ...req.body, student_id };
        // Parse tools_used if sent as stringified JSON from form data
        if (typeof logData.tools_used === 'string') {
            try {
                logData.tools_used = JSON.parse(logData.tools_used);
            }
            catch (e) { }
        }
        if (req.files && Array.isArray(req.files)) {
            logData.attachments = req.files.map((file) => ({
                url: `/uploads/${file.filename}`,
                filename: file.originalname,
                mime_type: file.mimetype,
                size: file.size
            }));
        }
        const newLog = new LogEntry_1.LogEntry(logData);
        await newLog.save();
        if (newLog.status === LogEntry_1.LogStatus.SUBMITTED) {
            await notifySupervisorOnSubmit(student_id.toString(), newLog.task_title);
        }
        res.status(201).json(newLog);
    }
    catch (error) {
        console.error('createLogEntry error:', error);
        res.status(500).json({ message: 'Server error creating log entry' });
    }
};
exports.createLogEntry = createLogEntry;
const getLogEntries = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const student_id = await getStudentId(req.user.userId);
        if (!student_id) {
            return res.status(200).json({ logs: [], pagination: { total: 0, page: 1, pages: 0 } });
        }
        const { status, page = 1, limit = 20 } = req.query;
        const query = { student_id };
        if (status)
            query.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const logs = await LogEntry_1.LogEntry.find(query)
            .sort({ entry_date: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await LogEntry_1.LogEntry.countDocuments(query);
        res.status(200).json({
            logs,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('getLogEntries error:', error);
        res.status(500).json({ message: 'Server error retrieving log entries' });
    }
};
exports.getLogEntries = getLogEntries;
const updateLogEntry = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const student_id = await getStudentId(req.user.userId);
        const log = await LogEntry_1.LogEntry.findOne({ _id: id, student_id });
        if (!log) {
            return res.status(404).json({ message: 'Log entry not found' });
        }
        if (log.status !== LogEntry_1.LogStatus.DRAFT && log.status !== LogEntry_1.LogStatus.NEEDS_REVISION) {
            return res.status(400).json({ message: 'Can only update draft or revision logs' });
        }
        const updateData = req.body;
        if (typeof updateData.tools_used === 'string') {
            try {
                updateData.tools_used = JSON.parse(updateData.tools_used);
            }
            catch (e) { }
        }
        if (req.files && Array.isArray(req.files)) {
            const newAttachments = req.files.map((file) => ({
                url: `/uploads/${file.filename}`,
                filename: file.originalname,
                mime_type: file.mimetype,
                size: file.size
            }));
            updateData.attachments = [...(log.attachments || []), ...newAttachments];
        }
        Object.assign(log, updateData);
        await log.save();
        if (updateData.status === LogEntry_1.LogStatus.SUBMITTED && student_id) {
            await notifySupervisorOnSubmit(student_id.toString(), log.task_title);
        }
        res.status(200).json(log);
    }
    catch (error) {
        console.error('updateLogEntry error:', error);
        res.status(500).json({ message: 'Server error updating log entry' });
    }
};
exports.updateLogEntry = updateLogEntry;
const getLogEntryById = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const student_id = await getStudentId(req.user.userId);
        const log = await LogEntry_1.LogEntry.findOne({ _id: id, student_id });
        if (!log)
            return res.status(404).json({ message: 'Log entry not found' });
        res.status(200).json(log);
    }
    catch (error) {
        console.error('getLog error:', error);
        res.status(500).json({ message: 'Error retrieving' });
    }
};
exports.getLogEntryById = getLogEntryById;
