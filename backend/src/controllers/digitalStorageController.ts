import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { DigitalStorageService } from '../services/digitalStorageService';
import { DigitalRecord, RecordType } from '../models/DigitalRecord';
import { Types } from 'mongoose';

export const storeDigitalRecord = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const {
      recordType,
      originalId,
      content,
      metadata
    } = req.body;

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const record = await DigitalStorageService.storeRecord(
      recordType,
      new Types.ObjectId(originalId),
      content,
      {
        ...metadata,
        createdBy: new Types.ObjectId(req.user.userId)
      },
      ipAddress,
      userAgent
    );

    res.status(201).json({
      message: 'Digital record stored successfully',
      record
    });
  } catch (error: any) {
    console.error('storeDigitalRecord error:', error);
    res.status(500).json({ message: error.message || 'Error storing digital record' });
  }
};

export const retrieveDigitalRecord = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { recordId } = req.params;
    const { purpose } = req.query;

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    const result = await DigitalStorageService.retrieveRecord(
      recordId,
      new Types.ObjectId(req.user.userId),
      ipAddress,
      (purpose as string) || 'General access'
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('retrieveDigitalRecord error:', error);
    res.status(500).json({ message: error.message || 'Error retrieving digital record' });
  }
};

export const searchDigitalRecords = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const {
      studentName,
      matriculationNumber,
      institution,
      recordType,
      dateRange,
      tags,
      skills,
      supervisor,
      accessLevel,
      page = 1,
      limit = 20
    } = req.query;

    const searchQuery: any = {};
    
    if (studentName) searchQuery.studentName = studentName;
    if (matriculationNumber) searchQuery.matriculationNumber = matriculationNumber;
    if (institution) searchQuery.institution = institution;
    if (recordType) searchQuery.recordType = recordType;
    if (dateRange) searchQuery.dateRange = JSON.parse(dateRange as string);
    if (tags) searchQuery.tags = (tags as string).split(',');
    if (skills) searchQuery.skills = (skills as string).split(',');
    if (supervisor) searchQuery.supervisor = supervisor;
    if (accessLevel) searchQuery.accessLevel = accessLevel;

    const result = await DigitalStorageService.searchRecords(
      searchQuery,
      new Types.ObjectId(req.user.userId),
      Number(page),
      Number(limit)
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('searchDigitalRecords error:', error);
    res.status(500).json({ message: error.message || 'Error searching digital records' });
  }
};

export const getSkillsAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { dateRange, institutionId, state } = req.query;

    const filters: any = {};
    
    if (dateRange) {
      const { start, end } = JSON.parse(dateRange as string);
      filters.dateRange = { start: new Date(start), end: new Date(end) };
    }
    
    if (institutionId) {
      filters.institutionId = new Types.ObjectId(institutionId as string);
    }
    
    if (state) {
      filters.state = state;
    }

    const analytics = await DigitalStorageService.getSkillsAnalytics(filters);

    res.status(200).json(analytics);
  } catch (error: any) {
    console.error('getSkillsAnalytics error:', error);
    res.status(500).json({ message: error.message || 'Error fetching skills analytics' });
  }
};

export const getCompanyRatings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { dateRange, state } = req.query;

    const filters: any = {};
    
    if (dateRange) {
      const { start, end } = JSON.parse(dateRange as string);
      filters.dateRange = { start: new Date(start), end: new Date(end) };
    }
    
    if (state) {
      filters.state = state;
    }

    const ratings = await DigitalStorageService.getCompanyRatings(filters);

    res.status(200).json(ratings);
  } catch (error: any) {
    console.error('getCompanyRatings error:', error);
    res.status(500).json({ message: error.message || 'Error fetching company ratings' });
  }
};

export const getStudentOutcomes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { graduationYear, institutionId } = req.query;

    const filters: any = {};
    
    if (graduationYear) {
      filters.graduationYear = Number(graduationYear);
    }
    
    if (institutionId) {
      filters.institutionId = new Types.ObjectId(institutionId as string);
    }

    const outcomes = await DigitalStorageService.getStudentOutcomes(filters);

    res.status(200).json(outcomes);
  } catch (error: any) {
    console.error('getStudentOutcomes error:', error);
    res.status(500).json({ message: error.message || 'Error fetching student outcomes' });
  }
};

export const exportData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { format, filters } = req.body;

    const result = await DigitalStorageService.exportData(
      format,
      filters,
      new Types.ObjectId(req.user.userId)
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } else {
      res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('exportData error:', error);
    res.status(500).json({ message: error.message || 'Error exporting data' });
  }
};

export const implementRetentionPolicy = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const result = await DigitalStorageService.implementRetentionPolicy();

    res.status(200).json({
      message: 'Retention policy implemented successfully',
      ...result
    });
  } catch (error: any) {
    console.error('implementRetentionPolicy error:', error);
    res.status(500).json({ message: error.message || 'Error implementing retention policy' });
  }
};

export const verifyDataIntegrity = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const result = await DigitalStorageService.verifyDataIntegrity();

    res.status(200).json({
      message: 'Data integrity verification completed',
      ...result
    });
  } catch (error: any) {
    console.error('verifyDataIntegrity error:', error);
    res.status(500).json({ message: error.message || 'Error verifying data integrity' });
  }
};

export const getRecordAuditTrail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const { recordId } = req.params;

    const record = await DigitalRecord.findOne({ record_id: recordId })
      .populate('audit_trail.user_id', 'first_name last_name email')
      .populate('access_log.user_id', 'first_name last_name email');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check access permissions
    // In a real implementation, this would check user roles and permissions
    const hasAccess = true; // Simplified for now

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({
      record: record.toObject(),
      auditTrail: record.audit_trail,
      accessLog: record.access_log,
      integrityVerification: record.integrity_verification,
      backupStatus: record.backup_status
    });
  } catch (error: any) {
    console.error('getRecordAuditTrail error:', error);
    res.status(500).json({ message: error.message || 'Error fetching audit trail' });
  }
};

export const getStorageStatistics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Get storage statistics
    const totalRecords = await DigitalRecord.countDocuments();
    const activeRecords = await DigitalRecord.countDocuments({ status: 'active' });
    const archivedRecords = await DigitalRecord.countDocuments({ status: 'archived' });

    // Records by type
    const recordsByType = await DigitalRecord.aggregate([
      {
        $group: {
          _id: '$record_type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Storage by institution
    const storageByInstitution = await DigitalRecord.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$institution_id',
          recordCount: { $sum: 1 },
          totalSize: { $sum: '$metadata.file_size' }
        }
      },
      {
        $lookup: {
          from: 'establishments',
          localField: '_id',
          foreignField: '_id',
          as: 'establishment'
        }
      },
      {
        $project: {
          establishment: { $arrayElemAt: ['$establishment', 0] },
          recordCount: 1,
          totalSize: 1
        }
      },
      { $sort: { recordCount: -1 } }
    ]);

    // Backup status
    const backupStatus = await DigitalRecord.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          primaryBackup: { $sum: { $cond: ['$backup_status.primary', 1, 0] } },
          secondaryBackup: { $sum: { $cond: ['$backup_status.secondary', 1, 0] } },
          tertiaryBackup: { $sum: { $cond: ['$backup_status.tertiary', 1, 0] } }
        }
      }
    ]);

    // Integrity verification status
    const integrityStatus = await DigitalRecord.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          validRecords: { $sum: { $cond: ['$integrity_verification.is_valid', 1, 0] } },
          invalidRecords: { $sum: { $cond: ['$integrity_verification.is_valid', false, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      overview: {
        totalRecords,
        activeRecords,
        archivedRecords,
        archivedPercentage: totalRecords > 0 ? (archivedRecords / totalRecords) * 100 : 0
      },
      recordsByType,
      storageByInstitution,
      backupStatus: backupStatus[0] || { totalRecords: 0, primaryBackup: 0, secondaryBackup: 0, tertiaryBackup: 0 },
      integrityStatus: integrityStatus[0] || { totalRecords: 0, validRecords: 0, invalidRecords: 0 }
    });
  } catch (error: any) {
    console.error('getStorageStatistics error:', error);
    res.status(500).json({ message: error.message || 'Error fetching storage statistics' });
  }
};
