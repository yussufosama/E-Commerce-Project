export function validateCredentials(body, registration = false) {
  const fields = registration ? ['name', 'email', 'password'] : ['email', 'password'];
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !fields.includes(key))) return null;
  if (typeof body.email !== 'string' || body.email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return null;
  if (typeof body.password !== 'string' || body.password.length < (registration ? 15 : 1)
    || Buffer.byteLength(body.password) > 256) return null;
  if (registration && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100)) return null;
  return { email: body.email.trim().toLowerCase(), password: body.password,
    ...(registration ? { name: body.name.trim() } : {}) };
}
