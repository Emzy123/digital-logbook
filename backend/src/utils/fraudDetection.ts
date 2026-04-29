import { LogEntry } from '../models/LogEntry';
import { FraudDetection, FraudType, FraudSeverity } from '../models/FraudDetection';
import { StudentProfile } from '../models/StudentProfile';
import { Types } from 'mongoose';

export class FraudDetectionEngine {
  static async analyzeLogEntry(logEntry: any, studentId: string): Promise<{
    fraudFlags: any;
    riskScore: number;
    detectedFrauds: any[];
  }> {
    const fraudFlags = {
      rapid_submission: false,
      identical_description: false,
      unusual_hours: false,
      missing_evidence: false,
      suspicious_pattern: false,
      risk_score: 0
    };

    const detectedFrauds: any[] = [];

    // 1. Check for rapid submissions (50 entries in 1 hour)
    const rapidSubmission = await this.checkRapidSubmission(studentId);
    if (rapidSubmission.detected) {
      fraudFlags.rapid_submission = true;
      detectedFrauds.push(rapidSubmission);
    }

    // 2. Check for identical descriptions across dates
    const identicalDesc = await this.checkIdenticalDescriptions(studentId, logEntry.task_description);
    if (identicalDesc.detected) {
      fraudFlags.identical_description = true;
      detectedFrauds.push(identicalDesc);
    }

    // 3. Check for unusual hours (24-hour work day, overnight shifts)
    const unusualHours = await this.checkUnusualHours(logEntry);
    if (unusualHours.detected) {
      fraudFlags.unusual_hours = true;
      detectedFrauds.push(unusualHours);
    }

    // 4. Check for missing evidence for technical tasks
    const missingEvidence = await this.checkMissingEvidence(logEntry);
    if (missingEvidence.detected) {
      fraudFlags.missing_evidence = true;
      detectedFrauds.push(missingEvidence);
    }

    // 5. Check for suspicious patterns
    const suspiciousPattern = await this.checkSuspiciousPatterns(studentId, logEntry);
    if (suspiciousPattern.detected) {
      fraudFlags.suspicious_pattern = true;
      detectedFrauds.push(suspiciousPattern);
    }

    // Calculate overall risk score
    fraudFlags.risk_score = this.calculateRiskScore(detectedFrauds);

    return { fraudFlags, riskScore: fraudFlags.risk_score, detectedFrauds };
  }

  private static async checkRapidSubmission(studentId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentSubmissions = await LogEntry.countDocuments({
      student_id: new Types.ObjectId(studentId),
      submitted_at: { $gte: oneHourAgo }
    });

    if (recentSubmissions >= 50) {
      return {
        detected: true,
        type: FraudType.RAPID_SUBMISSION,
        severity: FraudSeverity.HIGH,
        description: `Student submitted ${recentSubmissions} log entries in the last hour`
      };
    }

    return { detected: false };
  }

  private static async checkIdenticalDescriptions(studentId: string, currentDescription: string) {
    const similarEntries = await LogEntry.find({
      student_id: new Types.ObjectId(studentId),
      task_description: { $regex: currentDescription, $options: 'i' },
      status: { $ne: 'draft' }
    }).limit(5);

    if (similarEntries.length >= 3) {
      return {
        detected: true,
        type: FraudType.IDENTICAL_DESCRIPTIONS,
        severity: FraudSeverity.MEDIUM,
        description: `Found ${similarEntries.length} entries with similar descriptions`
      };
    }

    return { detected: false };
  }

  private static async checkUnusualHours(logEntry: any) {
    if (!logEntry.start_time || !logEntry.end_time) {
      return { detected: false };
    }

    const start = new Date(`1970-01-01T${logEntry.start_time}:00`);
    const end = new Date(`1970-01-01T${logEntry.end_time}:00`);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hours < 0) hours += 24;

    // Check for 24-hour work day
    if (hours >= 22) {
      return {
        detected: true,
        type: FraudType.UNUSUAL_HOURS,
        severity: FraudSeverity.HIGH,
        description: `Entry shows ${hours.toFixed(1)} hours of work`
      };
    }

    // Check for overnight shifts (unusual for many industries)
    const startHour = start.getHours();
    const endHour = end.getHours();
    
    if (startHour >= 22 || startHour <= 5 || endHour >= 22 || endHour <= 5) {
      return {
        detected: true,
        type: FraudType.UNUSUAL_HOURS,
        severity: FraudSeverity.MEDIUM,
        description: `Entry includes overnight work hours (${startHour}:00 - ${endHour}:00)`
      };
    }

    return { detected: false };
  }

  private static async checkMissingEvidence(logEntry: any) {
    const technicalKeywords = [
      'code', 'programming', 'development', 'software', 'database',
      'network', 'server', 'system', 'application', 'testing',
      'debugging', 'deployment', 'configuration', 'installation'
    ];

    const hasTechnicalTask = technicalKeywords.some(keyword => 
      logEntry.task_description.toLowerCase().includes(keyword) ||
      logEntry.task_title.toLowerCase().includes(keyword)
    );

    const hasAttachments = logEntry.attachments && logEntry.attachments.length > 0;

    if (hasTechnicalTask && !hasAttachments) {
      return {
        detected: true,
        type: FraudType.MISSING_EVIDENCE,
        severity: FraudSeverity.MEDIUM,
        description: 'Technical task submitted without supporting evidence'
      };
    }

    return { detected: false };
  }

  private static async checkSuspiciousPatterns(studentId: string, logEntry: any) {
    const studentProfile = await StudentProfile.findById(studentId).populate('establishment_id');
    
    if (!studentProfile || !studentProfile.establishment_id) {
      return { detected: false };
    }

    // Check if entry was submitted after normal business hours
    const submissionTime = new Date(logEntry.submitted_at || logEntry.createdAt);
    const hour = submissionTime.getHours();
    
    // Normal business hours: 8 AM - 6 PM
    if (hour < 8 || hour > 18) {
      return {
        detected: true,
        type: FraudType.SUSPICIOUS_PATTERN,
        severity: FraudSeverity.LOW,
        description: `Log entry submitted at ${hour}:00 (outside business hours)`
      };
    }

    // Check for weekend submissions without explanation
    const dayOfWeek = submissionTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
      const weekendEntries = await LogEntry.countDocuments({
        student_id: new Types.ObjectId(studentId),
        entry_date: {
          $gte: new Date(submissionTime.getTime() - 7 * 24 * 60 * 60 * 1000)
        },
        status: { $ne: 'draft' }
      });

      if (weekendEntries >= 2) {
        return {
          detected: true,
          type: FraudType.SUSPICIOUS_PATTERN,
          severity: FraudSeverity.LOW,
          description: 'Multiple weekend entries detected'
        };
      }
    }

    return { detected: false };
  }

  private static calculateRiskScore(detectedFrauds: any[]): number {
    let score = 0;
    
    detectedFrauds.forEach(fraud => {
      switch (fraud.severity) {
        case FraudSeverity.CRITICAL:
          score += 40;
          break;
        case FraudSeverity.HIGH:
          score += 25;
          break;
        case FraudSeverity.MEDIUM:
          score += 15;
          break;
        case FraudSeverity.LOW:
          score += 5;
          break;
      }
    });

    return Math.min(score, 100); // Cap at 100
  }

  static async createFraudDetectionRecord(
    studentId: string,
    logEntryId: string,
    fraudType: FraudType,
    severity: FraudSeverity,
    description: string,
    metadata?: any
  ) {
    return await FraudDetection.create({
      student_id: new Types.ObjectId(studentId),
      log_entry_id: new Types.ObjectId(logEntryId),
      fraud_type: fraudType,
      severity,
      description,
      metadata
    });
  }

  static async checkSupervisorApprovalAnomalies(supervisorId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentApprovals = await LogEntry.countDocuments({
      approved_by: new Types.ObjectId(supervisorId),
      approved_at: { $gte: oneHourAgo }
    });

    if (recentApprovals >= 30) {
      return await this.createFraudDetectionRecord(
        '', // Student ID not applicable for supervisor anomalies
        '',
        FraudType.SUPERVISOR_ANOMALY,
        FraudSeverity.HIGH,
        `Supervisor approved ${recentApprovals} entries in the last hour`,
        { supervisor_id: supervisorId, approval_count: recentApprovals }
      );
    }

    return null;
  }
}
