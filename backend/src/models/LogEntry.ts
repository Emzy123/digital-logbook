import mongoose, { Document, Schema } from 'mongoose';

export enum LogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision'
}

export interface IAttachment {
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  uploaded_at: Date;
  geotag?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
  };
}

export interface IAuditTrail {
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  created_ip: string;
  created_device?: string;
  submitted_by?: mongoose.Types.ObjectId;
  submitted_at?: Date;
  submitted_ip?: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  approved_ip?: string;
  last_modified_by?: mongoose.Types.ObjectId;
  last_modified_at?: Date;
  modification_count: number;
}

export interface IFraudFlags {
  rapid_submission: boolean;
  identical_description: boolean;
  unusual_hours: boolean;
  missing_evidence: boolean;
  suspicious_pattern: boolean;
  risk_score: number; // 0-100
}

export interface ILogEntry extends Document {
  student_id: mongoose.Types.ObjectId;
  entry_date: Date;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  task_title: string;
  task_description: string;
  skills_learned: string;
  tools_used: string[];
  challenges_faced?: string;
  attachments: IAttachment[];
  supervisor_comment?: string;
  status: LogStatus;
  submitted_at?: Date;
  approved_at?: Date;
  approved_by?: mongoose.Types.ObjectId;
  rejection_reason?: string;
  revision_request?: {
    requested_at: Date;
    requested_by: mongoose.Types.ObjectId;
    instructions: string;
  };
  blockchain_hash?: string;
  previous_entry_hash?: string;
  audit_trail: IAuditTrail;
  fraud_flags: IFraudFlags;
  is_immutable: boolean;
  backdating_approved: boolean;
  backdating_approved_by?: mongoose.Types.ObjectId;
  backdating_approved_at?: Date;
  siwes_end_date?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  mime_type: { type: String, required: true },
  size: { type: Number, required: true },
  uploaded_at: { type: Date, default: Date.now },
  geotag: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date }
  }
});

const LogEntrySchema = new Schema<ILogEntry>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  entry_date: { type: Date, required: true, index: true },
  start_time: { type: String },
  end_time: { type: String },
  total_hours: { type: Number },
  task_title: { type: String, required: true },
  task_description: { type: String, required: true },
  skills_learned: { type: String },
  tools_used: [{ type: String }],
  challenges_faced: { type: String },
  attachments: [AttachmentSchema],
  supervisor_comment: { type: String },
  status: { 
    type: String, 
    enum: Object.values(LogStatus), 
    default: LogStatus.DRAFT,
    index: true 
  },
  submitted_at: { type: Date },
  approved_at: { type: Date },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  rejection_reason: { type: String },
  revision_request: {
    requested_at: { type: Date },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User' },
    instructions: { type: String }
  },
  blockchain_hash: { type: String },
  previous_entry_hash: { type: String },
  audit_trail: {
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now, required: true },
    created_ip: { type: String, required: true },
    created_device: { type: String },
    submitted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    submitted_at: { type: Date },
    submitted_ip: { type: String },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    approved_ip: { type: String },
    last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    last_modified_at: { type: Date },
    modification_count: { type: Number, default: 0 }
  },
  fraud_flags: {
    rapid_submission: { type: Boolean, default: false },
    identical_description: { type: Boolean, default: false },
    unusual_hours: { type: Boolean, default: false },
    missing_evidence: { type: Boolean, default: false },
    suspicious_pattern: { type: Boolean, default: false },
    risk_score: { type: Number, default: 0, min: 0, max: 100 }
  },
  is_immutable: { type: Boolean, default: false },
  backdating_approved: { type: Boolean, default: false },
  backdating_approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  backdating_approved_at: { type: Date },
  siwes_end_date: { type: Date }
}, {
  timestamps: true
});

// Calculate total hours before saving if times are provided
LogEntrySchema.pre('save', function(next) {
  if (this.start_time && this.end_time) {
    const start = new Date(`1970-01-01T${this.start_time}:00`);
    const end = new Date(`1970-01-01T${this.end_time}:00`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24; // Handle shift spanning midnight
    this.total_hours = Math.round(diff * 100) / 100;
  }
  next();
});

export const LogEntry = mongoose.model<ILogEntry>('LogEntry', LogEntrySchema);
