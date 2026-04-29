"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionEngine = void 0;
const LogEntry_1 = require("../models/LogEntry");
const FraudDetection_1 = require("../models/FraudDetection");
const StudentProfile_1 = require("../models/StudentProfile");
const mongoose_1 = require("mongoose");
class FraudDetectionEngine {
    static async analyzeLogEntry(logEntry, studentId) {
        const fraudFlags = {
            rapid_submission: false,
            identical_description: false,
            unusual_hours: false,
            missing_evidence: false,
            suspicious_pattern: false,
            risk_score: 0
        };
        const detectedFrauds = [];
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
    static async checkRapidSubmission(studentId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentSubmissions = await LogEntry_1.LogEntry.countDocuments({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            submitted_at: { $gte: oneHourAgo }
        });
        if (recentSubmissions >= 50) {
            return {
                detected: true,
                type: FraudDetection_1.FraudType.RAPID_SUBMISSION,
                severity: FraudDetection_1.FraudSeverity.HIGH,
                description: `Student submitted ${recentSubmissions} log entries in the last hour`
            };
        }
        return { detected: false };
    }
    static async checkIdenticalDescriptions(studentId, currentDescription) {
        const similarEntries = await LogEntry_1.LogEntry.find({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            task_description: { $regex: currentDescription, $options: 'i' },
            status: { $ne: 'draft' }
        }).limit(5);
        if (similarEntries.length >= 3) {
            return {
                detected: true,
                type: FraudDetection_1.FraudType.IDENTICAL_DESCRIPTIONS,
                severity: FraudDetection_1.FraudSeverity.MEDIUM,
                description: `Found ${similarEntries.length} entries with similar descriptions`
            };
        }
        return { detected: false };
    }
    static async checkUnusualHours(logEntry) {
        if (!logEntry.start_time || !logEntry.end_time) {
            return { detected: false };
        }
        const start = new Date(`1970-01-01T${logEntry.start_time}:00`);
        const end = new Date(`1970-01-01T${logEntry.end_time}:00`);
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (hours < 0)
            hours += 24;
        // Check for 24-hour work day
        if (hours >= 22) {
            return {
                detected: true,
                type: FraudDetection_1.FraudType.UNUSUAL_HOURS,
                severity: FraudDetection_1.FraudSeverity.HIGH,
                description: `Entry shows ${hours.toFixed(1)} hours of work`
            };
        }
        // Check for overnight shifts (unusual for many industries)
        const startHour = start.getHours();
        const endHour = end.getHours();
        if (startHour >= 22 || startHour <= 5 || endHour >= 22 || endHour <= 5) {
            return {
                detected: true,
                type: FraudDetection_1.FraudType.UNUSUAL_HOURS,
                severity: FraudDetection_1.FraudSeverity.MEDIUM,
                description: `Entry includes overnight work hours (${startHour}:00 - ${endHour}:00)`
            };
        }
        return { detected: false };
    }
    static async checkMissingEvidence(logEntry) {
        const technicalKeywords = [
            'code', 'programming', 'development', 'software', 'database',
            'network', 'server', 'system', 'application', 'testing',
            'debugging', 'deployment', 'configuration', 'installation'
        ];
        const hasTechnicalTask = technicalKeywords.some(keyword => logEntry.task_description.toLowerCase().includes(keyword) ||
            logEntry.task_title.toLowerCase().includes(keyword));
        const hasAttachments = logEntry.attachments && logEntry.attachments.length > 0;
        if (hasTechnicalTask && !hasAttachments) {
            return {
                detected: true,
                type: FraudDetection_1.FraudType.MISSING_EVIDENCE,
                severity: FraudDetection_1.FraudSeverity.MEDIUM,
                description: 'Technical task submitted without supporting evidence'
            };
        }
        return { detected: false };
    }
    static async checkSuspiciousPatterns(studentId, logEntry) {
        const studentProfile = await StudentProfile_1.StudentProfile.findById(studentId).populate('establishment_id');
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
                type: FraudDetection_1.FraudType.SUSPICIOUS_PATTERN,
                severity: FraudDetection_1.FraudSeverity.LOW,
                description: `Log entry submitted at ${hour}:00 (outside business hours)`
            };
        }
        // Check for weekend submissions without explanation
        const dayOfWeek = submissionTime.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
            const weekendEntries = await LogEntry_1.LogEntry.countDocuments({
                student_id: new mongoose_1.Types.ObjectId(studentId),
                entry_date: {
                    $gte: new Date(submissionTime.getTime() - 7 * 24 * 60 * 60 * 1000)
                },
                status: { $ne: 'draft' }
            });
            if (weekendEntries >= 2) {
                return {
                    detected: true,
                    type: FraudDetection_1.FraudType.SUSPICIOUS_PATTERN,
                    severity: FraudDetection_1.FraudSeverity.LOW,
                    description: 'Multiple weekend entries detected'
                };
            }
        }
        return { detected: false };
    }
    static calculateRiskScore(detectedFrauds) {
        let score = 0;
        detectedFrauds.forEach(fraud => {
            switch (fraud.severity) {
                case FraudDetection_1.FraudSeverity.CRITICAL:
                    score += 40;
                    break;
                case FraudDetection_1.FraudSeverity.HIGH:
                    score += 25;
                    break;
                case FraudDetection_1.FraudSeverity.MEDIUM:
                    score += 15;
                    break;
                case FraudDetection_1.FraudSeverity.LOW:
                    score += 5;
                    break;
            }
        });
        return Math.min(score, 100); // Cap at 100
    }
    static async createFraudDetectionRecord(studentId, logEntryId, fraudType, severity, description, metadata) {
        return await FraudDetection_1.FraudDetection.create({
            student_id: new mongoose_1.Types.ObjectId(studentId),
            log_entry_id: new mongoose_1.Types.ObjectId(logEntryId),
            fraud_type: fraudType,
            severity,
            description,
            metadata
        });
    }
    static async checkSupervisorApprovalAnomalies(supervisorId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentApprovals = await LogEntry_1.LogEntry.countDocuments({
            approved_by: new mongoose_1.Types.ObjectId(supervisorId),
            approved_at: { $gte: oneHourAgo }
        });
        if (recentApprovals >= 30) {
            return await this.createFraudDetectionRecord('', // Student ID not applicable for supervisor anomalies
            '', FraudDetection_1.FraudType.SUPERVISOR_ANOMALY, FraudDetection_1.FraudSeverity.HIGH, `Supervisor approved ${recentApprovals} entries in the last hour`, { supervisor_id: supervisorId, approval_count: recentApprovals });
        }
        return null;
    }
}
exports.FraudDetectionEngine = FraudDetectionEngine;
