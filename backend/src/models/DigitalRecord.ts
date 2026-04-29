import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export enum RecordType {
  LOG_ENTRY = 'log_entry',
  ASSESSMENT = 'assessment',
  ATTACHMENT = 'attachment',
  COMMENT = 'comment',
  NOTIFICATION = 'notification',
  AUDIT_LOG = 'audit_log',
  STUDENT_PROFILE = 'student_profile',
  ESTABLISHMENT = 'establishment'
}

export enum RecordStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  CORRUPTED = 'corrupted'
}

export enum AccessLevel {
  PUBLIC = 'public',
  STUDENT = 'student',
  SUPERVISOR = 'supervisor',
  COORDINATOR = 'coordinator',
  ADMIN = 'admin',
  ITF = 'itf'
}

export interface IDigitalRecord extends Document {
  record_id: string; // Unique identifier for the record
  record_type: RecordType;
  original_id: mongoose.Types.ObjectId; // Reference to original document
  student_id?: mongoose.Types.ObjectId;
  institution_id?: mongoose.Types.ObjectId;
  supervisor_id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  content: any; // Encrypted content
  content_hash: string; // SHA-256 hash of original content
  encrypted_content: string; // AES-256 encrypted content
  encryption_key: string; // Encrypted encryption key
  metadata: {
    created_at: Date;
    updated_at: Date;
    created_by: mongoose.Types.ObjectId;
    updated_by?: mongoose.Types.ObjectId;
    file_size?: number;
    mime_type?: string;
    tags: string[];
    access_level: AccessLevel;
    retention_years: number;
    archive_date?: Date;
    delete_date?: Date;
  };
  audit_trail: Array<{
    action: string;
    user_id: mongoose.Types.ObjectId;
    timestamp: Date;
    ip_address: string;
    user_agent: string;
    previous_hash?: string;
    new_hash: string;
    reason?: string;
  }>;
  backup_status: {
    primary: boolean;
    secondary: boolean;
    tertiary: boolean;
    last_backup: Date;
    backup_regions: string[];
  };
  integrity_verification: {
    last_verified: Date;
    verification_hash: string;
    is_valid: boolean;
    verification_attempts: number;
  };
  access_log: Array<{
    user_id: mongoose.Types.ObjectId;
    access_type: 'view' | 'download' | 'export';
    timestamp: Date;
    ip_address: string;
    purpose: string;
  }>;
  status: RecordStatus;
  created_at: Date;
  updated_at: Date;
}

const DigitalRecordSchema = new Schema<IDigitalRecord>({
  record_id: { type: String, required: true, unique: true, index: true },
  record_type: {
    type: String,
    enum: Object.values(RecordType),
    required: true,
    index: true
  },
  original_id: { type: Schema.Types.ObjectId, required: true, index: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', index: true },
  institution_id: { type: Schema.Types.ObjectId, ref: 'Establishment', index: true },
  supervisor_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: Schema.Types.Mixed }, // Original content before encryption
  content_hash: { type: String, required: true, index: true },
  encrypted_content: { type: String, required: true },
  encryption_key: { type: String, required: true },
  metadata: {
    created_at: { type: Date, required: true },
    updated_at: { type: Date },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    file_size: { type: Number },
    mime_type: { type: String },
    tags: [{ type: String }],
    access_level: {
      type: String,
      enum: Object.values(AccessLevel),
      default: AccessLevel.STUDENT
    },
    retention_years: { type: Number, default: 7, required: true },
    archive_date: { type: Date },
    delete_date: { type: Date }
  },
  audit_trail: [{
    action: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, required: true },
    ip_address: { type: String, required: true },
    user_agent: { type: String },
    previous_hash: { type: String },
    new_hash: { type: String, required: true },
    reason: { type: String }
  }],
  backup_status: {
    primary: { type: Boolean, default: false },
    secondary: { type: Boolean, default: false },
    tertiary: { type: Boolean, default: false },
    last_backup: { type: Date },
    backup_regions: [{ type: String }]
  },
  integrity_verification: {
    last_verified: { type: Date },
    verification_hash: { type: String },
    is_valid: { type: Boolean, default: true },
    verification_attempts: { type: Number, default: 0 }
  },
  access_log: [{
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    access_type: { type: String, enum: ['view', 'download', 'export'], required: true },
    timestamp: { type: Date, required: true },
    ip_address: { type: String, required: true },
    purpose: { type: String, required: true }
  }],
  status: {
    type: String,
    enum: Object.values(RecordStatus),
    default: RecordStatus.ACTIVE
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
DigitalRecordSchema.index({ record_id: 1, status: 1 });
DigitalRecordSchema.index({ student_id: 1, record_type: 1, status: 1 });
DigitalRecordSchema.index({ institution_id: 1, record_type: 1, status: 1 });
DigitalRecordSchema.index({ created_at: -1 });
DigitalRecordSchema.index({ 'metadata.archive_date': 1 });
DigitalRecordSchema.index({ 'metadata.delete_date': 1 });
DigitalRecordSchema.index({ content_hash: 1 });

// Pre-save middleware for encryption and hashing
DigitalRecordSchema.pre('save', function(next) {
  const record = this as any;
  
  if (record.isModified('content') && !record.encrypted_content) {
    // Generate content hash
    const contentString = JSON.stringify(record.content);
    record.content_hash = crypto.createHash('sha256').update(contentString).digest('hex');
    
    // Generate encryption key
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    record.encryption_key = encryptionKey;
    
    // Encrypt content
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(contentString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    record.encrypted_content = encrypted;
  }
  
  next();
});

// Method to decrypt content
DigitalRecordSchema.methods.decryptContent = function(encryptionKey: string): any {
  const record = this as any;
  
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(record.encrypted_content, 'hex', 'utf8');
    decrypted += decipher.final('hex');
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt content');
  }
};

// Method to verify integrity
DigitalRecordSchema.methods.verifyIntegrity = function(): boolean {
  const record = this as any;
  
  try {
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(record.content)).digest('hex');
    const isValid = currentHash === record.content_hash;
    
    // Update verification status
    record.integrity_verification.last_verified = new Date();
    record.integrity_verification.verification_hash = currentHash;
    record.integrity_verification.is_valid = isValid;
    record.integrity_verification.verification_attempts += 1;
    
    return isValid;
  } catch (error) {
    record.integrity_verification.is_valid = false;
    record.integrity_verification.verification_attempts += 1;
    return false;
  }
};

// Method to add audit trail entry
DigitalRecordSchema.methods.addAuditEntry = function(
  action: string,
  userId: mongoose.Types.ObjectId,
  ipAddress: string,
  userAgent: string,
  reason?: string
) {
  const record = this as any;
  
  const newHash = crypto.createHash('sha256').update(JSON.stringify(record.content)).digest('hex');
  
  record.audit_trail.push({
    action,
    user_id: userId,
    timestamp: new Date(),
    ip_address: ipAddress,
    userAgent: userAgent,
    previous_hash: record.content_hash,
    new_hash: newHash,
    reason
  });
  
  record.content_hash = newHash;
};

// Method to add access log entry
DigitalRecordSchema.methods.addAccessEntry = function(
  userId: mongoose.Types.ObjectId,
  accessType: 'view' | 'download' | 'export',
  ipAddress: string,
  purpose: string
) {
  const record = this as any;
  
  record.access_log.push({
    user_id: userId,
    access_type: accessType,
    timestamp: new Date(),
    ip_address: ipAddress,
    purpose
  });
};

// Static method to generate unique record ID
DigitalRecordSchema.statics.generateRecordId = function(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `REC_${timestamp}_${randomStr}`;
};

export const DigitalRecord = mongoose.model<IDigitalRecord>('DigitalRecord', DigitalRecordSchema);
