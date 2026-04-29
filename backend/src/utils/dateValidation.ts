import { Types } from 'mongoose';
import { LogEntry, LogStatus } from '../models/LogEntry';
import { StudentProfile } from '../models/StudentProfile';

export class DateValidation {
  /**
   * Validates if a student can create an entry for a specific date
   */
  static async validateEntryDate(studentId: string, entryDate: Date): Promise<{
    isValid: boolean;
    requiresBackdatingApproval: boolean;
    reason?: string;
    daysPast?: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);

    // Cannot create future entries
    if (entryDate > today) {
      return {
        isValid: false,
        requiresBackdatingApproval: false,
        reason: 'Cannot create entries for future dates'
      };
    }

    // Check if it's today (always allowed)
    const isToday = entryDate.getTime() === today.getTime();
    if (isToday) {
      return {
        isValid: true,
        requiresBackdatingApproval: false
      };
    }

    // Calculate days past
    const daysPast = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if SIWES period has ended
    const studentProfile = await StudentProfile.findById(studentId);
    if (studentProfile?.end_date && entryDate > studentProfile.end_date) {
      return {
        isValid: false,
        requiresBackdatingApproval: false,
        reason: 'Entry date is after SIWES end date'
      };
    }

    // Backdating rules
    if (daysPast > 7) {
      return {
        isValid: false,
        requiresBackdatingApproval: true,
        reason: 'Entries older than 7 days require coordinator approval',
        daysPast
      };
    }

    if (daysPast > 0) {
      return {
        isValid: true,
        requiresBackdatingApproval: false,
        reason: `Backdating by ${daysPast} days`
      };
    }

    return {
      isValid: true,
      requiresBackdatingApproval: false
    };
  }

  /**
   * Checks if student already has an entry for the given date
   */
  static async checkExistingEntry(studentId: string, entryDate: Date): Promise<{
    exists: boolean;
    entry?: any;
    canEdit: boolean;
  }> {
    const startOfDay = new Date(entryDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(entryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingEntry = await LogEntry.findOne({
      student_id: new Types.ObjectId(studentId),
      entry_date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!existingEntry) {
      return { exists: false, canEdit: true };
    }

    const canEdit = existingEntry.status === LogStatus.DRAFT || 
                   existingEntry.status === LogStatus.NEEDS_REVISION;

    return {
      exists: true,
      entry: existingEntry,
      canEdit
    };
  }

  /**
   * Validates work hours to prevent unrealistic entries
   */
  static validateWorkHours(startTime: string, endTime: string): {
    isValid: boolean;
    reason?: string;
    totalHours?: number;
  } {
    if (!startTime || !endTime) {
      return { isValid: true }; // Optional fields
    }

    try {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
      
      let totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (totalHours < 0) totalHours += 24; // Handle overnight shifts

      // Validate reasonable work hours
      if (totalHours > 16) {
        return {
          isValid: false,
          reason: 'Work hours cannot exceed 16 hours per day',
          totalHours
        };
      }

      if (totalHours < 0.5) {
        return {
          isValid: false,
          reason: 'Work hours must be at least 30 minutes',
          totalHours
        };
      }

      return { isValid: true, totalHours };
    } catch (error) {
      return {
        isValid: false,
        reason: 'Invalid time format. Use HH:MM format.'
      };
    }
  }

  /**
   * Gets the valid date range for a student
   */
  static async getValidDateRange(studentId: string): Promise<{
    minDate: Date;
    maxDate: Date;
    backdatingLimit: Date;
    siwesEndDate?: Date;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const backdatingLimit = new Date(today);
    backdatingLimit.setDate(backdatingLimit.getDate() - 7);

    const studentProfile = await StudentProfile.findById(studentId);
    let siwesEndDate: Date | undefined;
    let minDate = backdatingLimit;

    if (studentProfile?.start_date) {
      minDate = new Date(Math.max(backdatingLimit.getTime(), studentProfile.start_date.getTime()));
    }

    if (studentProfile?.end_date) {
      siwesEndDate = studentProfile.end_date;
      today.setTime(Math.min(today.getTime(), studentProfile.end_date.getTime()));
    }

    return {
      minDate,
      maxDate: today,
      backdatingLimit,
      siwesEndDate
    };
  }

  /**
   * Checks for rapid entry creation patterns
   */
  static async checkRapidEntryPattern(studentId: string): Promise<{
    isRapid: boolean;
    recentCount: number;
    timeWindow: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentCount = await LogEntry.countDocuments({
      student_id: new Types.ObjectId(studentId),
      createdAt: { $gte: oneHourAgo }
    });

    return {
      isRapid: recentCount >= 10, // More than 10 entries in 1 hour is suspicious
      recentCount,
      timeWindow: 60 // minutes
    };
  }

  /**
   * Validates that required fields are present and not empty
   */
  static validateRequiredFields(logData: any): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      'task_title',
      'task_description',
      'skills_learned',
      'tools_used'
    ];

    const missingFields: string[] = [];

    requiredFields.forEach(field => {
      if (!logData[field] || 
          (typeof logData[field] === 'string' && logData[field].trim() === '') ||
          (Array.isArray(logData[field]) && logData[field].length === 0)) {
        missingFields.push(field);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Checks if entry date is within approved SIWES period
   */
  static async validateSIWESPeriod(studentId: string, entryDate: Date): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    const studentProfile = await StudentProfile.findById(studentId);
    
    if (!studentProfile) {
      return {
        isValid: false,
        reason: 'Student profile not found'
      };
    }

    if (studentProfile?.start_date && entryDate < studentProfile.start_date) {
      return {
        isValid: false,
        reason: 'Entry date is before SIWES start date'
      };
    }

    if (studentProfile?.end_date && entryDate > studentProfile.end_date) {
      return {
        isValid: false,
        reason: 'Entry date is after SIWES end date'
      };
    }

    return { isValid: true };
  }
}
