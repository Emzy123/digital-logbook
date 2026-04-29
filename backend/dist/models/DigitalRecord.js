"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalRecord = exports.AccessLevel = exports.RecordStatus = exports.RecordType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
var RecordType;
(function (RecordType) {
    RecordType["LOG_ENTRY"] = "log_entry";
    RecordType["ASSESSMENT"] = "assessment";
    RecordType["ATTACHMENT"] = "attachment";
    RecordType["COMMENT"] = "comment";
    RecordType["NOTIFICATION"] = "notification";
    RecordType["AUDIT_LOG"] = "audit_log";
    RecordType["STUDENT_PROFILE"] = "student_profile";
    RecordType["ESTABLISHMENT"] = "establishment";
})(RecordType || (exports.RecordType = RecordType = {}));
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["ACTIVE"] = "active";
    RecordStatus["ARCHIVED"] = "archived";
    RecordStatus["DELETED"] = "deleted";
    RecordStatus["CORRUPTED"] = "corrupted";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["PUBLIC"] = "public";
    AccessLevel["STUDENT"] = "student";
    AccessLevel["SUPERVISOR"] = "supervisor";
    AccessLevel["COORDINATOR"] = "coordinator";
    AccessLevel["ADMIN"] = "admin";
    AccessLevel["ITF"] = "itf";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
const DigitalRecordSchema = new mongoose_1.Schema({
    record_id: { type: String, required: true, unique: true, index: true },
    record_type: {
        type: String,
        enum: Object.values(RecordType),
        required: true,
        index: true
    },
    original_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', index: true },
    institution_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Establishment', index: true },
    supervisor_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: mongoose_1.Schema.Types.Mixed }, // Original content before encryption
    content_hash: { type: String, required: true, index: true },
    encrypted_content: { type: String, required: true },
    encryption_key: { type: String, required: true },
    metadata: {
        created_at: { type: Date, required: true },
        updated_at: { type: Date },
        created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
        updated_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
            user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
            user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
DigitalRecordSchema.pre('save', function (next) {
    const record = this;
    if (record.isModified('content') && !record.encrypted_content) {
        // Generate content hash
        const contentString = JSON.stringify(record.content);
        record.content_hash = crypto_1.default.createHash('sha256').update(contentString).digest('hex');
        // Generate encryption key
        const encryptionKey = crypto_1.default.randomBytes(32).toString('hex');
        record.encryption_key = encryptionKey;
        // Encrypt content
        const cipher = crypto_1.default.createCipher('aes-256-cbc', encryptionKey);
        let encrypted = cipher.update(contentString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        record.encrypted_content = encrypted;
    }
    next();
});
// Method to decrypt content
DigitalRecordSchema.methods.decryptContent = function (encryptionKey) {
    const record = this;
    try {
        const decipher = crypto_1.default.createDecipher('aes-256-cbc', encryptionKey);
        let decrypted = decipher.update(record.encrypted_content, 'hex', 'utf8');
        decrypted += decipher.final('hex');
        return JSON.parse(decrypted);
    }
    catch (error) {
        throw new Error('Failed to decrypt content');
    }
};
// Method to verify integrity
DigitalRecordSchema.methods.verifyIntegrity = function () {
    const record = this;
    try {
        const currentHash = crypto_1.default.createHash('sha256').update(JSON.stringify(record.content)).digest('hex');
        const isValid = currentHash === record.content_hash;
        // Update verification status
        record.integrity_verification.last_verified = new Date();
        record.integrity_verification.verification_hash = currentHash;
        record.integrity_verification.is_valid = isValid;
        record.integrity_verification.verification_attempts += 1;
        return isValid;
    }
    catch (error) {
        record.integrity_verification.is_valid = false;
        record.integrity_verification.verification_attempts += 1;
        return false;
    }
};
// Method to add audit trail entry
DigitalRecordSchema.methods.addAuditEntry = function (action, userId, ipAddress, userAgent, reason) {
    const record = this;
    const newHash = crypto_1.default.createHash('sha256').update(JSON.stringify(record.content)).digest('hex');
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
DigitalRecordSchema.methods.addAccessEntry = function (userId, accessType, ipAddress, purpose) {
    const record = this;
    record.access_log.push({
        user_id: userId,
        access_type: accessType,
        timestamp: new Date(),
        ip_address: ipAddress,
        purpose
    });
};
// Static method to generate unique record ID
DigitalRecordSchema.statics.generateRecordId = function () {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `REC_${timestamp}_${randomStr}`;
};
exports.DigitalRecord = mongoose_1.default.model('DigitalRecord', DigitalRecordSchema);
