import { Request, Response } from 'express';
import { exportToCSV, exportToExcel } from '../services/exportService';
import { StudentProfile } from '../models/StudentProfile';
import { LogEntry } from '../models/LogEntry';

export const exportData = async (req: Request, res: Response) => {
  try {
    const { entity } = req.params;
    const { format = 'csv', startDate, endDate, department } = req.query;
    
    let rawData: any[] = [];

    if (entity === 'students') {
      const query: any = {};
      if (department) query.department = department;
      
      const students = await StudentProfile.find(query).populate('user_id');
      rawData = students.map((s: any) => ({
        id: s._id.toString(),
        matriculation_number: s.matriculation_number,
        first_name: s.user_id?.first_name || '',
        last_name: s.user_id?.last_name || '',
        email: s.user_id?.email || '',
        department: s.department || '',
        faculty: s.faculty || '',
        course_of_study: s.course_of_study || '',
        program_level: s.program_level || ''
      }));
    } else if (entity === 'logentries') {
      const query: any = {};
      if (startDate || endDate) {
        query.entry_date = {};
        if (startDate) query.entry_date.$gte = new Date(startDate as string);
        if (endDate) query.entry_date.$lte = new Date(endDate as string);
      }
      
      const logs = await LogEntry.find(query).populate({
        path: 'student_id',
        populate: { path: 'user_id' }
      });
      
      rawData = logs.map((log: any) => ({
        id: log._id.toString(),
        student_matric: log.student_id?.matriculation_number || '',
        task_title: log.task_title || '',
        entry_date: log.entry_date ? new Date(log.entry_date).toLocaleDateString() : '',
        total_hours: log.total_hours || 0,
        status: log.status || ''
      }));
    } else {
      return res.status(400).json({ error: 'Invalid entity for export' });
    }

    if (format === 'csv') {
      const csv = exportToCSV(rawData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}_export_${Date.now()}.csv`);
      return res.send(csv);
    } else if (format === 'xlsx') {
      const buffer = await exportToExcel(rawData, entity);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}_export_${Date.now()}.xlsx`);
      return res.send(buffer);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or xlsx.' });
    }
  } catch (error) {
    console.error('Export Data Error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};
