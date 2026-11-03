import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError, { asyncHandler } from '../utils/AppError.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Not authorized, no token', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Not authorized, invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists', 401);
  if ((decoded.v ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new AppError('Password was changed recently. Please log in again.', 401);
  }
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Role '${req.user.role}' is not allowed to access this resource`, 403));
  }
  next();
};
