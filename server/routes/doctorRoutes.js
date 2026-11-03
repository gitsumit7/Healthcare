import { Router } from 'express';
import {
  listDoctors,
  listSpecializations,
  listLocations,
  getDoctor,
  getSlots,
  getMyProfile,
  updateMyProfile,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', listDoctors);
router.get('/specializations', listSpecializations);
router.get('/locations', listLocations);
router.route('/me/profile').get(protect, authorize('doctor'), getMyProfile).put(protect, authorize('doctor'), updateMyProfile);
router.get('/:id', getDoctor);
router.get('/:id/slots', getSlots);

export default router;
