import mongoose, { Document, Schema } from 'mongoose';

export interface ISupervisorVisit extends Document {
  student_id: mongoose.Types.ObjectId;
  supervisor_id: mongoose.Types.ObjectId;
  visit_date: Date;
  duration_hours?: number;
  student_present: boolean;
  logbook_inspected: boolean;
  remarks: string;
  issues_identified?: string;
  recommendations?: string;
  next_visit_date?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupervisorVisitSchema = new Schema<ISupervisorVisit>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  supervisor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  visit_date: { type: Date, required: true },
  duration_hours: { type: Number },
  student_present: { type: Boolean, default: true },
  logbook_inspected: { type: Boolean, default: true },
  remarks: { type: String, required: true },
  issues_identified: { type: String },
  recommendations: { type: String },
  next_visit_date: { type: Date }
}, {
  timestamps: true
});

export const SupervisorVisit = mongoose.model<ISupervisorVisit>('SupervisorVisit', SupervisorVisitSchema);
