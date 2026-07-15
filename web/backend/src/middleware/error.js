export function errorHandler(err, _req, res, _next) {
  const status = Number(err.status || 500);
  res.status(status).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
}
