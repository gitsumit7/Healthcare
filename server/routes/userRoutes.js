import { Router } from 'express';
import { updateMe, changePassword } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.put('/me', protect, updateMe);
router.put('/me/password', protect, changePassword);

export default router;
