import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  user_id?: mongoose.Types.ObjectId;
  action: string;
  target_resource?: string;
  target_id?: string;
  snapshot?: any;
  ip_address?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  target_resource: { type: String },
  target_id: { type: String },
  snapshot: { type: Schema.Types.Mixed },
  ip_address: { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
