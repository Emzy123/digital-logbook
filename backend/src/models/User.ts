import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  STUDENT = 'student',
  INDUSTRY_SUPERVISOR = 'industry_supervisor',
  SCHOOL_SUPERVISOR = 'school_supervisor',
  COORDINATOR = 'coordinator',
  ITF_ADMIN = 'itf_admin',
  SYSTEM_ADMIN = 'system_admin'
}

export interface IUser extends Document {
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_by?: mongoose.Types.ObjectId;
  establishment_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
    index: true
  },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  phone: { type: String },
  avatar_url: { type: String },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  establishment_id: { type: Schema.Types.ObjectId, ref: 'Establishment' }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
