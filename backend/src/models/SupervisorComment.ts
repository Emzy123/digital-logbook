import mongoose, { Document, Schema } from 'mongoose';

export enum CommentType {
  SUPERVISOR_REVIEW = 'supervisor_review',
  STUDENT_RESPONSE = 'student_response',
  SCHOOL_SUPERVISOR_NOTE = 'school_supervisor_note',
  COORDINATOR_NOTE = 'coordinator_note'
}

export interface ISupervisorComment extends Document {
  log_entry_id: mongoose.Types.ObjectId;
  author_id: mongoose.Types.ObjectId;
  author_role: string;
  comment_type: CommentType;
  content: string;
  parent_comment_id?: mongoose.Types.ObjectId;
  is_threaded: boolean;
  is_internal: boolean; // Only visible to supervisors, not students
  attachments: Array<{
    url: string;
    filename: string;
    mime_type: string;
    size: number;
  }>;
  mentions: mongoose.Types.ObjectId[]; // Users mentioned in comment
  created_at: Date;
  updated_at: Date;
  is_edited: boolean;
  edited_at?: Date;
}

const SupervisorCommentSchema = new Schema<ISupervisorComment>({
  log_entry_id: { type: Schema.Types.ObjectId, ref: 'LogEntry', required: true, index: true },
  author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  author_role: { type: String, required: true },
  comment_type: {
    type: String,
    enum: Object.values(CommentType),
    required: true,
    index: true
  },
  content: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.ObjectId, ref: 'SupervisorComment' },
  is_threaded: { type: Boolean, default: false },
  is_internal: { type: Boolean, default: false },
  attachments: [{
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mime_type: { type: String, required: true },
    size: { type: Number, required: true }
  }],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
  is_edited: { type: Boolean, default: false },
  edited_at: { type: Date }
}, {
  timestamps: true
});

// Indexes for efficient querying
SupervisorCommentSchema.index({ log_entry_id: 1, created_at: 1 });
SupervisorCommentSchema.index({ author_id: 1, created_at: -1 });
SupervisorCommentSchema.index({ parent_comment_id: 1, created_at: 1 });

export const SupervisorComment = mongoose.model<ISupervisorComment>('SupervisorComment', SupervisorCommentSchema);
