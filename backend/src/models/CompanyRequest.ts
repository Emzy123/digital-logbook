import mongoose, { Document, Schema } from 'mongoose';

export enum CompanyRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_INFO = 'needs_info'
}

export interface ICompanyRequest extends Document {
  student_id: mongoose.Types.ObjectId;
  company_name: string;
  address: string;
  city: string;
  state: string;
  nature_of_business: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  company_website?: string;
  company_size?: string;
  reasoning?: string;
  status: CompanyRequestStatus;
  reviewed_by?: mongoose.Types.ObjectId;
  reviewed_at?: Date;
  rejection_reason?: string;
  admin_notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyRequestSchema = new Schema<ICompanyRequest>({
  student_id: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, index: true },
  company_name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  nature_of_business: { type: String, required: true },
  contact_person: { type: String, required: true },
  contact_phone: { type: String, required: true },
  contact_email: { type: String, required: true },
  company_website: { type: String },
  company_size: { type: String },
  reasoning: { type: String },
  status: {
    type: String,
    enum: Object.values(CompanyRequestStatus),
    default: CompanyRequestStatus.PENDING,
    index: true
  },
  reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewed_at: { type: Date },
  rejection_reason: { type: String },
  admin_notes: { type: String }
}, {
  timestamps: true
});

// Index for efficient queries
CompanyRequestSchema.index({ status: 1, createdAt: -1 });
CompanyRequestSchema.index({ student_id: 1, status: 1 });

export const CompanyRequest = mongoose.model<ICompanyRequest>('CompanyRequest', CompanyRequestSchema);
