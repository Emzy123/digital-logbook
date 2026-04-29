import mongoose, { Document, Schema } from 'mongoose';

export enum FraudType {
  RAPID_SUBMISSION = 'rapid_submission',
  IDENTICAL_DESCRIPTIONS = 'identical_descriptions',
  UNUSUAL_HOURS = 'unusual_hours',
  MISSING_EVIDENCE = 'missing_evidence',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  SUPERVISOR_ANOMALY = 'supervisor_anomaly'
}

export enum FraudSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface IFraudDetection extends Document {
  student_id: mongoose.Types.ObjectId;
  log_entry_id?: mongoose.Types.ObjectId;
  fraud_type: FraudType;
  severity: FraudSeverity;
  description: string;
  detected_at: Date;
  resolved: boolean;
  resolved_by?: mongoose.Types.ObjectId;
  resolved_at?: Date;
  resolution_notes?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const FraudDetectionSchema = new Schema<IFraudDetection>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  log_entry_id: { type: Schema.Types.ObjectId, ref: 'LogEntry', index: true },
  fraud_type: {
    type: String,
    enum: Object.values(FraudType),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(FraudSeverity),
    required: true,
    index: true
  },
  description: { type: String, required: true },
  detected_at: { type: Date, default: Date.now, index: true },
  resolved: { type: Boolean, default: false, index: true },
  resolved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  resolved_at: { type: Date },
  resolution_notes: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Index for efficient fraud detection queries
FraudDetectionSchema.index({ student_id: 1, resolved: 1, detected_at: -1 });
FraudDetectionSchema.index({ fraud_type: 1, severity: 1, resolved: 1 });

export const FraudDetection = mongoose.model<IFraudDetection>('FraudDetection', FraudDetectionSchema);
