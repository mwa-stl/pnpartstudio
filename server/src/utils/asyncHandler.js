// Minimal async wrapper for Express 4-style apps.
// Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
// Any thrown/rejected error is passed to next(), reaching your error middleware. [3]
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
