import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  sessionVersion: { type: Number, default: 0, select: false },
  emailVerified: { type: Boolean, default: false },
  verificationHash: { type: String, select: false },
  verificationExpiresAt: { type: Date, select: false },
  resetHash: { type: String, select: false },
  resetExpiresAt: { type: Date, select: false },
}, { timestamps: true });

export const User = mongoose.model('User', schema);
