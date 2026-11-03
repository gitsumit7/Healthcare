import mongoose from 'mongoose';
import Hospital from '../models/Hospital.js';
import Doctor, { PUBLIC_DOCTOR_FILTER } from '../models/Doctor.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { importHospitals as runImport, hospitalImportConfigured } from '../utils/hospitalImport.js';
import { escapeRegex } from './doctorController.js';

const MAX_PAGE_SIZE = 60;

// GET /api/hospitals?search=&state=&district=&pincode=&page=&limit=
export const listHospitals = asyncHandler(async (req, res) => {
  const { search, state, district, pincode } = req.query;
  const filter = {};
  if (state) filter.state = state;
  if (district) filter.district = new RegExp(`^${escapeRegex(String(district))}$`, 'i');
  if (pincode) filter.pincode = new RegExp(`^${escapeRegex(String(pincode).slice(0, 6))}`);
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ name: rx }, { address: rx }, { district: rx }, { specialties: rx }];
  }

  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 24));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [total, found] = await Promise.all([
    Hospital.countDocuments(filter),
    Hospital.find(filter).sort({ state: 1, district: 1, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  // How many verified doctors on MediCare Connect practise at each hospital on this page.
  const counts = await Doctor.aggregate([
    { $match: { ...PUBLIC_DOCTOR_FILTER, hospital: { $in: found.map((h) => h._id) } } },
    { $group: { _id: '$hospital', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  const hospitals = found.map(({ __v, ...h }) => ({ ...h, doctorCount: byId.get(String(h._id)) || 0 }));

  res.json({ count: hospitals.length, total, page, pages: Math.ceil(total / limit), configured: hospitalImportConfigured(), hospitals });
});

// GET /api/hospitals/:id -> hospital with its verified doctors on MediCare Connect
export const getHospital = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Hospital not found', 404);
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) throw new AppError('Hospital not found', 404);

  const doctors = await Doctor.find({ ...PUBLIC_DOCTOR_FILTER, hospital: hospital._id })
    .select('-verification.verifiedBy -verification.note -verification.hprCheck')
    .populate('user', 'name gender avatar')
    .sort({ specialization: 1 })
    .limit(200);
  res.json({ hospital, doctors });
});

// GET /api/hospitals/locations -> states with hospitals and their districts
export const listHospitalLocations = asyncHandler(async (_req, res) => {
  const rows = await Hospital.aggregate([
    { $match: { state: { $ne: null } } },
    { $group: { _id: { state: '$state', district: '$district' }, count: { $sum: 1 } } },
    { $sort: { '_id.state': 1, '_id.district': 1 } },
  ]);
  const states = new Map();
  for (const { _id, count } of rows) {
    const entry = states.get(_id.state) || { state: _id.state, count: 0, districts: [] };
    entry.count += count;
    if (_id.district) entry.districts.push({ district: _id.district, count });
    states.set(_id.state, entry);
  }
  res.json({ states: [...states.values()] });
});

// POST /api/admin/hospitals/import  { limit }  (admin)
export const importHospitals = asyncHandler(async (req, res) => {
  if (!hospitalImportConfigured()) {
    throw new AppError('Hospital import needs a data.gov.in API key. Add DATA_GOV_IN_API_KEY to server/.env and restart the server', 503);
  }
  try {
    const limit = Math.min(50000, Math.max(1, Number(req.body?.limit) || Number(process.env.HOSPITAL_IMPORT_LIMIT) || 5000));
    res.json(await runImport({ limit }));
  } catch (err) {
    throw new AppError(err.message, 502);
  }
});
