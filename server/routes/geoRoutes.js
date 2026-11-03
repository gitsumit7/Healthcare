import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { reverseGeocode } from '../utils/geocode.js';

const router = Router();

// POST /api/geo/reverse  { lat, lon }  -> { place }
// POST keeps the coordinates out of URLs, so they do not end up in request logs.
router.post(
  '/reverse',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many location lookups. Please wait a minute or type your location.' },
  }),
  asyncHandler(async (req, res) => {
    const lat = Number(req.body?.lat);
    const lon = Number(req.body?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new AppError('Valid lat and lon are required', 400);
    }
    let place;
    try {
      place = await reverseGeocode(lat, lon);
    } catch (err) {
      throw new AppError(`Could not look up this location (${err.message}). Please type it instead.`, 502);
    }
    if (!place) throw new AppError('No address found for this location. Please type it instead.', 404);
    res.json({ place });
  })
);

export default router;
