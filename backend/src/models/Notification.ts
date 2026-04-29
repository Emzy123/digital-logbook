import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  LOG_SUBMITTED = 'log_submitted',
  LOG_APPROVED = 'log_approved',
  LOG_REJECTED = 'log_rejected',
  LOG_REVISION_REQUESTED = 'log_revision_requested',
  FEEDBACK = 'feedback',
  DEADLINE = 'deadline',
  ASSIGNMENT = 'assignment',
  SYSTEM = 'system'
}

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  read_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: Object.values(NotificationType), 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  is_read: { type: Boolean, default: false },
  read_at: { type: Date }
}, {
  timestamps: true
});

NotificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
