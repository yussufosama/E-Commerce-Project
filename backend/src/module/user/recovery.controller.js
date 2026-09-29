import { createRecoveryService } from './recovery.service.js';
import { objectBody } from '../../utils/http-error.js';
import { EmailJob } from '../../database/model/email-job.model.js';
import { mailConfigured } from '../../config/mail.js';

const service = createRecoveryService();
export function requestEmail(purpose) {
  return async (req, res) => {
    if (!objectBody(req.body, ['email']) || typeof req.body.email !== 'string' || req.body.email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim())) return res.status(400).json({ error: 'Provide a valid email address.' });
    // Queue the same work for existing and missing emails; SMTP runs outside the request.
    if (!mailConfigured()) return res.status(503).json({ error: 'Email delivery is not configured yet.' });
    await EmailJob.create({ email: req.body.email.trim().toLowerCase(), purpose });
    res.status(202).json({ message: 'If the account is eligible, an email will be sent. Check your inbox and spam folder.' });
  };
}
export async function verify(req, res) {
  if (!objectBody(req.body, ['token', 'newPassword']) || typeof req.body.newPassword !== 'string' || req.body.newPassword.length < 15 || Buffer.byteLength(req.body.newPassword) > 256) return res.status(400).json({ error: 'Provide token and your chosen password (15 characters minimum, 256 bytes maximum).' });
  await service.verifyEmail(req.body.token, req.body.newPassword);
  res.json({ message: 'Email verified. Please log in.' });
}
export async function reset(req, res) {
  const body = req.body;
  if (!objectBody(body, ['token', 'newPassword']) || typeof body.newPassword !== 'string' || body.newPassword.length < 15 || Buffer.byteLength(body.newPassword) > 256) {
    return res.status(400).json({ error: 'Provide token and a new password (at least 15 characters, at most 256 bytes).' });
  }
  await service.resetPassword(body.token, body.newPassword);
  res.json({ message: 'Password reset. Please log in again.' });
}
