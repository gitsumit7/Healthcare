import { Router } from 'express';
import { bookAppointment, checkOut, myAppointments, updateStatus } from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/', authorize('patient'), bookAppointment);
router.get('/me', authorize('patient', 'doctor'), myAppointments);
router.patch('/:id/status', authorize('patient', 'doctor'), updateStatus);
router.patch('/:id/checkout', authorize('doctor'), checkOut);

export default router;
