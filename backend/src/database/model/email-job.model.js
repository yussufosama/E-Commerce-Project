import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ['verify', 'reset'], required: true },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 86400000), expires: 0 },
}, { timestamps: true });
schema.index({ availableAt: 1, attempts: 1 });
export const EmailJob = mongoose.model('EmailJob', schema);
