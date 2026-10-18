exports.notFound = (req, res) => res.status(404).json({ message: 'Endpoint not found.' })
exports.errorHandler = (err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' })
  if (err.name === 'MulterError') return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'PDF must be 5 MB or smaller.' : err.message })
  if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid request data.', errors: err.flatten() })
  console.error(err)
  res.status(err.status || 500).json({ message: err.expose ? err.message : 'Something went wrong.' })
}
