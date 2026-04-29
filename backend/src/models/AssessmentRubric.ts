import mongoose, { Document, Schema } from 'mongoose';

export enum AssessmentType {
  INDUSTRY_SUPERVISOR = 'industry_supervisor',
  SCHOOL_SUPERVISOR = 'school_supervisor',
  FINAL_GRADE = 'final_grade'
}

export enum AssessmentStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPEALED = 'appealed'
}

export interface IAssessmentCriterion extends Document {
  code: string;
  title: string;
  description: string;
  max_score: number;
  weight: number;
  category: string;
  scoring_guide: {
    excellent: string;
    good: string;
    satisfactory: string;
    needs_improvement: string;
    poor: string;
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IAssessmentScore extends Document {
  criterion_id: mongoose.Types.ObjectId;
  score: number;
  max_score: number;
  weight: number;
  comments?: string;
  evidence_references?: string[]; // References to log entries or other evidence
}

export interface IStudentAssessment extends Document {
  student_id: mongoose.Types.ObjectId;
  assessment_type: AssessmentType;
  assessor_id: mongoose.Types.ObjectId;
  assessor_role: string;
  academic_year: string;
  semester: string;
  status: AssessmentStatus;
  scores: IAssessmentScore[];
  total_score: number;
  weighted_total: number;
  max_possible_score: number;
  overall_comments: string;
  strengths: string[];
  areas_for_improvement: string[];
  recommendations: string;
  digital_signature: {
    signature_data: string;
    signed_at: Date;
    ip_address: string;
    device_info: string;
  };
  submission_history: Array<{
    action: string;
    timestamp: Date;
    user_id: mongoose.Types.ObjectId;
    snapshot: any;
  }>;
  appeal?: {
    reason: string;
    submitted_at: Date;
    reviewed_by?: mongoose.Types.ObjectId;
    reviewed_at?: Date;
    decision?: 'upheld' | 'reversed' | 'modified';
    response_comments?: string;
  };
  late_submission_deductions: {
    days_late: number;
    deduction_percentage: number;
    reason: string;
  };
  final_grade?: {
    letter_grade: string;
    gpa_points: number;
    percentage: number;
    calculated_at: Date;
    calculated_by: mongoose.Types.ObjectId;
  };
  created_at: Date;
  updated_at: Date;
}

const AssessmentCriterionSchema = new Schema<IAssessmentCriterion>({
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

const AssessmentScoreSchema = new Schema<IAssessmentScore>({
  criterion_id: { type: Schema.Types.ObjectId, ref: 'AssessmentCriterion', required: true },
  score: { type: Number, required: true, min: 0 },
  max_score: { type: Number, required: true, min: 0 },
  weight: { type: Number, required: true, min: 0, max: 100 },
  comments: { type: String },
  evidence_references: [{ type: String }]
});

const StudentAssessmentSchema = new Schema<IStudentAssessment>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  assessment_type: {
    type: String,
    enum: Object.values(AssessmentType),
    required: true,
    index: true
  },
  assessor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    snapshot: { type: Schema.Types.Mixed }
  }],
  appeal: {
    reason: { type: String },
    submitted_at: { type: Date },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
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
    calculated_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
StudentAssessmentSchema.index({ student_id: 1, assessment_type: 1, academic_year: 1 });
StudentAssessmentSchema.index({ assessor_id: 1, status: 1 });
StudentAssessmentSchema.index({ status: 1, created_at: -1 });

// Pre-save middleware to calculate totals
StudentAssessmentSchema.pre('save', function(next) {
  if (this.isModified('scores')) {
    const assessment = this as any;
    assessment.calculateTotals();
  }
  next();
});

// Method to calculate total and weighted scores
StudentAssessmentSchema.methods.calculateTotals = function() {
  const assessment = this as any;
  let totalScore = 0;
  let weightedTotal = 0;
  let maxPossibleScore = 0;

  assessment.scores.forEach((score: any) => {
    totalScore += score.score;
    weightedTotal += (score.score / score.max_score) * score.weight;
    maxPossibleScore += score.max_score;
  });

  assessment.total_score = totalScore;
  assessment.weighted_total = weightedTotal;
  assessment.max_possible_score = maxPossibleScore;
};

export const AssessmentCriterion = mongoose.model<IAssessmentCriterion>('AssessmentCriterion', AssessmentCriterionSchema);
export const StudentAssessment = mongoose.model<IStudentAssessment>('StudentAssessment', StudentAssessmentSchema);
