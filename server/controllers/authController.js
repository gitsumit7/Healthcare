import { OAuth2Client } from 'google-auth-library';
import User, { hashToken, RESET_TOKEN_TTL_MINUTES } from '../models/User.js';
import Doctor from '../models/Doctor.js';
import AppError, { asyncHandler } from '../utils/AppError.js';
import { signToken } from '../utils/token.js';
import { sendEmail, emailConfigured } from '../utils/sendEmail.js';

// Emails that get admin access. Granted only through Google sign-in, which proves the person owns the
// inbox; password sign-up does not verify email, so it never grants admin.
const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const authPayload = async (user) => {
  const payload = { token: signToken(user), user };
  if (user.role === 'doctor') payload.doctor = await Doctor.findOne({ user: user._id });
  return payload;
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gender, role = 'patient', doctorProfile = {} } = req.body;

  if (!['patient', 'doctor'].includes(role)) throw new AppError('Invalid role', 400);
  if (role === 'doctor') {
    const missing = ['specialization', 'registrationNumber', 'medicalCouncil', 'state', 'city'].filter((k) => !doctorProfile[k]);
    if (missing.length) throw new AppError(`Missing doctor details: ${missing.join(', ')}`, 400);
  }
  if (await User.exists({ email: String(email || '').toLowerCase() })) {
    throw new AppError('Email is already registered', 409);
  }

  const user = await User.create({ name, email, password, phone, gender, role });

  if (role === 'doctor') {
    try {
      const {
        specialization, qualifications, experience, fees, about, clinicAddress,
        state, city, pincode, registrationNumber, medicalCouncil, registrationYear, hprId,
      } = doctorProfile;
      // New doctors start as "pending" and are hidden from patients until an admin verifies them.
      await Doctor.create({
        user: user._id,
        specialization,
        qualifications,
        experience,
        fees,
        about,
        clinicAddress,
        state,
        city,
        pincode: pincode || undefined,
        registrationNumber,
        medicalCouncil,
        registrationYear: registrationYear || undefined,
        hprId: hprId || undefined,
        verification: { status: 'pending' },
        // Sensible default: Mon-Fri, 10:00-13:00 and 15:00-18:00
        availability: [1, 2, 3, 4, 5].flatMap((day) => [
          { day, start: '10:00', end: '13:00' },
          { day, start: '15:00', end: '18:00' },
        ]),
      });
    } catch (err) {
      await user.deleteOne();
      throw err;
    }
  }

  res.status(201).json(await authPayload(user));
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (user && !user.password && user.googleId) {
    throw new AppError('This account uses Google sign-in. Continue with Google, or use "Forgot password" to set a password.', 401);
  }
  if (!user || !(await user.matchPassword(password))) throw new AppError('Invalid email or password', 401);

  res.json(await authPayload(user));
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const payload = { user: req.user };
  if (req.user.role === 'doctor') payload.doctor = await Doctor.findOne({ user: req.user._id });
  res.json(payload);
});

let googleClient;

// POST /api/auth/google  { credential }  - ID token from Google Identity Services
export const googleAuth = asyncHandler(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError('Google sign-in is not configured on the server (GOOGLE_CLIENT_ID missing)', 503);
  const { credential } = req.body;
  if (!credential) throw new AppError('Google credential is required', 400);

  googleClient ??= new OAuth2Client(clientId);
  let profile;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: String(credential), audience: clientId });
    profile = ticket.getPayload();
  } catch (err) {
    console.warn('Google ID token verification failed:', err.message);
    throw new AppError('Google sign-in failed: invalid or expired credential', 401);
  }
  if (!profile?.email || !profile.email_verified) throw new AppError('Your Google email address is not verified', 401);

  const email = profile.email.toLowerCase();
  const isAdminEmail = adminEmails().includes(email);
  let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
  let created = false;

  if (!user) {
    user = await User.create({
      name: profile.name || email.split('@')[0],
      email,
      googleId: profile.sub,
      avatar: profile.picture,
      role: isAdminEmail ? 'admin' : 'patient',
    });
    created = true;
  } else {
    let changed = false;
    if (!user.googleId) {
      // Same verified email as an existing account: link Google to it.
      user.googleId = profile.sub;
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      changed = true;
    }
    // A doctor keeps their role so their profile is not orphaned.
    if (isAdminEmail && user.role === 'patient' && user.email === email) {
      user.role = 'admin';
      changed = true;
    }
    if (changed) await user.save({ validateBeforeSave: false });
  }

  res.status(created ? 201 : 200).json({ ...(await authPayload(user)), created });
});

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FORGOT_RESPONSE = 'If an account exists for that email, a password reset link has been sent.';

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!email) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email });
  // Same response whether or not the account exists, so emails can't be enumerated.
  if (!user) return res.json({ message: FORGOT_RESPONSE, expiresInMinutes: RESET_TOKEN_TTL_MINUTES });

  const token = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your MediCare Connect password',
      text:
        `Hi ${user.name},\n\nWe received a request to reset your password. Open this link to choose a new one ` +
        `(valid for ${RESET_TOKEN_TTL_MINUTES} minutes):\n\n${resetUrl}\n\n` +
        `If you didn't request this, you can ignore this email - your password won't change.`,
      html:
        `<p>Hi ${escapeHtml(user.name)},</p><p>We received a request to reset your password. ` +
        `This link is valid for ${RESET_TOKEN_TTL_MINUTES} minutes:</p>` +
        `<p><a href="${resetUrl}">Reset my password</a></p>` +
        `<p>If you didn't request this, you can ignore this email - your password won't change.</p>`,
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Reset email failed:', err.message);
    throw new AppError('Could not send the reset email. Please try again later.', 500);
  }

  const payload = { message: FORGOT_RESPONSE, expiresInMinutes: RESET_TOKEN_TTL_MINUTES };
  // Without SMTP in development, hand the link back so the flow can be used locally.
  if (!emailConfigured() && process.env.NODE_ENV !== 'production') payload.devResetUrl = resetUrl;
  res.json(payload);
});

const findUserByResetToken = (token) =>
  User.findOne({
    resetPasswordToken: hashToken(String(token)),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

// GET /api/auth/reset-password/:token  (lets the UI reject dead links before showing the form)
export const checkResetToken = asyncHandler(async (req, res) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) throw new AppError('This reset link is invalid or has expired', 400);
  res.json({ valid: true, email: user.email });
});

// POST /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const user = await findUserByResetToken(req.params.token);
  if (!user) throw new AppError('This reset link is invalid or has expired', 400);

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful', ...(await authPayload(user)) });
});
