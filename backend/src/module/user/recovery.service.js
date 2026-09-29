import mongoose from 'mongoose';
import { randomBytes, createHash } from 'node:crypto';
import { User } from '../../database/model/user.model.js';
import { Session } from '../../database/model/session.model.js';
import { hashPassword } from './password.js';
import { fail } from '../../utils/http-error.js';
import { sendAccountEmail, mailConfigured } from '../../config/mail.js';

const digest = token => createHash('sha256').update(token).digest('hex');
const validToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export function createRecoveryService({ sendMail = sendAccountEmail, configured = mailConfigured } = {}) {
  async function requestEmail(email, purpose) {
    if (!configured()) fail(503, 'Email delivery is not configured yet.');
    const reset = purpose === 'reset';
    const token = randomBytes(32).toString('hex');
    const hashField = reset ? 'resetHash' : 'verificationHash';
    const expiresField = reset ? 'resetExpiresAt' : 'verificationExpiresAt';
    const expiresAt = new Date(Date.now() + (reset ? 15 : 60) * 60 * 1000);
    const user = await User.findOneAndUpdate({ email, ...(reset ? {} : { emailVerified: false }) },
      { $set: { [hashField]: digest(token), [expiresField]: expiresAt } }, { returnDocument: 'after' });
    if (!user) return;
    // Fragment tokens do not reach access logs or the Referer header.
    const url = new URL(process.env.APP_ORIGIN);
    url.hash = `${reset ? 'reset-password' : 'verify-email'}=${token}`;
    try {
      await sendMail({ to: user.email, subject: reset ? 'Reset your Triple-Seven password' : 'Verify your Triple-Seven email',
        text: `${reset ? 'Reset your password' : 'Verify your email'} using this single-use link: ${url.toString()}\nThis link expires in ${reset ? '15' : '60'} minutes. If you did not request this, ignore this email.` });
    } catch {
      // Preserve a generic account response; do not expose tokens, SMTP errors, or account existence.
      console.error('Account email delivery failed. Check SMTP configuration.');
      await User.updateOne({ _id: user._id, [hashField]: digest(token) }, { $unset: { [hashField]: '', [expiresField]: '' } });
      throw new Error('Email delivery failed.');
    }
  }

  async function verifyEmail(token, password) {
    if (!validToken(token)) fail(400, 'Invalid or expired verification link.');
    if (!await User.exists({ verificationHash: digest(token), verificationExpiresAt: { $gt: new Date() } })) fail(400, 'Invalid or expired verification link.');
    // The mailbox owner chooses the final password, preventing pre-registered account takeover.
    const passwordHash = await hashPassword(password);
    await mongoose.connection.transaction(async session => {
      const user = await User.findOneAndUpdate({ verificationHash: digest(token), verificationExpiresAt: { $gt: new Date() } },
        { $set: { emailVerified: true, passwordHash }, $unset: { verificationHash: '', verificationExpiresAt: '', resetHash: '', resetExpiresAt: '' }, $inc: { sessionVersion: 1 } }, { session });
      if (!user) fail(400, 'Invalid or expired verification link.');
      await Session.deleteMany({ user: user._id }, { session });
    });
  }

  async function resetPassword(token, password) {
    if (!validToken(token)) fail(400, 'Invalid or expired reset link.');
    const hash = digest(token);
    if (!await User.exists({ resetHash: hash, resetExpiresAt: { $gt: new Date() } })) fail(400, 'Invalid or expired reset link.');
    const passwordHash = await hashPassword(password);
    await mongoose.connection.transaction(async session => {
      const user = await User.findOneAndUpdate({ resetHash: hash, resetExpiresAt: { $gt: new Date() } },
        { $set: { passwordHash, emailVerified: true }, $inc: { sessionVersion: 1 },
          $unset: { resetHash: '', resetExpiresAt: '', verificationHash: '', verificationExpiresAt: '' } }, { session });
      if (!user) fail(400, 'Invalid or expired reset link.');
      await Session.deleteMany({ user: user._id }, { session });
    });
  }
  return { requestEmail, verifyEmail, resetPassword };
}
