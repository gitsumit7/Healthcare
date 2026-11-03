import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export const RESET_TOKEN_TTL_MINUTES = 15;
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      // Accounts created with Google have no password until they set one via "Forgot password".
      required: [function passwordRequired() { return !this.googleId; }, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
    medicalHistory: { type: String, trim: true, maxlength: 2000 },
    // Only the SHA-256 hash of the emailed reset token is stored.
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // Embedded in every JWT; bumping it on a password change invalidates all older sessions.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  if (!this.isNew) this.tokenVersion += 1;
  next();
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// Returns the raw token to email; stores only its hash with a 15-minute expiry.
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = hashToken(token);
  this.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return token;
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.tokenVersion;
    delete ret.googleId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
