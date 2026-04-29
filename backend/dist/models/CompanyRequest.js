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
exports.CompanyRequest = exports.CompanyRequestStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CompanyRequestStatus;
(function (CompanyRequestStatus) {
    CompanyRequestStatus["PENDING"] = "pending";
    CompanyRequestStatus["APPROVED"] = "approved";
    CompanyRequestStatus["REJECTED"] = "rejected";
    CompanyRequestStatus["NEEDS_INFO"] = "needs_info";
})(CompanyRequestStatus || (exports.CompanyRequestStatus = CompanyRequestStatus = {}));
const CompanyRequestSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    company_name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    nature_of_business: { type: String, required: true },
    contact_person: { type: String, required: true },
    contact_phone: { type: String, required: true },
    contact_email: { type: String, required: true },
    company_website: { type: String },
    company_size: { type: String },
    reasoning: { type: String },
    status: {
        type: String,
        enum: Object.values(CompanyRequestStatus),
        default: CompanyRequestStatus.PENDING,
        index: true
    },
    reviewed_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    reviewed_at: { type: Date },
    rejection_reason: { type: String },
    admin_notes: { type: String }
}, {
    timestamps: true
});
// Index for efficient queries
CompanyRequestSchema.index({ status: 1, createdAt: -1 });
CompanyRequestSchema.index({ student_id: 1, status: 1 });
exports.CompanyRequest = mongoose_1.default.model('CompanyRequest', CompanyRequestSchema);
