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
exports.Assessment = exports.AssessorType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AssessorType;
(function (AssessorType) {
    AssessorType["INDUSTRY"] = "industry";
    AssessorType["SCHOOL"] = "school";
})(AssessorType || (exports.AssessorType = AssessorType = {}));
const AssessmentSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
    assessor_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assessor_type: {
        type: String,
        enum: Object.values(AssessorType),
        required: true
    },
    itf_form_type: { type: String, enum: ['ITF_8B', 'ITF_8C'], required: true },
    itf_8c_scores: {
        attendance: { type: Number },
        punctuality: { type: Number },
        initiative: { type: Number },
        relationship_with_staff: { type: Number },
        practical_skills: { type: Number },
        general_conduct: { type: Number }
    },
    itf_8b_scores: {
        logbook_maintenance: { type: Number },
        knowledge_of_reports: { type: Number },
        student_participation: { type: Number },
        technical_skills_gained: { type: Number }
    },
    total_score: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    comments: { type: String },
    assessment_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});
AssessmentSchema.index({ student_id: 1, assessor_id: 1 }, { unique: true });
exports.Assessment = mongoose_1.default.model('Assessment', AssessmentSchema);
