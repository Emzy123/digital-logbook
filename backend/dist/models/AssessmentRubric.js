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
exports.StudentAssessment = exports.AssessmentCriterion = exports.AssessmentStatus = exports.AssessmentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AssessmentType;
(function (AssessmentType) {
    AssessmentType["INDUSTRY_SUPERVISOR"] = "industry_supervisor";
    AssessmentType["SCHOOL_SUPERVISOR"] = "school_supervisor";
    AssessmentType["FINAL_GRADE"] = "final_grade";
})(AssessmentType || (exports.AssessmentType = AssessmentType = {}));
var AssessmentStatus;
(function (AssessmentStatus) {
    AssessmentStatus["DRAFT"] = "draft";
    AssessmentStatus["SUBMITTED"] = "submitted";
    AssessmentStatus["REVIEWED"] = "reviewed";
    AssessmentStatus["APPROVED"] = "approved";
    AssessmentStatus["REJECTED"] = "rejected";
    AssessmentStatus["APPEALED"] = "appealed";
})(AssessmentStatus || (exports.AssessmentStatus = AssessmentStatus = {}));
const AssessmentCriterionSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    max_score: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, required: true },
    scoring_guide: {
        excellent: { type: String, required: true },
        good: { type: String, required: true },
        satisfactory: { type: String, required: true },
        needs_improvement: { type: String, required: true },
        poor: { type: String, required: true }
    },
    is_active: { type: Boolean, default: true }
}, {
    timestamps: true
});
const AssessmentScoreSchema = new mongoose_1.Schema({
    criterion_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AssessmentCriterion', required: true },
    score: { type: Number, required: true, min: 0 },
    max_score: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    comments: { type: String },
    evidence_references: [{ type: String }]
});
const StudentAssessmentSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    assessment_type: {
        type: String,
        enum: Object.values(AssessmentType),
        required: true,
        index: true
    },
    assessor_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assessor_role: { type: String, required: true },
    academic_year: { type: String, required: true },
    semester: { type: String, required: true },
    status: {
        type: String,
        enum: Object.values(AssessmentStatus),
        default: AssessmentStatus.DRAFT,
        index: true
    },
    scores: [AssessmentScoreSchema],
    total_score: { type: Number, default: 0 },
    weighted_total: { type: Number, default: 0 },
    max_possible_score: { type: Number, default: 0 },
    overall_comments: { type: String },
    strengths: [{ type: String }],
    areas_for_improvement: [{ type: String }],
    recommendations: { type: String },
    digital_signature: {
        signature_data: { type: String, required: true },
        signed_at: { type: Date, required: true },
        ip_address: { type: String, required: true },
        device_info: { type: String }
    },
    submission_history: [{
            action: { type: String, required: true },
            timestamp: { type: Date, required: true },
            user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            snapshot: { type: mongoose_1.Schema.Types.Mixed }
        }],
    appeal: {
        reason: { type: String },
        submitted_at: { type: Date },
        reviewed_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        reviewed_at: { type: Date },
        decision: { type: String, enum: ['upheld', 'reversed', 'modified'] },
        response_comments: { type: String }
    },
    late_submission_deductions: {
        days_late: { type: Number, default: 0 },
        deduction_percentage: { type: Number, default: 0 },
        reason: { type: String }
    },
    final_grade: {
        letter_grade: { type: String },
        gpa_points: { type: Number, min: 0, max: 5 },
        percentage: { type: Number, min: 0, max: 100 },
        calculated_at: { type: Date },
        calculated_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
    }
}, {
    timestamps: true
});
// Indexes for efficient querying
StudentAssessmentSchema.index({ student_id: 1, assessment_type: 1, academic_year: 1 });
StudentAssessmentSchema.index({ assessor_id: 1, status: 1 });
StudentAssessmentSchema.index({ status: 1, created_at: -1 });
// Pre-save middleware to calculate totals
StudentAssessmentSchema.pre('save', function (next) {
    if (this.isModified('scores')) {
        const assessment = this;
        assessment.calculateTotals();
    }
    next();
});
// Method to calculate total and weighted scores
StudentAssessmentSchema.methods.calculateTotals = function () {
    const assessment = this;
    let totalScore = 0;
    let weightedTotal = 0;
    let maxPossibleScore = 0;
    assessment.scores.forEach((score) => {
        totalScore += score.score;
        weightedTotal += (score.score / score.max_score) * score.weight;
        maxPossibleScore += score.max_score;
    });
    assessment.total_score = totalScore;
    assessment.weighted_total = weightedTotal;
    assessment.max_possible_score = maxPossibleScore;
};
exports.AssessmentCriterion = mongoose_1.default.model('AssessmentCriterion', AssessmentCriterionSchema);
exports.StudentAssessment = mongoose_1.default.model('StudentAssessment', StudentAssessmentSchema);
