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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogEntry = exports.LogStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var LogStatus;
(function (LogStatus) {
    LogStatus["DRAFT"] = "draft";
    LogStatus["SUBMITTED"] = "submitted";
    LogStatus["APPROVED"] = "approved";
    LogStatus["REJECTED"] = "rejected";
    LogStatus["NEEDS_REVISION"] = "needs_revision";
})(LogStatus || (exports.LogStatus = LogStatus = {}));
const AttachmentSchema = new mongoose_1.Schema({
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
const LogEntrySchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
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
    approved_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    rejection_reason: { type: String },
    revision_request: {
        requested_at: { type: Date },
        requested_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        instructions: { type: String }
    },
    blockchain_hash: { type: String },
    previous_entry_hash: { type: String },
    audit_trail: {
        created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
        created_at: { type: Date, default: Date.now, required: true },
        created_ip: { type: String, required: true },
        created_device: { type: String },
        submitted_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        submitted_at: { type: Date },
        submitted_ip: { type: String },
        approved_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        approved_at: { type: Date },
        approved_ip: { type: String },
        last_modified_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
    backdating_approved_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    backdating_approved_at: { type: Date },
    siwes_end_date: { type: Date }
}, {
    timestamps: true
});
// Calculate total hours before saving if times are provided
LogEntrySchema.pre('save', function (next) {
    if (this.start_time && this.end_time) {
        const start = new Date(`1970-01-01T${this.start_time}:00`);
        const end = new Date(`1970-01-01T${this.end_time}:00`);
        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (diff < 0)
            diff += 24; // Handle shift spanning midnight
        this.total_hours = Math.round(diff * 100) / 100;
    }
    next();
});
exports.LogEntry = mongoose_1.default.model('LogEntry', LogEntrySchema);
