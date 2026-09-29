import * as service from './user.service.js';
import { validateCredentials } from './user.validation.js';
import { cookieOptions, sessionCookie } from '../../middleware/auth.middleware.js';
import { objectBody } from '../../utils/http-error.js';

export async function register(req, res) {
  const input = validateCredentials(req.body, true);
  if (!input) return res.status(400).json({ error: 'Provide name, valid email, and a password of at least 15 characters (maximum 256 bytes). No extra fields allowed.' });
  await service.register(input);
  res.status(200).json({ message: 'If this email was available, your account was created. Request a verification email before logging in.' });
}

export async function login(req, res) {
  const input = validateCredentials(req.body);
  if (!input) return res.status(400).json({ error: 'Provide valid email and password fields.' });
  const result = await service.login(input, req.cookies?.[sessionCookie]);
  if (!result) return res.status(401).json({ error: 'Invalid email or password.' });
  res.cookie(sessionCookie, result.token, { ...cookieOptions, maxAge: service.sessionDuration });
  res.json({ user: result.user });
}

export async function logout(req, res) {
  await service.logout(req.cookies?.[sessionCookie]);
  res.clearCookie(sessionCookie, cookieOptions);
  res.status(204).end();
}

export function me(req, res) { res.json({ user: req.user }); }

export async function changePassword(req, res) {
  const body = req.body;
  if (!objectBody(body, ['currentPassword', 'newPassword']) || typeof body.currentPassword !== 'string'
    || !body.currentPassword || Buffer.byteLength(body.currentPassword) > 256
    || typeof body.newPassword !== 'string' || body.newPassword.length < 15 || Buffer.byteLength(body.newPassword) > 256) {
    return res.status(400).json({ error: 'Provide currentPassword and newPassword (15 characters minimum, 256 bytes maximum).' });
  }
  await service.changePassword(req.user.id, body.currentPassword, body.newPassword);
  res.clearCookie(sessionCookie, cookieOptions);
  res.status(204).end();
}

export async function logoutAll(req, res) {
  await service.logoutAll(req.user.id);
  res.clearCookie(sessionCookie, cookieOptions);
  res.status(204).end();
}
