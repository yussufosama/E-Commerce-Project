import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { fail } from '../../utils/http-error.js';
import { User } from '../../database/model/user.model.js';
import { Session } from '../../database/model/session.model.js';
import { hashPassword, verifyPassword } from './password.js';

export const sessionDuration = 8 * 60 * 60 * 1000;
export const digest = token => createHash('sha256').update(token).digest('hex');
export const publicUser = user => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified });

export async function register({ name, email, password }) {
  const passwordHash = await hashPassword(password);
  // Explicit fields prevent mass assignment of role or other protected values.
  try { await User.create({ name, email, passwordHash, role: 'customer' }); }
  catch (error) { if (error.code !== 11000) throw error; }
  // Same response for existing emails; registration does not create a session.
}

export async function login({ email, password }, previousToken) {
  const user = await User.findOne({ email }).select('+passwordHash +sessionVersion');
  if (!await verifyPassword(password, user?.passwordHash)) return null;
  if (!user.emailVerified) fail(403, 'Verify your email before logging in. Request a verification link.');
  if (previousToken) await Session.deleteOne({ tokenHash: digest(previousToken) });
  const token = randomBytes(32).toString('hex');
  await Session.create({ tokenHash: digest(token), user: user._id, version: user.sessionVersion, expiresAt: new Date(Date.now() + sessionDuration) });
  return { token, user: publicUser(user) };
}

export async function logout(token) {
  if (token) await Session.deleteOne({ tokenHash: digest(token) });
}

export async function changePassword(id, currentPassword, newPassword) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user || !await verifyPassword(currentPassword, user.passwordHash)) fail(401, 'Current password is incorrect.');
  const passwordHash = await hashPassword(newPassword);
  await mongoose.connection.transaction(async session => {
    const updated = await User.updateOne({ _id: id, passwordHash: user.passwordHash }, { $set: { passwordHash }, $inc: { sessionVersion: 1 }, $unset: { resetHash: '', resetExpiresAt: '' } }, { session });
    if (!updated.matchedCount) fail(409, 'Account changed. Log in again.');
    await Session.deleteMany({ user: id }, { session });
  });
}

export async function logoutAll(id) {
  await User.updateOne({ _id: id }, { $inc: { sessionVersion: 1 } });
  await Session.deleteMany({ user: id });
}
