const router = require('express').Router()
const auth = require('../middleware/automationAuth')
const controller = require('../controllers/automationController')
const asyncHandler = require('../middleware/asyncHandler')
router.use(auth)
router.get('/notifications/due', asyncHandler(controller.dueNotifications))
router.post('/deliveries', asyncHandler(controller.recordDelivery))
module.exports = router
