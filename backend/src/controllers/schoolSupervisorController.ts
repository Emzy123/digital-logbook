import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { SupervisorComment } from '../models/SupervisorComment';
import { Establishment } from '../models/Establishment';
import { User, UserRole } from '../models/User';
import { FraudDetection } from '../models/FraudDetection';
import { Notification, NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

export const getSchoolSupervisorDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const supervisorId = req.user.userId;

    // Get all assigned students across companies
    const assignments = await SupervisorAssignment.find({
      school_supervisor_id: new Types.ObjectId(supervisorId),
      is_active: true
    }).populate('student_id');

    const studentIds = assignments.map(a => a.student_id._id);

    // Get comprehensive metrics
    const totalStudents = assignments.length;
    
    // Get students by company/establishment
    const studentsByCompany = await StudentProfile.aggregate([
      { $match: { _id: { $in: studentIds } } },
      {
        $lookup: {
          from: 'establishments',
          localField: 'establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $group: {
          _id: '$establishment_id',
          establishment: { $first: '$establishment' },
          students: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Overall submission rates
    const totalSubmissions = await LogEntry.countDocuments({
      student_id: { $in: studentIds },
      status: { $in: [LogStatus.APPROVED, LogStatus.SUBMITTED] }
    });

    const approvedSubmissions = await LogEntry.countDocuments({
      student_id: { $in: studentIds },
      status: LogStatus.APPROVED
    });

    // Pending reviews across all industry supervisors
    const pendingReviews = await LogEntry.countDocuments({
      student_id: { $in: studentIds },
      status: LogStatus.SUBMITTED
    });

    // Students with no recent activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveStudents = await LogEntry.aggregate([
      {
        $match: {
          student_id: { $in: studentIds },
          submitted_at: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$student_id'
        }
      }
    ]);

    const activeStudentIds = inactiveStudents.map(item => item._id);
    const inactiveStudentCount = studentIds.length - activeStudentIds.length;

    // Quality metrics
    const avgHoursPerEntry = await LogEntry.aggregate([
      {
        $match: {
          student_id: { $in: studentIds },
          status: LogStatus.APPROVED
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$total_hours' }
        }
      }
    ]);

    // Fraud alerts across all students
    const fraudAlerts = await FraudDetection.countDocuments({
      student_id: { $in: studentIds },
      resolved: false
    });

    // Recent activities across all students
    const recentActivities = await LogEntry.find({
      student_id: { $in: studentIds },
      submitted_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .populate('student_id', 'matriculation_number')
      .populate({
        path: 'student_id',
        populate: [
          { path: 'user_id', select: 'first_name last_name' },
          { path: 'establishment_id', select: 'name' }
        ]
      })
      .sort({ submitted_at: -1 })
      .limit(15);

    // Industry supervisor response times
    const industrySupervisorPerformance = await LogEntry.aggregate([
      {
        $match: {
          student_id: { $in: studentIds },
          approved_at: { $gte: thirtyDaysAgo },
          approved_by: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approved_by',
          foreignField: '_id',
          as: 'supervisor'
        }
      },
      {
        $group: {
          _id: '$approved_by',
          supervisor: { $first: '$supervisor' },
          avgResponseTime: {
            $avg: {
              $subtract: ['$approved_at', '$submitted_at']
            }
          },
          totalApprovals: { $sum: 1 }
        }
      },
      { $sort: { avgResponseTime: 1 } }
    ]);

    res.status(200).json({
      metrics: {
        totalStudents,
        totalSubmissions,
        approvedSubmissions,
        approvalRate: totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0,
        pendingReviews,
        inactiveStudents: inactiveStudentCount,
        avgHoursPerEntry: avgHoursPerEntry[0]?.avgHours || 0,
        fraudAlerts
      },
      studentsByCompany,
      recentActivities,
      industrySupervisorPerformance
    });
  } catch (error) {
    console.error('getSchoolSupervisorDashboard error:', error);
    res.status(500).json({ message: 'Error fetching school supervisor dashboard' });
  }
};

export const getCrossCompanyStudentOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const supervisorId = req.user.userId;
    const { page = 1, limit = 20, company, status, riskLevel } = req.query;

    // Get assigned students
    const assignments = await SupervisorAssignment.find({
      school_supervisor_id: new Types.ObjectId(supervisorId),
      is_active: true
    }).populate('student_id');

    let studentIds = assignments.map(a => a.student_id._id);

    // Filter by company if specified
    if (company) {
      const studentsInCompany = await StudentProfile.find({
        _id: { $in: studentIds },
        establishment_id: new Types.ObjectId(company as string)
      });
      studentIds = studentsInCompany.map(s => s._id);
    }

    // Get student profiles with progress
    const students = await StudentProfile.find({ _id: { $in: studentIds } })
      .populate('user_id', 'first_name last_name email')
      .populate('establishment_id', 'name city state')
      .sort({ createdAt: -1 });

    // Enrich with metrics
    const enrichedStudents = await Promise.all(
      students.map(async (student) => {
        const studentId = student._id;

        // Submission metrics
        const totalEntries = await LogEntry.countDocuments({
          student_id: studentId,
          status: { $in: [LogStatus.APPROVED, LogStatus.SUBMITTED] }
        });

        const approvedEntries = await LogEntry.countDocuments({
          student_id: studentId,
          status: LogStatus.APPROVED
        });

        const pendingEntries = await LogEntry.countDocuments({
          student_id: studentId,
          status: LogStatus.SUBMITTED
        });

        // Hours completed
        const totalHours = await LogEntry.aggregate([
          { $match: { student_id: studentId, status: LogStatus.APPROVED } },
          { $group: { _id: null, totalHours: { $sum: '$total_hours' } } }
        ]);

        // Last activity
        const lastActivity = await LogEntry.findOne({
          student_id: studentId,
          status: { $in: [LogStatus.SUBMITTED, LogStatus.APPROVED] }
        }).sort({ submitted_at: -1 });

        // Fraud risk level
        const fraudAlerts = await FraudDetection.countDocuments({
          student_id: studentId,
          resolved: false
        });

        // Industry supervisor info
        const industryAssignment = await SupervisorAssignment.findOne({
          student_id: studentId,
          is_active: true
        }).populate('industry_supervisor_id', 'first_name last_name email');

        let riskLevel = 'low';
        if (fraudAlerts >= 3) riskLevel = 'high';
        else if (fraudAlerts >= 1) riskLevel = 'medium';

        return {
          ...student.toObject(),
          metrics: {
            totalEntries,
            approvedEntries,
            pendingEntries,
            totalHours: totalHours[0]?.totalHours || 0,
            approvalRate: totalEntries > 0 ? (approvedEntries / totalEntries) * 100 : 0,
            lastActivityDate: lastActivity?.submitted_at,
            fraudAlerts,
            riskLevel
          },
          industrySupervisor: industryAssignment?.industry_supervisor_id
        };
      })
    );

    // Apply filters
    let filteredStudents = enrichedStudents;
    
    if (status && status !== 'all') {
      filteredStudents = filteredStudents.filter(student => {
        if (status === 'inactive') return !student.metrics.lastActivityDate;
        if (status === 'pending') return student.metrics.pendingEntries > 0;
        if (status === 'on_track') return student.metrics.approvalRate >= 80;
        return true;
      });
    }

    if (riskLevel && riskLevel !== 'all') {
      filteredStudents = filteredStudents.filter(student => 
        student.metrics.riskLevel === riskLevel
      );
    }

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + Number(limit));

    res.status(200).json({
      students: paginatedStudents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredStudents.length,
        pages: Math.ceil(filteredStudents.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('getCrossCompanyStudentOverview error:', error);
    res.status(500).json({ message: 'Error fetching student overview' });
  }
};

export const getStudentDetailedReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { studentId } = req.params;
    const { period = '30' } = req.query; // days

    // Verify school supervisor is assigned to this student
    const assignment = await SupervisorAssignment.findOne({
      student_id: new Types.ObjectId(studentId),
      school_supervisor_id: new Types.ObjectId(req.user.userId),
      is_active: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not assigned to supervise this student' });
    }

    const daysAgo = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);

    // Get student profile
    const studentProfile = await StudentProfile.findById(studentId)
      .populate('user_id', 'first_name last_name email')
      .populate('establishment_id', 'name address city state contact_person contact_phone');

    // Get log entries with comments
    const logEntries = await LogEntry.find({
      student_id: new Types.ObjectId(studentId),
      submitted_at: { $gte: daysAgo }
    })
      .sort({ entry_date: -1 })
      .populate({
        path: 'comments',
        match: { is_internal: { $ne: true } },
        populate: { path: 'author_id', select: 'first_name last_name email' }
      });

    // Get industry supervisor performance
    const industryAssignment = await SupervisorAssignment.findOne({
      student_id: new Types.ObjectId(studentId),
      is_active: true
    }).populate('industry_supervisor_id', 'first_name last_name email');

    const industryPerformance = await LogEntry.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(studentId),
          approved_at: { $gte: daysAgo },
          approved_by: industryAssignment?.industry_supervisor_id
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: {
            $avg: {
              $subtract: ['$approved_at', '$submitted_at']
            }
          },
          totalApprovals: { $sum: 1 },
          avgHoursPerEntry: { $avg: '$total_hours' }
        }
      }
    ]);

    // Weekly progress
    const weeklyProgress = await LogEntry.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(studentId),
          submitted_at: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$submitted_at' },
            year: { $year: '$submitted_at' }
          },
          entries: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', LogStatus.APPROVED] }, 1, 0]
            }
          },
          totalHours: { $sum: '$total_hours' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // Skills and tools analysis
    const skillsAnalysis = await LogEntry.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(studentId),
          status: LogStatus.APPROVED,
          submitted_at: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: null,
          uniqueSkills: { $addToSet: '$skills_learned' },
          uniqueTools: { $addToSet: '$tools_used' },
          avgDescriptionLength: { $avg: { $strLenCP: '$task_description' } }
        }
      }
    ]);

    // Fraud alerts
    const fraudAlerts = await FraudDetection.find({
      student_id: new Types.ObjectId(studentId),
      detected_at: { $gte: daysAgo }
    }).sort({ detected_at: -1 });

    res.status(200).json({
      studentProfile,
      logEntries,
      industrySupervisor: industryAssignment?.industry_supervisor_id,
      industryPerformance: industryPerformance[0] || {
        avgResponseTime: 0,
        totalApprovals: 0,
        avgHoursPerEntry: 0
      },
      weeklyProgress,
      skillsAnalysis: skillsAnalysis[0] || {
        uniqueSkills: [],
        uniqueTools: [],
        avgDescriptionLength: 0
      },
      fraudAlerts,
      period: Number(period)
    });
  } catch (error) {
    console.error('getStudentDetailedReport error:', error);
    res.status(500).json({ message: 'Error fetching student detailed report' });
  }
};

export const conductVirtualSupervisionVisit = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { studentId } = req.params;
    const { visitNotes, recommendations, followUpRequired } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Verify school supervisor is assigned to this student
    const assignment = await SupervisorAssignment.findOne({
      student_id: new Types.ObjectId(studentId),
      school_supervisor_id: new Types.ObjectId(req.user.userId),
      is_active: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Not assigned to supervise this student' });
    }

    // Get recent log entries for context
    const recentLogs = await LogEntry.find({
      student_id: new Types.ObjectId(studentId),
      submitted_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ entry_date: -1 }).limit(10);

    // Create a comprehensive comment on the most recent log
    if (recentLogs.length > 0) {
      const commentContent = `🏫 VIRTUAL SUPERVISION VISIT - ${new Date().toLocaleDateString()}\n\n` +
        `📋 Visit Notes:\n${visitNotes}\n\n` +
        `💡 Recommendations:\n${recommendations}\n\n` +
        `📅 Follow-up Required: ${followUpRequired ? 'Yes' : 'No'}\n\n` +
        `---\nThis virtual visit reviewed ${recentLogs.length} recent entries and provided comprehensive feedback.`;

      const comment = new SupervisorComment({
        log_entry_id: recentLogs[0]._id,
        author_id: new Types.ObjectId(req.user.userId),
        author_role: req.user.role,
        comment_type: 'school_supervisor_note',
        content: commentContent,
        is_internal: false,
        is_threaded: false,
        mentions: []
      });

      await comment.save();

      // Notify student
      const studentProfile = await StudentProfile.findById(studentId);
      if (studentProfile) {
        await Notification.create({
          user_id: studentProfile.user_id,
          type: NotificationType.FEEDBACK,
          title: 'Virtual Supervision Visit Completed',
          message: `Your school supervisor has conducted a virtual supervision visit and left comprehensive feedback`,
          metadata: { comment_id: comment._id }
        });
      }

      // Notify industry supervisor
      if (assignment.industry_supervisor_id) {
        await Notification.create({
          user_id: assignment.industry_supervisor_id,
          type: NotificationType.FEEDBACK,
          title: 'School Supervisor Virtual Visit',
          message: `A school supervisor has conducted a virtual visit for your assigned student`,
          metadata: { comment_id: comment._id }
        });
      }

      res.status(200).json({
        message: 'Virtual supervision visit completed successfully',
        commentId: comment._id,
        reviewedEntries: recentLogs.length
      });
    } else {
      res.status(400).json({ 
        message: 'No recent log entries found for virtual supervision visit',
        suggestion: 'Student should submit log entries before conducting virtual visit'
      });
    }
  } catch (error) {
    console.error('conductVirtualSupervisionVisit error:', error);
    res.status(500).json({ message: 'Error conducting virtual supervision visit' });
  }
};

export const getWeeklySummaryReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const supervisorId = req.user.userId;
    const { week, year } = req.query;

    // Get assigned students
    const assignments = await SupervisorAssignment.find({
      school_supervisor_id: new Types.ObjectId(supervisorId),
      is_active: true
    }).populate('student_id');

    const studentIds = assignments.map(a => a.student_id._id);

    // Calculate week boundaries
    const currentWeek = week ? Number(week) : getWeekNumber(new Date());
    const currentYear = year ? Number(year) : new Date().getFullYear();
    
    const weekStart = getWeekStartDate(currentWeek, currentYear);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get weekly data for all students
    const weeklySummaries = await Promise.all(
      assignments.map(async (assignment) => {
        const studentId = assignment.student_id._id;
        
        const weeklyData = await LogEntry.aggregate([
          {
            $match: {
              student_id: studentId,
              submitted_at: { $gte: weekStart, $lt: weekEnd }
            }
          },
          {
            $group: {
              _id: null,
              totalEntries: { $sum: 1 },
              approvedEntries: {
                $sum: {
                  $cond: [{ $eq: ['$status', LogStatus.APPROVED] }, 1, 0]
                }
              },
              totalHours: { $sum: '$total_hours' },
              avgHoursPerEntry: { $avg: '$totalHours' },
              uniqueSkills: { $addToSet: '$skills_learned' },
              uniqueTools: { $addToSet: '$tools_used' }
            }
          }
        ]);

        const studentProfile = await StudentProfile.findById(studentId)
          .populate('user_id', 'first_name last_name')
          .populate('establishment_id', 'name');

        return {
          student: studentProfile,
          weeklyData: weeklyData[0] || {
            totalEntries: 0,
            approvedEntries: 0,
            totalHours: 0,
            avgHoursPerEntry: 0,
            uniqueSkills: [],
            uniqueTools: []
          }
        };
      })
    );

    // Calculate overall metrics
    const totalStudents = weeklySummaries.length;
    const activeStudents = weeklySummaries.filter(s => s.weeklyData.totalEntries > 0).length;
    const totalEntries = weeklySummaries.reduce((sum, s) => sum + s.weeklyData.totalEntries, 0);
    const totalHours = weeklySummaries.reduce((sum, s) => sum + s.weeklyData.totalHours, 0);

    res.status(200).json({
      week: currentWeek,
      year: currentYear,
      weekStart,
      weekEnd,
      summary: {
        totalStudents,
        activeStudents,
        totalEntries,
        totalHours,
        avgHoursPerStudent: activeStudents > 0 ? totalHours / activeStudents : 0
      },
      studentSummaries: weeklySummaries
    });
  } catch (error) {
    console.error('getWeeklySummaryReports error:', error);
    res.status(500).json({ message: 'Error fetching weekly summary reports' });
  }
};

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekStartDate(week: number, year: number): Date {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay();
  return new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}
