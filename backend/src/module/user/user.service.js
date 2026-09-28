import { createHash, randomBytes } from 'node:crypto';
import { User } from '../../database/model/user.model.js';
import { Session } from '../../database/model/session.model.js';
import { hashPassword, verifyPassword } from './password.js';

export const sessionDuration = 8 * 60 * 60 * 1000;
export const digest = token => createHash('sha256').update(token).digest('hex');
export const publicUser = user => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role });

export async function register({ name, email, password }) {
  const passwordHash = await hashPassword(password);
  // Explicit fields prevent mass assignment of role or other protected values.
  try { await User.create({ name, email, passwordHash, role: 'customer' }); }
  catch (error) { if (error.code !== 11000) throw error; }
  // Same response for existing emails; registration does not create a session.
}

export async function login({ email, password }, previousToken) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!await verifyPassword(password, user?.passwordHash)) return null;
  if (previousToken) await Session.deleteOne({ tokenHash: digest(previousToken) });
  const token = randomBytes(32).toString('hex');
  await Session.create({ tokenHash: digest(token), user: user._id, expiresAt: new Date(Date.now() + sessionDuration) });
  return { token, user: publicUser(user) };
}

export async function logout(token) {
  if (token) await Session.deleteOne({ tokenHash: digest(token) });
}
