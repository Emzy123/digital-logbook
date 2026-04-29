import mongoose, { Document, Schema } from 'mongoose';

export interface ISupervisorAssignment extends Document {
  student_id: mongoose.Types.ObjectId;
  industry_supervisor_id?: mongoose.Types.ObjectId;
  school_supervisor_id?: mongoose.Types.ObjectId;
  assignment_date: Date;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupervisorAssignmentSchema = new Schema<ISupervisorAssignment>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  industry_supervisor_id: { type: Schema.Types.ObjectId, ref: 'User' },
  school_supervisor_id: { type: Schema.Types.ObjectId, ref: 'User' },
  assignment_date: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true }
}, {
  timestamps: true
});

SupervisorAssignmentSchema.index({ student_id: 1, is_active: 1 });

export const SupervisorAssignment = mongoose.model<ISupervisorAssignment>('SupervisorAssignment', SupervisorAssignmentSchema);
