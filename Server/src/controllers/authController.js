const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const User = require('../models/User')
const { jwtSecret, jwtExpiresIn, cookieSecure } = require('../config/env')
const credentials = z.object({ name: z.string().trim().min(2).max(100).optional(), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) })
const cookieOptions = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
const clearCookieOptions = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/' }
function sendSession(res, user) { const token = jwt.sign({ sub: user._id }, jwtSecret, { expiresIn: jwtExpiresIn }); res.cookie('skillstreak_session', token, cookieOptions).json({ user: user.toClient() }) }
exports.csrf = (req, res) => { res.cookie('skillstreak_csrf', crypto.randomBytes(32).toString('hex'), { httpOnly: false, secure: cookieSecure, sameSite: 'lax', path: '/' }).json({ message: 'CSRF token issued.' }) }
exports.register = async (req, res) => { const input = credentials.extend({ name: z.string().trim().min(2).max(100) }).parse(req.body); const exists = await User.exists({ email: input.email.toLowerCase() }); if (exists) return res.status(409).json({ message: 'An account with that email already exists.' }); const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) }); sendSession(res, user) }
exports.login = async (req, res) => { const input = credentials.pick({ email: true, password: true }).parse(req.body); const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash'); if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' }); sendSession(res, user) }
exports.logout = (req, res) => { res.clearCookie('skillstreak_session', clearCookieOptions).status(204).send() }
exports.me = (req, res) => res.json({ user: req.user.toClient() })
