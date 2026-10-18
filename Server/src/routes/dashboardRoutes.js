const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const { dashboard } = require('../controllers/challengeController')
router.get('/', requireAuth, asyncHandler(dashboard))
module.exports = router
