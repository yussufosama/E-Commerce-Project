import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let active = 0;

async function hash(password, salt) {
  // Bound memory consumption from simultaneous expensive password operations.
  if (active >= 2) throw Object.assign(new Error('Authentication busy. Try again shortly.'), { status: 503 });
  active++;
  try { return await derive(password, salt, 64, options); }
  finally { active--; }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await hash(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  // Still perform the expensive hash for an unknown email.
  const [salt, expected] = stored ? stored.split(':') : ['0'.repeat(32), '0'.repeat(128)];
  const actual = await hash(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && Boolean(stored);
}
