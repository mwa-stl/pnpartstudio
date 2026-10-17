// 404
export function notFound(req, res, next) {
  res.status(404).json({ message: 'Not Found' });
}

// Central error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500;
  // Client errors carry a message meant for the caller; server errors never
  // leak internals (driver errors, stack hints, query shapes) to the browser.
  const message = status < 500 || process.env.NODE_ENV !== 'production'
    ? (err.message || 'Request failed')
    : 'Server error';
  res.status(status).json({ message });
}
