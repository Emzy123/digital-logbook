"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadWeeklyPdf = exports.getSummaries = exports.createOrUpdateSummary = void 0;
const WeeklySummary_1 = require("../models/WeeklySummary");
const LogEntry_1 = require("../models/LogEntry");
const StudentProfile_1 = require("../models/StudentProfile");
const pdfGenerator_1 = require("../utils/pdfGenerator");
const User_1 = require("../models/User");
const createOrUpdateSummary = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const profile = await StudentProfile_1.StudentProfile.findOne({ user_id: userId });
        if (!profile)
            return res.status(403).json({ message: 'Profile required' });
        const { week_number, start_date, end_date, summary_text, status } = req.body;
        const summary = await WeeklySummary_1.WeeklySummary.findOneAndUpdate({ student_id: profile._id, week_number }, { $set: { start_date, end_date, summary_text, status } }, { new: true, upsert: true });
        res.status(200).json(summary);
    }
    catch (err) {
        res.status(500).json({ message: 'Error processing summary' });
    }
};
exports.createOrUpdateSummary = createOrUpdateSummary;
const getSummaries = async (req, res) => {
    try {
        let student_id;
        if ([User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR].includes(req.user?.role)) {
            student_id = req.query.studentId;
        }
        else {
            const profile = await StudentProfile_1.StudentProfile.findOne({ user_id: req.user?.userId });
            student_id = profile?._id;
        }
        if (!student_id)
            return res.status(400).json({ message: 'Unknown student' });
        const summaries = await WeeklySummary_1.WeeklySummary.find({ student_id }).sort({ week_number: 1 });
        res.status(200).json(summaries);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching summaries' });
    }
};
exports.getSummaries = getSummaries;
const downloadWeeklyPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const summary = await WeeklySummary_1.WeeklySummary.findById(id).populate({
            path: 'student_id',
            populate: { path: 'user_id', select: 'first_name last_name email' }
        });
        if (!summary)
            return res.status(404).json({ message: 'Summary not found' });
        const logs = await LogEntry_1.LogEntry.find({
            student_id: summary.student_id._id,
            entry_date: { $gte: summary.start_date, $lte: summary.end_date }
        }).sort({ entry_date: 1 });
        const studentData = summary.student_id.user_id;
        const pdfBuffer = await (0, pdfGenerator_1.generateWeeklyPdf)(studentData, summary, logs);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=weekly-summary-week-${summary.week_number}.pdf`);
        res.status(200).send(pdfBuffer);
    }
    catch (err) {
        console.error('download pdf error', err);
        res.status(500).json({ message: 'Error generating PDF' });
    }
};
exports.downloadWeeklyPdf = downloadWeeklyPdf;
