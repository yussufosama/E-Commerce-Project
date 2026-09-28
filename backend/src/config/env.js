export function getServerConfig() {
  const port = Number(process.env.PORT || 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535.');
  }

  return { port, host: process.env.HOST || '127.0.0.1' };
}
