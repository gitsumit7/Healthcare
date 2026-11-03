import mongoose from 'mongoose';
import Doctor, { PUBLIC_DOCTOR_FILTER } from '../models/Doctor.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Appointment, { ACTIVE_STATUSES } from '../models/Appointment.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { generateSlots, isPast } from '../utils/slots.js';

const PUBLIC_USER_FIELDS = 'name email phone gender avatar';
const HOSPITAL_SUMMARY_FIELDS = 'name district state careType category isDemo';
// Admin-only verification details are not shown to patients.
const PUBLIC_DOCTOR_FIELDS = '-verification.verifiedBy -verification.note -verification.hprCheck';
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MAX_PAGE_SIZE = 60;

// GET /api/doctors?search=&specialization=&state=&city=&pincode=&hospital=&sort=&page=&limit=
export const listDoctors = asyncHandler(async (req, res) => {
  const { search, specialization, state, city, pincode, hospital, sort } = req.query;
  const filter = { ...PUBLIC_DOCTOR_FILTER };

  if (specialization) filter.specialization = specialization;
  if (hospital) {
    if (!mongoose.isValidObjectId(hospital)) throw new AppError('Invalid hospital id', 400);
    filter.hospital = hospital;
  }
  if (state) filter.state = state;
  // Prefix match so a partly typed city ("luck") already narrows the list.
  if (city) filter.city = new RegExp(`^${escapeRegex(String(city).trim())}`, 'i');
  if (pincode) filter.pincode = new RegExp(`^${escapeRegex(String(pincode).slice(0, 6))}`);
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    const users = await User.find({ role: 'doctor', name: rx }).select('_id');
    filter.$or = [{ user: { $in: users.map((u) => u._id) } }, { specialization: rx }, { city: rx }];
  }

  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 24));
  const page = Math.max(1, Number(req.query.page) || 1);
  const sortBy = { fees: { fees: 1 }, '-fees': { fees: -1 }, experience: { experience: -1 } }[sort] || { createdAt: -1 };

  const [total, doctors] = await Promise.all([
    Doctor.countDocuments(filter),
    Doctor.find(filter)
      .select(PUBLIC_DOCTOR_FIELDS)
      .populate('user', PUBLIC_USER_FIELDS)
      .populate('hospital', HOSPITAL_SUMMARY_FIELDS)
      .sort({ ...sortBy, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({ count: doctors.length, total, page, pages: Math.ceil(total / limit), doctors });
});

// GET /api/doctors/specializations
export const listSpecializations = asyncHandler(async (_req, res) => {
  const specializations = await Doctor.distinct('specialization', PUBLIC_DOCTOR_FILTER);
  res.json({ specializations: specializations.sort() });
});

// GET /api/doctors/locations  -> states with verified doctors, their cities and counts
export const listLocations = asyncHandler(async (_req, res) => {
  const rows = await Doctor.aggregate([
    { $match: PUBLIC_DOCTOR_FILTER },
    { $group: { _id: { state: '$state', city: '$city' }, count: { $sum: 1 } } },
    { $sort: { '_id.state': 1, '_id.city': 1 } },
  ]);
  const states = new Map();
  for (const { _id, count } of rows) {
    const entry = states.get(_id.state) || { state: _id.state, count: 0, cities: [] };
    entry.count += count;
    entry.cities.push({ city: _id.city, count });
    states.set(_id.state, entry);
  }
  res.json({ states: [...states.values()] });
});

const findPublicDoctor = async (id) => {
  const doctor = await Doctor.findOne({ _id: id, 'verification.status': 'verified' })
    .select(PUBLIC_DOCTOR_FIELDS)
    .populate('user', PUBLIC_USER_FIELDS)
      .populate('hospital', HOSPITAL_SUMMARY_FIELDS);
  if (!doctor) throw new AppError('Doctor not found', 404);
  return doctor;
};

// GET /api/doctors/:id
export const getDoctor = asyncHandler(async (req, res) => {
  res.json({ doctor: await findPublicDoctor(req.params.id) });
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD
export const getSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new AppError('Query param "date" (YYYY-MM-DD) is required', 400);

  const doctor = await findPublicDoctor(req.params.id);
  const booked = await Appointment.find({ doctor: doctor._id, date, status: { $in: ACTIVE_STATUSES } }).distinct('slot');
  const slots = generateSlots(doctor, date).map((time) => ({
    time,
    available: doctor.isAvailable && !booked.includes(time) && !isPast(date, time),
  }));
  res.json({ date, slotDuration: doctor.slotDuration, slots });
});

// GET /api/doctors/me/profile  (doctor)
export const getMyProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id })
    .select('-verification.verifiedBy -verification.hprCheck')
    .populate('user', PUBLIC_USER_FIELDS)
      .populate('hospital', HOSPITAL_SUMMARY_FIELDS);
  if (!doctor) throw new AppError('Doctor profile not found', 404);
  res.json({ doctor });
});

const DOCTOR_EDITABLE = [
  'specialization',
  'qualifications',
  'experience',
  'fees',
  'about',
  'clinicAddress',
  'slotDuration',
  'availability',
  'isAvailable',
  'state',
  'city',
  'pincode',
  'registrationNumber',
  'medicalCouncil',
  'registrationYear',
  'hprId',
  'hospital',
];
// Changing any of these means an admin must verify the doctor again.
const REVERIFY_FIELDS = ['registrationNumber', 'medicalCouncil', 'registrationYear', 'hprId'];

// PUT /api/doctors/me/profile  (doctor)
export const updateMyProfile = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => DOCTOR_EDITABLE.includes(key)));

  for (const w of updates.availability || []) {
    if (!(w.start < w.end)) throw new AppError(`Availability window ${w.start}-${w.end} must end after it starts`, 400);
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  // Hospital affiliation: empty clears it; otherwise it must be a hospital in the doctor's state.
  if ('hospital' in updates) {
    if (!updates.hospital) {
      updates.hospital = undefined;
    } else {
      if (!mongoose.isValidObjectId(updates.hospital)) throw new AppError('Invalid hospital', 400);
      const h = await Hospital.findById(updates.hospital).select('state');
      if (!h) throw new AppError('Hospital not found', 404);
      if (h.state !== (updates.state || doctor.state)) throw new AppError('Choose a hospital in the state you practise in', 400);
    }
  }

  const registrationChanged = REVERIFY_FIELDS.some(
    (key) => key in updates && String(updates[key] ?? '') !== String(doctor[key] ?? '')
  );
  doctor.set(updates);
  if (registrationChanged && doctor.verification.status !== 'pending') {
    doctor.verification = { status: 'pending', note: 'Registration details changed - awaiting re-verification' };
  }
  await doctor.save();

  res.json({
    doctor: await Doctor.findById(doctor._id)
      .select('-verification.verifiedBy -verification.hprCheck')
      .populate('user', PUBLIC_USER_FIELDS)
      .populate('hospital', HOSPITAL_SUMMARY_FIELDS),
  });
});
