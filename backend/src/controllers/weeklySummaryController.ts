import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { WeeklySummary } from '../models/WeeklySummary';
import { LogEntry } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';
import { generateWeeklyPdf } from '../utils/pdfGenerator';
import { UserRole } from '../models/User';

export const createOrUpdateSummary = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await StudentProfile.findOne({ user_id: userId });
        if (!profile) return res.status(403).json({ message: 'Profile required' });

        const { week_number, start_date, end_date, summary_text, status } = req.body;

        const summary = await WeeklySummary.findOneAndUpdate(
            { student_id: profile._id, week_number },
            { $set: { start_date, end_date, summary_text, status } },
            { new: true, upsert: true }
        );

        res.status(200).json(summary);
    } catch(err) {
        res.status(500).json({ message: 'Error processing summary' });
    }
};

export const getSummaries = async (req: AuthRequest, res: Response) => {
    try {
        let student_id;
        if ([UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR].includes(req.user?.role as any)) {
            student_id = req.query.studentId;
        } else {
            const profile = await StudentProfile.findOne({ user_id: req.user?.userId });
            student_id = profile?._id;
        }

        if(!student_id) return res.status(400).json({ message: 'Unknown student' });

        const summaries = await WeeklySummary.find({ student_id }).sort({ week_number: 1 });
        res.status(200).json(summaries);
    } catch(err) {
        res.status(500).json({ message: 'Error fetching summaries' });
    }
};

export const downloadWeeklyPdf = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const summary = await WeeklySummary.findById(id).populate({
            path: 'student_id',
            populate: { path: 'user_id', select: 'first_name last_name email' }
        });

        if (!summary) return res.status(404).json({ message: 'Summary not found' });

        const logs = await LogEntry.find({
            student_id: summary.student_id._id,
            entry_date: { $gte: summary.start_date, $lte: summary.end_date }
        }).sort({ entry_date: 1 });

        const studentData = (summary.student_id as any).user_id;

        const pdfBuffer = await generateWeeklyPdf(studentData, summary, logs);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=weekly-summary-week-${summary.week_number}.pdf`);
        res.status(200).send(pdfBuffer);
    } catch(err) {
        console.error('download pdf error', err);
        res.status(500).json({ message: 'Error generating PDF' });
    }
};
