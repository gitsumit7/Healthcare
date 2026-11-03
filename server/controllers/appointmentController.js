import crypto from 'node:crypto';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { generateSlots, isPast } from '../utils/slots.js';
import { notifyAppointmentChange } from '../utils/events.js';

export const populate = (query) =>
  query
    .populate('patient', 'name email phone gender dateOfBirth bloodGroup')
    .populate({ path: 'doctor', select: 'specialization fees clinicAddress user', populate: { path: 'user', select: 'name email phone' } })
    .populate('completedBy', 'name');

// Sends the updated appointment back and pushes the change to everyone else who can see it.
export async function sendAppointment(res, id, actor, statusCode = 200) {
  const appointment = await populate(Appointment.findById(id));
  notifyAppointmentChange(appointment, actor);
  res.status(statusCode).json({ appointment });
}

// Demo checkout: no gateway is called and no money moves; online choices are recorded as paid.
const ONLINE_PAYMENT_METHODS = ['upi', 'card'];
const BOOKING_PAYMENT_METHODS = [...ONLINE_PAYMENT_METHODS, 'clinic'];
const CLINIC_PAYMENT_METHODS = ['cash', 'upi'];
const demoReference = () => `DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// Whole years since a date of birth, or undefined when the profile has none.
function ageFrom(dob, now = new Date()) {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : undefined;
}

// POST /api/appointments  (patient)
// Only the location is asked for at booking; the patient's name and age come from their profile.
export const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, slot, reason, paymentMethod = 'clinic', patientDetails = {} } = req.body;
  if (!doctorId || !date || !slot) throw new AppError('doctorId, date and slot are required', 400);
  if (!BOOKING_PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('Choose UPI, card or pay at clinic', 400);
  const patientLocation = String(patientDetails.location || '').trim();
  if (!patientLocation) throw new AppError('Enter your location', 400);

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.isAvailable || doctor.verification?.status !== 'verified') {
    throw new AppError('Doctor is not available for booking', 404);
  }
  if (!generateSlots(doctor, date).includes(slot)) throw new AppError('Doctor does not offer this slot', 400);
  if (isPast(date, slot)) throw new AppError('Cannot book a slot in the past', 400);

  const clash = await Appointment.exists({ patient: req.user._id, date, slot, status: { $in: ACTIVE_STATUSES } });
  if (clash) throw new AppError('You already have an appointment at this time', 409);

  // The unique partial index on (doctor, date, slot) guards against double-booking races.
  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctor._id,
    date,
    slot,
    reason,
    patientDetails: { name: req.user.name, age: ageFrom(req.user.dateOfBirth), location: patientLocation },
    fees: doctor.fees,
    payment: ONLINE_PAYMENT_METHODS.includes(paymentMethod)
      ? { status: 'paid', method: paymentMethod, reference: demoReference(), paidAt: new Date() }
      : { status: 'unpaid', method: 'clinic' },
  });

  await sendAppointment(res, appointment._id, req.user, 201);
});

// GET /api/appointments/me?status=  (patient or doctor)
export const myAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) throw new AppError('Doctor profile not found', 404);
    filter.doctor = doctor._id;
  } else {
    filter.patient = req.user._id;
  }
  if (req.query.status) filter.status = req.query.status;

  const appointments = await populate(Appointment.find(filter).sort({ date: -1, slot: -1 }));
  res.json({ count: appointments.length, appointments });
});

// Allowed status transitions per role. Only an admin marks a visit completed (see adminController).
const TRANSITIONS = {
  doctor: { pending: ['confirmed', 'cancelled'], confirmed: ['cancelled'] },
  patient: { pending: ['cancelled'], confirmed: ['cancelled'] },
};

// Loads an appointment that belongs to the signed-in patient or doctor.
async function findOwnAppointment(req) {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || !appointment.doctor.equals(doctor._id)) throw new AppError('Not your appointment', 403);
  } else if (!appointment.patient.equals(req.user._id)) {
    throw new AppError('Not your appointment', 403);
  }
  return appointment;
}

// PATCH /api/appointments/:id/status  (patient or doctor)
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, doctorNotes } = req.body;
  const appointment = await findOwnAppointment(req);
  const { role } = req.user;

  if (status && status !== appointment.status) {
    const allowed = TRANSITIONS[role]?.[appointment.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(`Cannot change status from '${appointment.status}' to '${status}'`, 400);
    }
    const started = isPast(appointment.date, appointment.slot);
    if (status === 'confirmed' && started) throw new AppError('This appointment time has already passed', 400);
    if (role === 'patient' && status === 'cancelled' && started) throw new AppError('Past appointments cannot be cancelled', 400);
    appointment.status = status;
    if (status === 'cancelled' && appointment.payment?.status === 'paid') appointment.payment.status = 'refunded';
  }
  if (role === 'doctor' && doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;

  await appointment.save();
  await sendAppointment(res, appointment._id, req.user);
});

// PATCH /api/appointments/:id/checkout  (doctor) – notes, follow-up and fee collection.
// It records the visit; marking it completed is left to an admin.
export const checkOut = asyncHandler(async (req, res) => {
  const { doctorNotes, followUpDate, feeCollected, paymentMethod } = req.body;
  const appointment = await findOwnAppointment(req);

  if (appointment.status === 'cancelled') throw new AppError('A cancelled appointment cannot be checked out', 400);
  if (!isPast(appointment.date, appointment.slot)) {
    throw new AppError('An appointment can only be checked out once it has started', 400);
  }
  if (followUpDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) throw new AppError('Follow-up date must be YYYY-MM-DD', 400);
    if (followUpDate <= appointment.date) throw new AppError('Follow-up date must be after the visit', 400);
  }
  if (feeCollected && appointment.payment?.status !== 'paid') {
    if (!CLINIC_PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('Choose cash or UPI for the fee', 400);
    appointment.payment = { status: 'paid', method: paymentMethod, paidAt: new Date() };
  }

  if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;
  appointment.followUpDate = followUpDate || undefined;
  appointment.checkedOutAt = new Date();
  await appointment.save();
  await sendAppointment(res, appointment._id, req.user);
});
