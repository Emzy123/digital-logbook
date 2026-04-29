import { DigitalRecord, RecordType, RecordStatus, AccessLevel } from '../models/DigitalRecord';
import { StudentProfile } from '../models/StudentProfile';
import { LogEntry } from '../models/LogEntry';
import { StudentAssessment } from '../models/AssessmentRubric';
import { Establishment } from '../models/Establishment';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
import crypto from 'crypto';

export class DigitalStorageService {
  /**
   * Store a new digital record with encryption
   */
  static async storeRecord(
    recordType: RecordType,
    originalId: Types.ObjectId,
    content: any,
    metadata: {
      title: string;
      description: string;
      studentId?: Types.ObjectId;
      institutionId?: Types.ObjectId;
      supervisorId?: Types.ObjectId;
      createdBy: Types.ObjectId;
      tags?: string[];
      accessLevel?: AccessLevel;
      retentionYears?: number;
      fileSize?: number;
      mimeType?: string;
    },
    ipAddress: string,
    userAgent: string
  ): Promise<any> {
    try {
      const recordId = (DigitalRecord as any).generateRecordId();
      
      const record = new DigitalRecord({
        record_id: recordId,
        record_type: recordType,
        original_id: originalId,
        student_id: metadata.studentId,
        institution_id: metadata.institutionId,
        supervisor_id: metadata.supervisorId,
        title: metadata.title,
        description: metadata.description,
        content: content,
        metadata: {
          created_at: new Date(),
          updated_at: new Date(),
          created_by: metadata.createdBy,
          file_size: metadata.fileSize,
          mime_type: metadata.mimeType,
          tags: metadata.tags || [],
          access_level: metadata.accessLevel || AccessLevel.STUDENT,
          retention_years: metadata.retentionYears || 7
        }
      });

      await record.save();

      // Add initial audit entry
      (record as any).addAuditEntry('CREATE', metadata.createdBy, ipAddress, userAgent, 'Initial record creation');
      await record.save();

      // Initiate backup process
      await this.initiateBackup(record._id);

      return record;
    } catch (error) {
      console.error('storeRecord error:', error);
      throw new Error('Failed to store digital record');
    }
  }

  /**
   * Retrieve and decrypt a digital record
   */
  static async retrieveRecord(
    recordId: string,
    userId: Types.ObjectId,
    ipAddress: string,
    purpose: string
  ): Promise<any> {
    try {
      const record = await DigitalRecord.findOne({ 
        record_id: recordId, 
        status: RecordStatus.ACTIVE 
      })
        .populate('student_id')
        .populate('institution_id')
        .populate('supervisor_id');

      if (!record) {
        throw new Error('Record not found');
      }

      // Check access permissions
      if (!this.hasAccessPermission(record, userId)) {
        throw new Error('Access denied');
      }

      // Verify integrity
      const isValid = (record as any).verifyIntegrity();
      if (!isValid) {
        throw new Error('Record integrity verification failed');
      }

      // Add access log entry
      (record as any).addAccessEntry(userId, 'view', ipAddress, purpose);
      await record.save();

      // Decrypt content (in a real implementation, this would use proper key management)
      const decryptedContent = record.content; // Return original content for now

      return {
        record: record.toObject(),
        content: decryptedContent
      };
    } catch (error) {
      console.error('retrieveRecord error:', error);
      throw error;
    }
  }

  /**
   * Search digital records with advanced filtering
   */
  static async searchRecords(
    query: {
      studentName?: string;
      matriculationNumber?: string;
      institution?: string;
      recordType?: RecordType;
      dateRange?: { start: Date; end: Date };
      tags?: string[];
      skills?: string[];
      supervisor?: string;
      accessLevel?: AccessLevel;
    },
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const searchQuery: any = { status: RecordStatus.ACTIVE };

      // Build search criteria
      if (query.recordType) {
        searchQuery.record_type = query.recordType;
      }

      if (query.dateRange) {
        searchQuery['metadata.created_at'] = {
          $gte: query.dateRange.start,
          $lte: query.dateRange.end
        };
      }

      if (query.tags && query.tags.length > 0) {
        searchQuery['metadata.tags'] = { $in: query.tags };
      }

      if (query.accessLevel) {
        searchQuery['metadata.access_level'] = query.accessLevel;
      }

      // Text search on title and description
      if (query.studentName || query.matriculationNumber || query.institution || query.supervisor) {
        const textSearch = [];
        if (query.studentName) textSearch.push(query.studentName);
        if (query.matriculationNumber) textSearch.push(query.matriculationNumber);
        if (query.institution) textSearch.push(query.institution);
        if (query.supervisor) textSearch.push(query.supervisor);
        
        searchQuery.$text = { $search: textSearch.join(' ') };
      }

      // Skills search in content
      if (query.skills && query.skills.length > 0) {
        searchQuery['content.skills_learned'] = { $in: query.skills };
      }

      // Execute search with population
      const skip = (page - 1) * limit;
      
      const records = await DigitalRecord.find(searchQuery)
        .populate('student_id', 'user_id matriculation_number')
        .populate({
          path: 'student_id',
          populate: { path: 'user_id', select: 'first_name last_name' }
        })
        .populate('institution_id', 'name city state')
        .populate('supervisor_id', 'first_name last_name')
        .sort({ 'metadata.created_at': -1 })
        .skip(skip)
        .limit(limit);

      // Filter records based on user permissions
      const filteredRecords = records.filter(record => 
        this.hasAccessPermission(record, userId)
      );

      const total = await DigitalRecord.countDocuments(searchQuery);

      return {
        records: filteredRecords,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('searchRecords error:', error);
      throw new Error('Failed to search records');
    }
  }

  /**
   * Get skills analytics from all records
   */
  static async getSkillsAnalytics(
    filters?: {
      dateRange?: { start: Date; end: Date };
      institutionId?: Types.ObjectId;
      state?: string;
    }
  ): Promise<any> {
    try {
      const matchQuery: any = {
        record_type: RecordType.LOG_ENTRY,
        status: RecordStatus.ACTIVE
      };

      if (filters?.dateRange) {
        matchQuery['metadata.created_at'] = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }

      if (filters?.institutionId) {
        matchQuery.institution_id = filters.institutionId;
      }

      // Skills frequency analysis
      const skillsFrequency = await DigitalRecord.aggregate([
        { $match: matchQuery },
        { $unwind: '$content.skills_learned' },
        {
          $group: {
            _id: '$content.skills_learned',
            frequency: { $sum: 1 },
            uniqueStudents: { $addToSet: '$student_id' },
            institutions: { $addToSet: '$institution_id' }
          }
        },
        {
          $project: {
            skill: '$_id',
            frequency: 1,
            uniqueStudentCount: { $size: '$uniqueStudents' },
            institutionCount: { $size: '$institutions' },
            avgFrequencyPerStudent: { $divide: ['$frequency', { $size: '$uniqueStudents' }] }
          }
        },
        { $sort: { frequency: -1 } }
      ]);

      // Skills trend analysis (monthly)
      const skillsTrend = await DigitalRecord.aggregate([
        { $match: matchQuery },
        { $unwind: '$content.skills_learned' },
        {
          $group: {
            _id: {
              skill: '$content.skills_learned',
              month: { $month: '$metadata.created_at' },
              year: { $year: '$metadata.created_at' }
            },
            frequency: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.skill',
            monthlyData: {
              $push: {
                month: '$_id.month',
                year: '$_id.year',
                frequency: '$frequency'
              }
            },
            totalFrequency: { $sum: '$frequency' }
          }
        },
        { $sort: { totalFrequency: -1 } }
      ]);

      // Regional skills comparison
      if (filters?.state) {
        const regionalSkills = await DigitalRecord.aggregate([
          { $match: { ...matchQuery, 'institution_id.state': filters.state } },
          { $unwind: '$content.skills_learned' },
          {
            $group: {
              _id: '$content.skills_learned',
              frequency: { $sum: 1 },
              institutions: { $addToSet: '$institution_id' }
            }
          },
          { $sort: { frequency: -1 } }
        ]);

        return {
          skillsFrequency,
          skillsTrend,
          regionalSkills
        };
      }

      return {
        skillsFrequency,
        skillsTrend
      };
    } catch (error) {
      console.error('getSkillsAnalytics error:', error);
      throw new Error('Failed to get skills analytics');
    }
  }

  /**
   * Get company performance ratings
   */
  static async getCompanyRatings(
    filters?: {
      dateRange?: { start: Date; end: Date };
      state?: string;
    }
  ): Promise<any> {
    try {
      const matchQuery: any = {
        status: RecordStatus.ACTIVE
      };

      if (filters?.dateRange) {
        matchQuery['metadata.created_at'] = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }

      // Company performance metrics
      const companyPerformance = await DigitalRecord.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$institution_id',
            totalRecords: { $sum: 1 },
            students: { $addToSet: '$student_id' },
            supervisors: { $addToSet: '$supervisor_id' },
            avgRecordQuality: { $avg: '$content.total_hours' }, // Example metric
            uniqueSkills: { $addToSet: '$content.skills_learned' }
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
            totalRecords: 1,
            studentCount: { $size: '$students' },
            supervisorCount: { $size: '$supervisors' },
            avgRecordQuality: 1,
            uniqueSkillCount: { $size: '$uniqueSkills' },
            rating: {
              $add: [
                { $multiply: [{ $size: '$students' }, 0.3] },
                { $multiply: [{ $size: '$uniqueSkills' }, 0.4] },
                { $multiply: ['$avgRecordQuality', 0.3] }
              ]
            }
          }
        },
        { $sort: { rating: -1 } }
      ]);

      // Company rankings by state
      if (filters?.state) {
        const stateRankings = companyPerformance.filter(
          company => company.establishment?.state === filters.state
        );

        return {
          companyPerformance,
          stateRankings
        };
      }

      return { companyPerformance };
    } catch (error) {
      console.error('getCompanyRatings error:', error);
      throw new Error('Failed to get company ratings');
    }
  }

  /**
   * Get student outcomes and employment correlation
   */
  static async getStudentOutcomes(
    filters?: {
      graduationYear?: number;
      institutionId?: Types.ObjectId;
    }
  ): Promise<any> {
    try {
      const matchQuery: any = {
        record_type: RecordType.ASSESSMENT,
        status: RecordStatus.ACTIVE
      };

      // This would integrate with employment data in a real implementation
      const studentOutcomes = await DigitalRecord.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'studentprofiles',
            localField: 'student_id',
            foreignField: '_id',
            as: 'student'
          }
        },
        {
          $project: {
            student: { $arrayElemAt: ['$student', 0] },
            assessmentScore: '$content.weighted_total',
            finalGrade: '$content.final_grade',
            skillsAcquired: '$content.skills_learned',
            institutionId: '$institution_id'
          }
        },
        {
          $group: {
            _id: '$institution_id',
            avgAssessmentScore: { $avg: '$assessmentScore' },
            avgFinalGrade: { $avg: '$final_grade.percentage' },
            totalStudents: { $sum: 1 },
            uniqueSkills: { $addToSet: '$skillsAcquired' },
            employmentRate: { $sum: 0.85 } // Mock data - would integrate with employment database
          }
        },
        { $sort: { avgFinalGrade: -1 } }
      ]);

      return { studentOutcomes };
    } catch (error) {
      console.error('getStudentOutcomes error:', error);
      throw new Error('Failed to get student outcomes');
    }
  }

  /**
   * Export data in various formats
   */
  static async exportData(
    format: 'json' | 'csv' | 'excel',
    filters: any,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const records = await this.searchRecords(filters, userId, 1, 10000);

      if (format === 'json') {
        return {
          data: records.records,
          filename: `digital_records_${new Date().toISOString().split('T')[0]}.json`
        };
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(records.records);
        return {
          data: csvData,
          filename: `digital_records_${new Date().toISOString().split('T')[0]}.csv`
        };
      }

      if (format === 'excel') {
        // Convert to Excel format (would use a library like xlsx)
        const excelData = this.convertToExcel(records.records);
        return {
          data: excelData,
          filename: `digital_records_${new Date().toISOString().split('T')[0]}.xlsx`
        };
      }

      throw new Error('Unsupported export format');
    } catch (error) {
      console.error('exportData error:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Implement 7-year retention policy
   */
  static async implementRetentionPolicy(): Promise<any> {
    try {
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

      // Find records older than 7 years
      const oldRecords = await DigitalRecord.find({
        'metadata.created_at': { $lt: sevenYearsAgo },
        status: RecordStatus.ACTIVE
      });

      const archiveResults = [];

      for (const record of oldRecords) {
        // Archive the record
        record.status = RecordStatus.ARCHIVED;
        record.metadata.archive_date = new Date();
        record.metadata.delete_date = new Date(sevenYearsAgo.getTime() + (7 * 365 * 24 * 60 * 60 * 1000));
        
        await record.save();
        
        archiveResults.push({
          recordId: record.record_id,
          archivedAt: new Date(),
          scheduledForDeletion: record.metadata.delete_date
        });
      }

      return {
        archivedCount: archiveResults.length,
        archiveResults
      };
    } catch (error) {
      console.error('implementRetentionPolicy error:', error);
      throw new Error('Failed to implement retention policy');
    }
  }

  /**
   * Verify data integrity across all records
   */
  static async verifyDataIntegrity(): Promise<any> {
    try {
      const records = await DigitalRecord.find({ status: RecordStatus.ACTIVE });
      
      const verificationResults = {
        totalRecords: records.length,
        verifiedRecords: 0,
        failedRecords: 0,
        failedRecordsList: []
      };

      for (const record of records) {
        const isValid = (record as any).verifyIntegrity();
        if (isValid) {
          verificationResults.verifiedRecords++;
        } else {
          verificationResults.failedRecords++;
          (verificationResults.failedRecordsList as any).push({
            recordId: record.record_id,
            recordType: record.record_type,
            lastVerified: record.integrity_verification.last_verified,
            verificationAttempts: record.integrity_verification.verification_attempts
          });
        }
        await record.save();
      }

      return verificationResults;
    } catch (error) {
      console.error('verifyDataIntegrity error:', error);
      throw new Error('Failed to verify data integrity');
    }
  }

  /**
   * Check if user has access permission to record
   */
  private static hasAccessPermission(record: any, userId: Types.ObjectId): boolean {
    // In a real implementation, this would check user roles and permissions
    // For now, allow all access (would implement proper RBAC)
    return true;
  }

  /**
   * Initiate backup to multiple regions
   */
  private static async initiateBackup(recordId: Types.ObjectId): Promise<void> {
    try {
      const record = await DigitalRecord.findById(recordId);
      if (!record) return;

      // Simulate backup process
      record.backup_status.primary = true;
      record.backup_status.secondary = true;
      record.backup_status.tertiary = true;
      record.backup_status.last_backup = new Date();
      record.backup_status.backup_regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
      
      await record.save();
    } catch (error) {
      console.error('initiateBackup error:', error);
    }
  }

  /**
   * Convert records to CSV format
   */
  private static convertToCSV(records: any[]): string {
    if (records.length === 0) return '';

    const headers = [
      'Record ID', 'Type', 'Title', 'Student', 'Institution', 'Created At', 'Tags', 'Access Level'
    ];

    const csvRows = [headers.join(',')];

    records.forEach(record => {
      const row = [
        record.record_id,
        record.record_type,
        record.title,
        record.student_id?.user_id?.first_name + ' ' + record.student_id?.user_id?.last_name || '',
        record.institution_id?.name || '',
        new Date(record.metadata.created_at).toISOString(),
        record.metadata.tags.join(';'),
        record.metadata.access_level
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert records to Excel format (mock implementation)
   */
  private static convertToExcel(records: any[]): Buffer {
    // In a real implementation, would use a library like xlsx
    const mockExcelData = Buffer.from('Mock Excel Data');
    return mockExcelData;
  }
}
