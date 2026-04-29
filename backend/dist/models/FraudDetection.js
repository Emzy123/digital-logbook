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
exports.FraudDetection = exports.FraudSeverity = exports.FraudType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var FraudType;
(function (FraudType) {
    FraudType["RAPID_SUBMISSION"] = "rapid_submission";
    FraudType["IDENTICAL_DESCRIPTIONS"] = "identical_descriptions";
    FraudType["UNUSUAL_HOURS"] = "unusual_hours";
    FraudType["MISSING_EVIDENCE"] = "missing_evidence";
    FraudType["SUSPICIOUS_PATTERN"] = "suspicious_pattern";
    FraudType["SUPERVISOR_ANOMALY"] = "supervisor_anomaly";
})(FraudType || (exports.FraudType = FraudType = {}));
var FraudSeverity;
(function (FraudSeverity) {
    FraudSeverity["LOW"] = "low";
    FraudSeverity["MEDIUM"] = "medium";
    FraudSeverity["HIGH"] = "high";
    FraudSeverity["CRITICAL"] = "critical";
})(FraudSeverity || (exports.FraudSeverity = FraudSeverity = {}));
const FraudDetectionSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    log_entry_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'LogEntry', index: true },
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
    resolved_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    resolved_at: { type: Date },
    resolution_notes: { type: String },
    metadata: { type: mongoose_1.Schema.Types.Mixed }
}, {
    timestamps: true
});
// Index for efficient fraud detection queries
FraudDetectionSchema.index({ student_id: 1, resolved: 1, detected_at: -1 });
FraudDetectionSchema.index({ fraud_type: 1, severity: 1, resolved: 1 });
exports.FraudDetection = mongoose_1.default.model('FraudDetection', FraudDetectionSchema);
