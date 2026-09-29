export function getServerConfig() {
  if (process.env.NODE_ENV === 'production') {
    let origin;
    try { origin = new URL(process.env.APP_ORIGIN); } catch { throw new Error('Production requires APP_ORIGIN with an HTTPS origin.'); }
    if (origin.protocol !== 'https:' || origin.origin !== process.env.APP_ORIGIN) throw new Error('Production APP_ORIGIN must be an HTTPS origin without a trailing slash.');
  }
  const port = Number(process.env.PORT || 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535.');
  }

  return { port, host: process.env.HOST || '127.0.0.1' };
}
