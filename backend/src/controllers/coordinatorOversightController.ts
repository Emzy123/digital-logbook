import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import { SupervisorComment } from '../models/SupervisorComment';
import { User, UserRole } from '../models/User';
import { Establishment } from '../models/Establishment';
import { FraudDetection } from '../models/FraudDetection';
import { CompanyRequest, CompanyRequestStatus } from '../models/CompanyRequest';
import { AuditLog } from '../models/AuditLog';
import { Notification, NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

export const getCoordinatorDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Get comprehensive program metrics
    const totalStudents = await StudentProfile.countDocuments();
    const totalSupervisors = await User.countDocuments({
      role: { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] }
    });
    const totalEstablishments = await Establishment.countDocuments({ is_active: true });

    // Student activity metrics
    const studentsWithSubmissions = await LogEntry.distinct('student_id');
    const activeStudents = studentsWithSubmissions.length;
    const inactiveStudents = totalStudents - activeStudents;

    // Submission statistics
    const totalSubmissions = await LogEntry.countDocuments({
      status: { $in: [LogStatus.APPROVED, LogStatus.SUBMITTED] }
    });
    const approvedSubmissions = await LogEntry.countDocuments({ status: LogStatus.APPROVED });
    const pendingSubmissions = await LogEntry.countDocuments({ status: LogStatus.SUBMITTED });

    // Supervisor performance metrics
    const supervisorAssignments = await SupervisorAssignment.find({ is_active: true });
    
    const industrySupervisorMetrics = await LogEntry.aggregate([
      {
        $match: {
          approved_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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
          approvals: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $subtract: ['$approved_at', '$submitted_at']
            }
          }
        }
      },
      { $sort: { approvals: -1 } }
    ]);

    // Company requests status
    const companyRequests = await CompanyRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Fraud detection overview
    const fraudAlerts = await FraudDetection.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: ['$resolved', 1, 0]
            }
          }
        }
      }
    ]);

    // Recent activity across the system
    const recentActivity = await AuditLog.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .populate('user_id', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .limit(20);

    // Students at risk (no submissions for 14+ days)
    const atRiskStudents = await StudentProfile.aggregate([
      {
        $lookup: {
          from: 'logentries',
          localField: '_id',
          foreignField: 'student_id',
          as: 'logs'
        }
      },
      {
        $project: {
          user_id: 1,
          matriculation_number: 1,
          lastSubmission: {
            $max: '$logs.submitted_at'
          },
          totalSubmissions: { $size: '$logs' }
        }
      },
      {
        $match: {
          $or: [
            { lastSubmission: { $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
            { totalSubmissions: 0 }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      }
    ]);

    // Establishment performance
    const establishmentPerformance = await Establishment.aggregate([
      {
        $lookup: {
          from: 'studentprofiles',
          localField: '_id',
          foreignField: 'establishment_id',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'logentries',
          localField: 'students._id',
          foreignField: 'student_id',
          as: 'logs'
        }
      },
      {
        $project: {
          name: 1,
          city: 1,
          state: 1,
          studentCount: { $size: '$students' },
          totalSubmissions: { $size: '$logs' },
          approvedSubmissions: {
            $size: {
              $filter: {
                input: '$logs',
                cond: { $eq: ['$$this.status', LogStatus.APPROVED] }
              }
            }
          }
        }
      },
      { $match: { studentCount: { $gt: 0 } } },
      { $sort: { studentCount: -1 } }
    ]);

    res.status(200).json({
      overview: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalSupervisors,
        totalEstablishments,
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        approvalRate: totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0
      },
      supervisorMetrics: industrySupervisorMetrics,
      companyRequests,
      fraudAlerts,
      recentActivity,
      atRiskStudents,
      establishmentPerformance
    });
  } catch (error) {
    console.error('getCoordinatorDashboard error:', error);
    res.status(500).json({ message: 'Error fetching coordinator dashboard' });
  }
};

export const getStudentAlerts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { severity = 'all', page = 1, limit = 20 } = req.query;

    // Get students with various alert conditions
    const alerts = await StudentProfile.aggregate([
      {
        $lookup: {
          from: 'logentries',
          localField: '_id',
          foreignField: 'student_id',
          as: 'logs'
        }
      },
      {
        $lookup: {
          from: 'frauddetections',
          localField: '_id',
          foreignField: 'student_id',
          as: 'fraudAlerts'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $project: {
          user: { $arrayElemAt: ['$user', 0] },
          establishment: { $arrayElemAt: ['$establishment', 0] },
          matriculation_number: 1,
          lastSubmission: {
            $max: '$logs.submitted_at'
          },
          totalSubmissions: { $size: '$logs' },
          approvedSubmissions: {
            $size: {
              $filter: {
                input: '$logs',
                cond: { $eq: ['$$this.status', LogStatus.APPROVED] }
              }
            }
          },
          pendingSubmissions: {
            $size: {
              $filter: {
                input: '$logs',
                cond: { $eq: ['$$this.status', LogStatus.SUBMITTED] }
              }
            }
          },
          fraudAlerts: {
            $size: {
              $filter: {
                input: '$fraudAlerts',
                cond: { $eq: ['$$this.resolved', false] }
              }
            }
          },
          highRiskFraud: {
            $size: {
              $filter: {
                input: '$fraudAlerts',
                cond: {
                  $and: [
                    { $eq: ['$$this.resolved', false] },
                    { $in: ['$$this.severity', ['high', 'critical']] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          alertSeverity: {
            $switch: {
              branches: [
                { case: { $gt: ['$highRiskFraud', 0] }, then: 'critical' },
                { case: { $gt: ['$fraudAlerts', 2] }, then: 'high' },
                { case: { $eq: ['$totalSubmissions', 0] }, then: 'high' },
                { case: { $lt: ['$lastSubmission', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)] }, then: 'medium' },
                { case: { $gt: ['$pendingSubmissions', 3] }, then: 'medium' }
              ],
              default: 'low'
            }
          }
        }
      }
    ]);

    // Filter by severity if specified
    let filteredAlerts = alerts;
    if (severity !== 'all') {
      filteredAlerts = alerts.filter(alert => alert.alertSeverity === severity);
    }

    // Sort by severity and last activity
    filteredAlerts.sort((a, b) => {
      const severityOrder: { [key: string]: number } = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.alertSeverity] !== severityOrder[b.alertSeverity]) {
        return severityOrder[a.alertSeverity] - severityOrder[b.alertSeverity];
      }
      return (a.lastSubmission?.getTime() || 0) - (b.lastSubmission?.getTime() || 0);
    });

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + Number(limit));

    res.status(200).json({
      alerts: paginatedAlerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredAlerts.length,
        pages: Math.ceil(filteredAlerts.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('getStudentAlerts error:', error);
    res.status(500).json({ message: 'Error fetching student alerts' });
  }
};

export const getSupervisorPerformance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { period = '30', role = 'all' } = req.query;
    const daysAgo = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);

    // Build role filter
    let roleFilter = {};
    if (role !== 'all') {
      roleFilter = { role: role === 'industry' ? UserRole.INDUSTRY_SUPERVISOR : UserRole.SCHOOL_SUPERVISOR };
    }

    // Get supervisor performance metrics
    const supervisorMetrics = await User.aggregate([
      {
        $match: {
          ...roleFilter,
          role: { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] }
        }
      },
      {
        $lookup: {
          from: 'supervisorassignments',
          localField: '_id',
          foreignField: 'industry_supervisor_id',
          as: 'industryAssignments'
        }
      },
      {
        $lookup: {
          from: 'supervisorassignments',
          localField: '_id',
          foreignField: 'school_supervisor_id',
          as: 'schoolAssignments'
        }
      },
      {
        $lookup: {
          from: 'logentries',
          let: {
            supervisorId: '$_id',
            industryIds: '$industryAssignments.student_id',
            schoolIds: '$schoolAssignments.student_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ['$submitted_at', daysAgo] },
                    {
                      $or: [
                        { $in: ['$student_id', '$$industryIds'] },
                        { $in: ['$student_id', '$$schoolIds'] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'logs'
        }
      },
      {
        $project: {
          first_name: 1,
          last_name: 1,
          email: 1,
          role: 1,
          totalAssignments: {
            $add: [{ $size: '$industryAssignments' }, { $size: '$schoolAssignments' }]
          },
          totalLogs: { $size: '$logs' },
          approvedLogs: {
            $size: {
              $filter: {
                input: '$logs',
                cond: { $eq: ['$$this.status', LogStatus.APPROVED] }
              }
            }
          },
          pendingLogs: {
            $size: {
              $filter: {
                input: '$logs',
                cond: { $eq: ['$$this.status', LogStatus.SUBMITTED] }
              }
            }
          },
          avgResponseTime: {
            $avg: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $and: [
                    { $ne: ['$$log.approved_at', null] },
                    { $ne: ['$$log.submitted_at', null] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          approvalRate: {
            $cond: [
              { $gt: ['$totalLogs', 0] },
              { $multiply: [{ $divide: ['$approvedLogs', '$totalLogs'] }, 100] },
              0
            ]
          },
          performanceScore: {
            $add: [
              { $multiply: [{ $divide: ['$approvedLogs', { $max: ['$totalLogs', 1] }] }, 50] },
              { $multiply: [{ $divide: [{ $subtract: [100, { $multiply: [{ $divide: ['$pendingLogs', { $max: ['$totalLogs', 1] }] }, 100] }] }, 100] }, 50] }
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } }
    ]);

    // Get non-responsive supervisors (no activity in period)
    const nonResponsiveSupervisors = await User.aggregate([
      {
        $match: {
          ...roleFilter,
          role: { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] }
        }
      },
      {
        $lookup: {
          from: 'logentries',
          let: { supervisorId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$approved_by', '$$supervisorId'] },
                    { $gte: ['$approved_at', daysAgo] }
                  ]
                }
              }
            }
          ],
          as: 'recentApprovals'
        }
      },
      {
        $match: { recentApprovals: { $size: 0 } }
      }
    ]);

    res.status(200).json({
      supervisorMetrics,
      nonResponsiveSupervisors,
      period: Number(period)
    });
  } catch (error) {
    console.error('getSupervisorPerformance error:', error);
    res.status(500).json({ message: 'Error fetching supervisor performance' });
  }
};

export const reassignSupervisor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { studentId, newSupervisorId, supervisorType, reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!studentId || !newSupervisorId || !supervisorType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify new supervisor exists and has correct role
    const newSupervisor = await User.findById(newSupervisorId);
    if (!newSupervisor) {
      return res.status(404).json({ message: 'New supervisor not found' });
    }

    const expectedRole = supervisorType === 'industry' ? UserRole.INDUSTRY_SUPERVISOR : UserRole.SCHOOL_SUPERVISOR;
    if (newSupervisor.role !== expectedRole) {
      return res.status(400).json({ message: 'New supervisor does not have the required role' });
    }

    // Get current assignment
    const currentAssignment = await SupervisorAssignment.findOne({
      student_id: new Types.ObjectId(studentId),
      is_active: true
    });

    if (!currentAssignment) {
      return res.status(404).json({ message: 'No active assignment found for this student' });
    }

    // Deactivate current assignment
    currentAssignment.is_active = false;
    await currentAssignment.save();

    // Create new assignment
    const newAssignment = new SupervisorAssignment({
      student_id: new Types.ObjectId(studentId),
      [supervisorType === 'industry' ? 'industry_supervisor_id' : 'school_supervisor_id']: new Types.ObjectId(newSupervisorId),
      assignment_date: new Date(),
      is_active: true
    });

    await newAssignment.save();

    // Create audit log
    await AuditLog.create({
      user_id: new Types.ObjectId(req.user.userId),
      action: 'REASSIGN_SUPERVISOR',
      target_resource: 'SupervisorAssignment',
      target_id: newAssignment._id.toString(),
      snapshot: {
        studentId,
        oldSupervisorId: supervisorType === 'industry' ? currentAssignment.industry_supervisor_id : currentAssignment.school_supervisor_id,
        newSupervisorId,
        supervisorType,
        reason
      },
      ip_address: ipAddress
    });

    // Notify new supervisor
    await Notification.create({
      user_id: new Types.ObjectId(newSupervisorId),
      type: NotificationType.ASSIGNMENT,
      title: 'New Student Assignment',
      message: `You have been assigned as ${supervisorType} supervisor for a student`,
      metadata: { student_id: studentId }
    });

    // Notify student
    const studentProfile = await StudentProfile.findById(studentId);
    if (studentProfile) {
      await Notification.create({
        user_id: studentProfile.user_id,
        type: NotificationType.ASSIGNMENT,
        title: 'Supervisor Reassigned',
        message: `Your ${supervisorType} supervisor has been reassigned`,
        metadata: { new_supervisor_id: newSupervisorId }
      });
    }

    res.status(200).json({
      message: 'Supervisor reassigned successfully',
      newAssignment
    });
  } catch (error) {
    console.error('reassignSupervisor error:', error);
    res.status(500).json({ message: 'Error reassigning supervisor' });
  }
};

export const overrideApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { logEntryId, action, reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!logEntryId || !action || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const logEntry = await LogEntry.findById(logEntryId);
    if (!logEntry) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    const originalStatus = logEntry.status;

    // Perform override action
    if (action === 'approve') {
      logEntry.status = LogStatus.APPROVED;
      logEntry.approved_at = new Date();
      logEntry.approved_by = new Types.ObjectId(req.user.userId);
    } else if (action === 'reject') {
      logEntry.status = LogStatus.REJECTED;
      logEntry.rejection_reason = `Coordinator override: ${reason}`;
    } else if (action === 'reset_to_draft') {
      logEntry.status = LogStatus.DRAFT;
      logEntry.submitted_at = undefined;
      logEntry.approved_at = undefined;
      logEntry.approved_by = undefined;
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await logEntry.save();

    // Create audit log
    await AuditLog.create({
      user_id: new Types.ObjectId(req.user.userId),
      action: 'OVERRIDE_APPROVAL',
      target_resource: 'LogEntry',
      target_id: logEntryId,
      snapshot: {
        originalStatus,
        newStatus: logEntry.status,
        reason
      },
      ip_address: ipAddress
    });

    // Notify student
    const studentProfile = await StudentProfile.findById(logEntry.student_id);
    if (studentProfile) {
      await Notification.create({
        user_id: studentProfile.user_id,
        type: NotificationType.FEEDBACK,
        title: `Log Entry ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Reset'}`,
        message: `A coordinator has ${action}d your log entry. Reason: ${reason}`,
        metadata: { log_entry_id: logEntryId }
      });
    }

    // Notify original supervisor if different
    if (logEntry.approved_by && logEntry.approved_by.toString() !== req.user.userId) {
      await Notification.create({
        user_id: logEntry.approved_by,
        type: NotificationType.SYSTEM,
        title: 'Approval Override',
        message: `A coordinator has overridden your approval decision for a log entry`,
        metadata: { log_entry_id: logEntryId }
      });
    }

    res.status(200).json({
      message: `Log entry ${action}d successfully`,
      logEntry
    });
  } catch (error) {
    console.error('overrideApproval error:', error);
    res.status(500).json({ message: 'Error overriding approval' });
  }
};

export const exportITFData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { format = 'json', period = 'academic_year' } = req.query;

    // Calculate date range based on period
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'academic_year') {
      // Assuming academic year starts in September
      const currentYear = now.getFullYear();
      if (now.getMonth() >= 8) { // September or later
        startDate = new Date(currentYear, 8, 1); // September 1st
        endDate = new Date(currentYear + 1, 7, 31); // July 31st next year
      } else {
        startDate = new Date(currentYear - 1, 8, 1); // September 1st previous year
        endDate = new Date(currentYear, 7, 31); // July 31st current year
      }
    } else {
      const days = Number(period);
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    // Get comprehensive data for export
    const exportData = await StudentProfile.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: 'establishment_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $lookup: {
          from: 'logentries',
          localField: '_id',
          foreignField: 'student_id',
          as: 'logs'
        }
      },
      {
        $lookup: {
          from: 'supervisorassignments',
          localField: '_id',
          foreignField: 'student_id',
          as: 'assignments'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignments.industry_supervisor_id',
          foreignField: '_id',
          as: 'industrySupervisors'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignments.school_supervisor_id',
          foreignField: '_id',
          as: 'schoolSupervisors'
        }
      },
      {
        $project: {
          studentInfo: {
            matriculation_number: 1,
            first_name: { $arrayElemAt: ['$user.first_name', 0] },
            last_name: { $arrayElemAt: ['$user.last_name', 0] },
            email: { $arrayElemAt: ['$user.email', 0] },
            department: 1,
            program_level: 1
          },
          establishment: {
            $arrayElemAt: ['$establishment', 0]
          },
          supervisors: {
            industry: { $arrayElemAt: ['$industrySupervisors', 0] },
            school: { $arrayElemAt: ['$schoolSupervisors', 0] }
          },
          logStatistics: {
            totalEntries: { $size: '$logs' },
            approvedEntries: {
              $size: {
                $filter: {
                  input: '$logs',
                  cond: { $eq: ['$$this.status', LogStatus.APPROVED] }
                }
              }
            },
            totalHours: {
              $sum: {
                $filter: {
                  input: '$logs',
                  cond: { $eq: ['$$this.status', LogStatus.APPROVED] }
                }
              }
            },
            firstSubmission: { $min: '$logs.submitted_at' },
            lastSubmission: { $max: '$logs.submitted_at' }
          },
          exportMetadata: {
            exportDate: new Date(),
            period,
            dateRange: { startDate, endDate }
          }
        }
      }
    ]);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Matriculation Number,First Name,Last Name,Email,Department,Program Level,Establishment,Industry Supervisor,School Supervisor,Total Entries,Approved Entries,Total Hours,First Submission,Last Submission\n';
      const csvData = exportData.map(student => {
        const s = student.studentInfo;
        const e = student.establishment;
        const sup = student.supervisors;
        const stats = student.logStatistics;
        
        return [
          s.matriculation_number || '',
          s.first_name || '',
          s.last_name || '',
          s.email || '',
          s.department || '',
          s.program_level || '',
          e?.name || '',
          `${sup.industry?.first_name || ''} ${sup.industry?.last_name || ''}`.trim(),
          `${sup.school?.first_name || ''} ${sup.school?.last_name || ''}`.trim(),
          stats.totalEntries,
          stats.approvedEntries,
          stats.totalHours || 0,
          stats.firstSubmission ? new Date(stats.firstSubmission).toISOString().split('T')[0] : '',
          stats.lastSubmission ? new Date(stats.lastSubmission).toISOString().split('T')[0] : ''
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="siwes-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvHeader + csvData);
    } else {
      // Return JSON format
      res.status(200).json({
        metadata: {
          exportDate: new Date(),
          period,
          dateRange: { startDate, endDate },
          totalStudents: exportData.length
        },
        students: exportData
      });
    }
  } catch (error) {
    console.error('exportITFData error:', error);
    res.status(500).json({ message: 'Error exporting ITF data' });
  }
};
