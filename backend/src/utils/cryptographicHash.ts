import crypto from 'crypto';
import { Types } from 'mongoose';
import { LogEntry } from '../models/LogEntry';

export class CryptographicHash {
  /**
   * Creates a SHA-256 hash of the log entry data
   */
  static createHash(logEntryData: any): string {
    const hashData = {
      student_id: logEntryData.student_id?.toString(),
      entry_date: logEntryData.entry_date,
      start_time: logEntryData.start_time,
      end_time: logEntryData.end_time,
      task_title: logEntryData.task_title,
      task_description: logEntryData.task_description,
      skills_learned: logEntryData.skills_learned,
      tools_used: logEntryData.tools_used,
      challenges_faced: logEntryData.challenges_faced,
      attachments: logEntryData.attachments?.map((att: any) => ({
        filename: att.filename,
        size: att.size,
        mime_type: att.mime_type
      }))
    };

    const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Creates a blockchain-like hash chain by including the previous entry's hash
   */
  static createChainedHash(currentEntryData: any, previousHash?: string): string {
    const hashData = {
      entry: this.createHash(currentEntryData),
      previous_hash: previousHash || '0'
    };

    return crypto.createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
  }

  /**
   * Verifies the integrity of a log entry
   */
  static async verifyEntryIntegrity(logEntryId: string): Promise<boolean> {
    try {
      const logEntry = await LogEntry.findById(logEntryId);
      if (!logEntry || !logEntry.blockchain_hash) {
        return false;
      }

      // Recalculate the hash
      const calculatedHash = this.createHash(logEntry.toObject());
      
      return calculatedHash === logEntry.blockchain_hash;
    } catch (error) {
      console.error('Error verifying entry integrity:', error);
      return false;
    }
  }

  /**
   * Verifies the entire hash chain for a student's entries
   */
  static async verifyStudentHashChain(studentId: string): Promise<{
    isValid: boolean;
    brokenAt?: Date;
    issues: string[];
  }> {
    try {
      const entries = await LogEntry.find({
        student_id: new Types.ObjectId(studentId),
        blockchain_hash: { $exists: true }
      }).sort({ entry_date: 1 });

      const issues: string[] = [];
      let isValid = true;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const previousHash = i > 0 ? entries[i - 1].blockchain_hash : '0';
        
        // Verify current entry hash
        const calculatedHash = this.createChainedHash(entry.toObject(), previousHash);
        
        if (calculatedHash !== entry.blockchain_hash) {
          isValid = false;
          issues.push(`Hash mismatch for entry on ${entry.entry_date.toISOString().split('T')[0]}`);
          if (!issues.some(issue => issue.includes('broken at'))) {
            issues.push(`Chain broken at: ${entry.entry_date.toISOString().split('T')[0]}`);
          }
        }
      }

      return { isValid, issues };
    } catch (error) {
      console.error('Error verifying hash chain:', error);
      return { 
        isValid: false, 
        issues: ['Error verifying hash chain'],
        brokenAt: new Date()
      };
    }
  }

  /**
   * Makes an entry immutable by setting the blockchain hash
   */
  static async makeImmutable(logEntryId: string): Promise<string> {
    try {
      const logEntry = await LogEntry.findById(logEntryId);
      if (!logEntry) {
        throw new Error('Log entry not found');
      }

      // Get the previous entry's hash
      const previousEntry = await LogEntry.findOne({
        student_id: logEntry.student_id,
        entry_date: { $lt: logEntry.entry_date },
        blockchain_hash: { $exists: true }
      }).sort({ entry_date: -1 });

      const previousHash = previousEntry?.blockchain_hash || '0';
      
      // Create the chained hash
      const blockchainHash = this.createChainedHash(logEntry.toObject(), previousHash);
      
      // Update the entry
      await LogEntry.findByIdAndUpdate(logEntryId, {
        blockchain_hash: blockchainHash,
        previous_entry_hash: previousHash,
        is_immutable: true
      });

      return blockchainHash;
    } catch (error) {
      console.error('Error making entry immutable:', error);
      throw error;
    }
  }

  /**
   * Creates a digital signature for supervisor approval
   */
  static createSupervisorSignature(
    supervisorId: string, 
    logEntryId: string, 
    timestamp: Date
  ): string {
    const signatureData = {
      supervisor_id: supervisorId,
      log_entry_id: logEntryId,
      timestamp: timestamp.toISOString(),
      action: 'approve'
    };

    return crypto.createHash('sha256').update(JSON.stringify(signatureData)).digest('hex');
  }

  /**
   * Verifies supervisor signature
   */
  static verifySupervisorSignature(
    signature: string,
    supervisorId: string,
    logEntryId: string,
    timestamp: Date
  ): boolean {
    const expectedSignature = this.createSupervisorSignature(supervisorId, logEntryId, timestamp);
    return signature === expectedSignature;
  }
}
