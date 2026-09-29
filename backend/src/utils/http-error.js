export function fail(status, message) {
  throw Object.assign(new Error(message), { status, publicMessage: true });
}

export function objectBody(body, keys) {
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).every(key => keys.includes(key));
}

export function validId(id) { return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id); }

export function pagination(query) {
  const page = query.page ?? '1';
  const limit = query.limit ?? '12';
  if (typeof page !== 'string' || typeof limit !== 'string'
    || !/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit)
    || Number(page) > 10000 || Number(limit) > 48) fail(400, 'Invalid pagination.');
  return { page: Number(page), limit: Number(limit) };
}
