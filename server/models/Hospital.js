import mongoose from 'mongoose';

// Hospitals imported from the Government of India open data platform (data.gov.in, National Health
// Portal hospital directory). Shown for information only - they are not bookable doctors.
const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // e.g. Public / Private
    careType: { type: String, trim: true }, // e.g. Hospital, Dispensary, PHC
    systemsOfMedicine: { type: String, trim: true }, // e.g. Allopathy, Ayurveda
    specialties: { type: String, trim: true },
    // Doctor specialties (as used on doctor profiles) this hospital has departments for.
    departments: { type: [String], default: undefined },
    address: { type: String, trim: true },
    state: { type: String, trim: true, index: true },
    district: { type: String, trim: true, index: true },
    pincode: { type: String, trim: true, index: true },
    phone: { type: String, trim: true },
    emergencyPhone: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    beds: { type: Number },
    location: { lat: Number, lng: Number },
    source: { type: String, default: 'data.gov.in' }, // 'data.gov.in' or 'demo'
    // Sample hospitals seeded until real data.gov.in data is imported (which removes them).
    isDemo: { type: Boolean, default: false, index: true },
    sourceId: { type: String, required: true, unique: true },
    importedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

hospitalSchema.index({ name: 'text', address: 'text', district: 'text' });

hospitalSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Hospital', hospitalSchema);
