import { Session } from '../database/model/session.model.js';
import { digest, publicUser } from '../module/user/user.service.js';

export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-triple_seven_session' : 'triple_seven_session';
export const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[sessionCookie];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  // Check expiry explicitly: MongoDB TTL deletion is not immediate.
  const session = await Session.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } }).populate('user');
  if (!session?.user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = publicUser(session.user);
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Access denied.' });
    next();
  };
}

export function protectBrowserWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Custom header + JSON prevent simple cross-origin forms. No permissive CORS.
  const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5000';
  if (req.get('X-Requested-With') !== 'TripleSeven' || !req.is('application/json')
    || (req.get('Origin') && req.get('Origin') !== origin)
    || req.get('Sec-Fetch-Site') === 'cross-site') {
    return res.status(403).json({ error: 'Request origin or security headers rejected.' });
  }
  next();
}
