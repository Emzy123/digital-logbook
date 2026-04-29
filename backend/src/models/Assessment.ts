import mongoose, { Document, Schema } from 'mongoose';

export enum AssessorType {
  INDUSTRY = 'industry',
  SCHOOL = 'school'
}

export interface IAssessment extends Document {
  student_id: mongoose.Types.ObjectId;
  assessor_id: mongoose.Types.ObjectId;
  assessor_type: AssessorType;
  itf_form_type: 'ITF_8B' | 'ITF_8C';
  itf_8c_scores?: {
    attendance: number;
    punctuality: number;
    initiative: number;
    relationship_with_staff: number;
    practical_skills: number;
    general_conduct: number;
  };
  itf_8b_scores?: {
    logbook_maintenance: number;
    knowledge_of_reports: number;
    student_participation: number;
    technical_skills_gained: number;
  };
  total_score: number;
  percentage: number;
  grade: string;
  comments?: string;
  assessment_date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  assessor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

export const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentSchema);
