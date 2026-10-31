export function notFound(req, res, next) {
  res.status(404).json({ message: `Not found - ${req.originalUrl}` })
}

export function errorHandler(err, req, res, next) {
  console.error(err)
  const status = res.statusCode === 200 ? 500 : res.statusCode
  res.status(status).json({
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}
