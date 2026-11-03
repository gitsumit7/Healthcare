import { Router } from 'express';
import {
  getStats,
  listDoctorsForReview,
  setVerification,
  checkHpr,
  listAppointments,
  setAppointmentStatus,
} from '../controllers/adminController.js';
import { importHospitals } from '../controllers/hospitalController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/stats', getStats);
router.get('/doctors', listDoctorsForReview);
router.patch('/doctors/:id/verification', setVerification);
router.post('/doctors/:id/hpr-check', checkHpr);
router.post('/hospitals/import', importHospitals);
router.get('/appointments', listAppointments);
router.patch('/appointments/:id/status', setAppointmentStatus);

export default router;
