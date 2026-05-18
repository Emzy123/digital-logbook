import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentProfile extends Document {
  user_id: mongoose.Types.ObjectId;
  matriculation_number: string;
  faculty?: string;
  course_of_study?: string;
  department?: string;
  program_level?: string;
  current_semester?: number;
  placement_letter_url?: string;
  passport_photo_url?: string;
  start_date?: Date;
  end_date?: Date;
  establishment_id?: mongoose.Types.ObjectId;
  bank_name?: string;
  account_number?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  matriculation_number: { type: String, required: true, unique: true, index: true },
  faculty: { type: String },
  course_of_study: { type: String },
  department: { type: String },
  program_level: { type: String },
  current_semester: { type: Number },
  placement_letter_url: { type: String },
  passport_photo_url: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  establishment_id: { type: Schema.Types.ObjectId, ref: 'Establishment' },
  bank_name: { type: String },
  account_number: { type: String },
  emergency_contact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  }
}, {
  timestamps: true
});

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
