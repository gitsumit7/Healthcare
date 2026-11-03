import User from '../models/User.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { signToken } from '../utils/token.js';

const EDITABLE = ['name', 'phone', 'gender', 'dateOfBirth', 'address', 'bloodGroup', 'medicalHistory'];

// PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => EDITABLE.includes(key)));
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ user });
});

// PUT /api/users/me/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user.password) {
    throw new AppError('Your account uses Google sign-in and has no password yet. Use "Forgot password" on the login page to set one.', 400);
  }
  if (!(await user.matchPassword(currentPassword || ''))) throw new AppError('Current password is incorrect', 400);
  user.password = newPassword;
  await user.save();
  // Changing the password invalidates older tokens, so hand back a fresh one for this session.
  res.json({ message: 'Password updated', token: signToken(user) });
});
