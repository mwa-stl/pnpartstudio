// 404
export function notFound(req, res, next) {
  res.status(404).json({ message: 'Not Found' });
}

// Central error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
}
