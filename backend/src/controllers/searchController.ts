import { Request, Response } from 'express';
import { StudentProfile } from '../models/StudentProfile';
import { LogEntry } from '../models/LogEntry';

export const search = async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    const query = typeof q === 'string' ? q : '';
    
    if (!query) {
      return res.json({ results: { students: [], logs: [] } });
    }

    const regex = new RegExp(query, 'i');
    let results: any = {};

    if (!type || type === 'students') {
      results.students = await StudentProfile.aggregate([
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { 
          $match: { 
            $or: [
              { 'user.first_name': regex }, 
              { 'user.last_name': regex }, 
              { matriculation_number: regex }
            ] 
          } 
        }
      ]).limit(20);
    }

    if (!type || type === 'logs') {
      results.logs = await LogEntry.find({
        $or: [
          { task_title: regex },
          { task_description: regex }
        ]
      })
      .populate({
        path: 'student_id',
        populate: { path: 'user_id' }
      })
      .limit(20);
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
};
