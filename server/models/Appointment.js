import mongoose from 'mongoose';

export const ACTIVE_STATUSES = ['pending', 'confirmed'];
// upi/card are demo online payments made at booking; cash/upi can also be collected at the clinic.
export const PAYMENT_METHODS = ['upi', 'card', 'cash', 'clinic'];

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    slot: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // HH:mm
    reason: { type: String, trim: true, maxlength: 500 },
    // Snapshot at booking: name and age from the patient's profile, location as entered (or detected) then.
    patientDetails: {
      name: { type: String, trim: true, maxlength: 80 },
      age: { type: Number, min: 0, max: 120 },
      location: { type: String, trim: true, maxlength: 200 },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    doctorNotes: { type: String, trim: true, maxlength: 2000 },
    fees: { type: Number, min: 0 },
    payment: {
      status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
      method: { type: String, enum: PAYMENT_METHODS, default: 'clinic' },
      reference: { type: String, trim: true },
      paidAt: Date,
    },
    followUpDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkedOutAt: Date, // doctor saved the check-out; only an admin marks the visit completed
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedByRole: { type: String, enum: ['doctor', 'admin'] },
  },
  { timestamps: true }
);

appointmentSchema.methods.markCompleted = function markCompleted(user) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completedBy = user._id;
  this.completedByRole = user.role;
};

// Admin undo of a completion: the visit goes back to pending (upcoming again), keeping notes and payment.
appointmentSchema.methods.markIncomplete = function markIncomplete() {
  this.status = 'pending';
  this.completedAt = undefined;
  this.completedBy = undefined;
  this.completedByRole = undefined;
};

// A slot can only be held by one active appointment per doctor.
appointmentSchema.index(
  { doctor: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } } }
);

export default mongoose.model('Appointment', appointmentSchema);
