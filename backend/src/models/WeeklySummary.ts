import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklySummary extends Document {
  student_id: mongoose.Types.ObjectId;
  week_number: number;
  start_date: Date;
  end_date: Date;
  summary_text: string;
  department_attached: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  supervisor_comment?: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklySummarySchema = new Schema<IWeeklySummary>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  week_number: { type: Number, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  summary_text: { type: String, required: true },
  department_attached: { type: String, required: true },
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },
  supervisor_comment: { type: String },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date }
}, {
  timestamps: true
});

WeeklySummarySchema.index({ student_id: 1, week_number: 1 }, { unique: true });

export const WeeklySummary = mongoose.model<IWeeklySummary>('WeeklySummary', WeeklySummarySchema);
