import mongoose from 'mongoose';
import { INDIAN_STATES, MEDICAL_COUNCILS, PINCODE, HPR_ID } from '../utils/india.js';

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'];

// "  lucknow " / "LUCKNOW" -> "Lucknow", so typed cities group together; mixed case like "Vasco da Gama" is kept.
function normaliseCity(value) {
  if (typeof value !== 'string') return value;
  const s = value.trim().replace(/\s+/g, ' ');
  return s === s.toLowerCase() || s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase()) : s;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// One working window on a given weekday (0 = Sunday ... 6 = Saturday).
const availabilitySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, match: TIME, required: true },
    end: { type: String, match: TIME, required: true },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, required: [true, 'Specialization is required'], trim: true, index: true },
    qualifications: { type: String, trim: true },
    experience: { type: Number, min: 0, default: 0 },
    fees: { type: Number, min: 0, default: 0 },
    about: { type: String, trim: true, maxlength: 1500 },
    clinicAddress: { type: String, trim: true },
    slotDuration: { type: Number, enum: [15, 20, 30, 45, 60], default: 30 },
    availability: { type: [availabilitySchema], default: [] },
    isAvailable: { type: Boolean, default: true },

    // Where the doctor practises.
    state: { type: String, enum: { values: INDIAN_STATES, message: 'Please choose a valid Indian state / UT' }, required: [true, 'State is required'], index: true },
    city: { type: String, trim: true, required: [true, 'City is required'], maxlength: 80, set: normaliseCity },
    pincode: { type: String, trim: true, match: [PINCODE, 'Pincode must be 6 digits'] },

    // Medical registration, checked by an admin (and optionally against ABDM's Healthcare Professionals Registry).
    registrationNumber: { type: String, trim: true, required: [true, 'Medical registration number is required'], maxlength: 40 },
    medicalCouncil: { type: String, enum: { values: MEDICAL_COUNCILS, message: 'Please choose a valid medical council' }, required: [true, 'Medical council is required'] },
    registrationYear: { type: Number, min: 1950, max: 2100 },
    hprId: { type: String, trim: true, match: [HPR_ID, 'HPR ID must be 14 digits or name@hpr.abdm'] },
    verification: {
      status: { type: String, enum: VERIFICATION_STATUSES, default: 'pending', index: true },
      method: { type: String, enum: ['manual', 'abdm-hpr', 'seed'] },
      note: { type: String, trim: true, maxlength: 500 },
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      hprCheck: { checkedAt: Date, found: Boolean, name: String, council: String, registrationNumber: String },
    },
    // Hospital the doctor practises at (optional - many doctors run their own clinic).
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    // Sample profiles created by the seed script, shown with a "Demo" label.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

doctorSchema.index({ state: 1, city: 1 });

// Only verified, available doctors are listed to patients or bookable.
export const PUBLIC_DOCTOR_FILTER = { isAvailable: true, 'verification.status': 'verified' };

doctorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Doctor', doctorSchema);
