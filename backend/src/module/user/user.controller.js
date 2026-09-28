import * as service from './user.service.js';
import { validateCredentials } from './user.validation.js';
import { cookieOptions, sessionCookie } from '../../middleware/auth.middleware.js';

export async function register(req, res) {
  const input = validateCredentials(req.body, true);
  if (!input) return res.status(400).json({ error: 'Provide name, valid email, and a password of at least 15 characters (maximum 256 bytes). No extra fields allowed.' });
  await service.register(input);
  res.status(200).json({ message: 'If this email was available, your account was created. You can now try logging in.' });
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
