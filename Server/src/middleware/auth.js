const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { jwtSecret } = require('../config/env')

exports.requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.skillstreak_session
    if (!token) return res.status(401).json({ message: 'Authentication required.' })
    const payload = jwt.verify(token, jwtSecret)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'Session is no longer valid.' })
    req.user = user
    next()
  } catch { res.status(401).json({ message: 'Invalid or expired session.' }) }
}

exports.requireCsrf = (req, res, next) => {
  const header = req.get('X-CSRF-Token')
  if (!header || !req.cookies.skillstreak_csrf || header !== req.cookies.skillstreak_csrf) return res.status(403).json({ message: 'Invalid CSRF token.' })
  next()
}
