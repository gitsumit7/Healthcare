import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  me,
  googleAuth,
  forgotPassword,
  checkResetToken,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please wait a few minutes and try again.' },
  });
const authLimiter = limiter(50);
// Tighter cap on the endpoint that sends emails; reset tokens are 256-bit random, so the
// reset endpoints only need the normal auth limit.
const forgotLimiter = limiter(10);

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.get('/me', protect, me);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.route('/reset-password/:token').get(authLimiter, checkResetToken).post(authLimiter, resetPassword);

export default router;
