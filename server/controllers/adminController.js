import Doctor, { VERIFICATION_STATUSES } from '../models/Doctor.js';
import User from '../models/User.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import Hospital from '../models/Hospital.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { abdmConfigured, lookupHprProfessional } from '../utils/abdm.js';
import { clinicNow } from '../utils/slots.js';
import { escapeRegex } from './doctorController.js';
import { populate as populateAppointment, sendAppointment } from './appointmentController.js';

const normalise = (s) => String(s || '').replace(/[\s-]/g, '').toLowerCase();

// GET /api/admin/stats
export const getStats = asyncHandler(async (_req, res) => {
  const [byStatus, patients, appointments, hospitals] = await Promise.all([
    Doctor.aggregate([{ $group: { _id: '$verification.status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'patient' }),
    Appointment.countDocuments(),
    Hospital.countDocuments(),
  ]);
  const doctors = Object.fromEntries(VERIFICATION_STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of byStatus) doctors[_id] = count;
  res.json({ doctors, patients, appointments, hospitals, abdmConfigured: abdmConfigured() });
});

// GET /api/admin/doctors?status=pending&search=
export const listDoctorsForReview = asyncHandler(async (req, res) => {
  const { status = 'pending', search } = req.query;
  const filter = {};
  if (VERIFICATION_STATUSES.includes(status)) filter['verification.status'] = status;
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    const users = await User.find({ role: 'doctor', $or: [{ name: rx }, { email: rx }] }).select('_id');
    filter.$or = [{ user: { $in: users.map((u) => u._id) } }, { registrationNumber: rx }, { city: rx }, { state: rx }];
  }
  const doctors = await Doctor.find(filter)
    .populate('user', 'name email phone createdAt')
    .populate('verification.verifiedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ count: doctors.length, doctors });
});

// PATCH /api/admin/doctors/:id/verification  { status: 'verified' | 'rejected' | 'pending', note }
export const setVerification = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!VERIFICATION_STATUSES.includes(status)) throw new AppError(`Status must be one of: ${VERIFICATION_STATUSES.join(', ')}`, 400);
  if (status === 'rejected' && !String(note || '').trim()) throw new AppError('Please give a reason when rejecting', 400);

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const hprMatched = doctor.verification?.hprCheck?.found && doctor.verification.hprCheck.checkedAt;
  doctor.verification = {
    ...doctor.verification.toObject(),
    status,
    note: note?.trim() || undefined,
    method: status === 'verified' ? (hprMatched ? 'abdm-hpr' : 'manual') : undefined,
    verifiedAt: status === 'verified' ? new Date() : undefined,
    verifiedBy: status === 'verified' ? req.user._id : undefined,
  };
  await doctor.save({ validateBeforeSave: false });
  res.json({ doctor: await doctor.populate('user', 'name email phone createdAt') });
});

// POST /api/admin/doctors/:id/hpr-check  - looks the doctor's HPR ID up in ABDM and records the result
export const checkHpr = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user', 'name email phone createdAt');
  if (!doctor) throw new AppError('Doctor not found', 404);
  if (!doctor.hprId) throw new AppError('This doctor has not provided an ABDM HPR ID', 400);
  if (!abdmConfigured()) {
    throw new AppError('ABDM HPR is not configured on the server. Add ABDM_CLIENT_ID, ABDM_CLIENT_SECRET and ABDM_HPR_LOOKUP_URL to server/.env', 503);
  }

  let result;
  try {
    result = await lookupHprProfessional(doctor.hprId);
  } catch (err) {
    throw new AppError(err.message, 502);
  }

  const registrationMatches =
    result.found && result.registrationNumber ? normalise(result.registrationNumber) === normalise(doctor.registrationNumber) : null;
  doctor.verification.hprCheck = { checkedAt: new Date(), ...result };
  await doctor.save({ validateBeforeSave: false });

  res.json({ doctor, hpr: { ...result, registrationMatches } });
});

const APPOINTMENTS_PAGE_SIZE = 30;

// Completion queues. "review" is everything patients see as upcoming or pending: not yet completed or cancelled.
const startedExpr = (now) => ({ $lte: [{ $concat: ['$date', 'T', '$slot'] }, now] });
const COMPLETION_QUEUES = {
  review: () => ({ status: { $in: ACTIVE_STATUSES } }),
  upcoming: (now) => ({ status: { $in: ACTIVE_STATUSES }, $expr: { $not: [startedExpr(now)] } }),
  completed: () => ({ status: 'completed' }),
  all: () => ({}),
};

// GET /api/admin/appointments?queue=review&search=&page=
export const listAppointments = asyncHandler(async (req, res) => {
  const { queue = 'review', search } = req.query;
  if (!COMPLETION_QUEUES[queue]) throw new AppError('Unknown queue', 400);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const now = clinicNow();

  const filter = COMPLETION_QUEUES[queue](now);
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id role');
    const doctorUserIds = users.filter((u) => u.role === 'doctor').map((u) => u._id);
    const doctors = doctorUserIds.length ? await Doctor.find({ user: { $in: doctorUserIds } }).select('_id') : [];
    filter.$or = [{ patient: { $in: users.map((u) => u._id) } }, { doctor: { $in: doctors.map((d) => d._id) } }];
  }

  const direction = ['review', 'upcoming'].includes(queue) ? 1 : -1;
  const [appointments, total, ...counts] = await Promise.all([
    populateAppointment(
      Appointment.find(filter)
        .sort({ date: direction, slot: direction })
        .skip((page - 1) * APPOINTMENTS_PAGE_SIZE)
        .limit(APPOINTMENTS_PAGE_SIZE)
    ),
    Appointment.countDocuments(filter),
    ...Object.values(COMPLETION_QUEUES).map((q) => Appointment.countDocuments(q(now))),
  ]);
  res.json({
    appointments,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / APPOINTMENTS_PAGE_SIZE)),
    counts: Object.fromEntries(Object.keys(COMPLETION_QUEUES).map((q, i) => [q, counts[i]])),
  });
});

const ADMIN_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// PATCH /api/admin/appointments/:id/status  { status }
// Admins can move any appointment to any status: complete, mark incomplete (pending), confirm, cancel or restore.
export const setAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ADMIN_STATUSES.includes(status)) throw new AppError(`Status must be one of: ${ADMIN_STATUSES.join(', ')}`, 400);
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError('Appointment not found', 404);

  if (status !== appointment.status) {
    const restoring = appointment.status === 'cancelled';
    if (appointment.status === 'completed') appointment.markIncomplete();
    if (status === 'completed') appointment.markCompleted(req.user);
    else appointment.status = status;

    if (status === 'cancelled' && appointment.payment?.status === 'paid') appointment.payment.status = 'refunded';
    // A restored booking's refunded fee is due again at the clinic.
    if (restoring && appointment.payment?.status === 'refunded') appointment.payment = { status: 'unpaid', method: 'clinic' };

    try {
      await appointment.save();
    } catch (err) {
      // The unique (doctor, date, slot) index: someone else holds this slot now.
      if (err.code === 11000) throw new AppError('That slot has been booked by someone else, so this booking cannot be restored', 409);
      throw err;
    }
  }

  await sendAppointment(res, appointment._id, req.user);
});
