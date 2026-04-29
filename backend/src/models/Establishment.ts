import mongoose, { Document, Schema } from 'mongoose';

export interface IEstablishment extends Document {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  nature_of_business?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EstablishmentSchema = new Schema<IEstablishment>({
  name: { type: String, required: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  nature_of_business: { type: String },
  contact_person: { type: String },
  contact_phone: { type: String },
  contact_email: { type: String },
  is_active: { type: Boolean, default: true }
}, {
  timestamps: true
});

export const Establishment = mongoose.model<IEstablishment>('Establishment', EstablishmentSchema);
