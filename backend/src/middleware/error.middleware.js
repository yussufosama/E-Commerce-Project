export function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

// Express recognizes error middleware by its four parameters.
export function errorHandler(error, _req, res, _next) {
  if (error.publicMessage && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: 'A record with that identifier already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: 'Invalid data. Check the field types and allowed values.' });
  if (error.status === 503) return res.status(503).json({ error: 'Service busy. Try again shortly.' });
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  // Keep database details out of public responses.
  console.error('Request failed:', error.name);
  res.status(500).json({ error: 'Something went wrong.' });
}
