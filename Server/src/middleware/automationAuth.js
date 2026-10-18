const crypto = require('crypto')
const { automationApiKey } = require('../config/env')
module.exports = (req, res, next) => { const provided = req.get('X-Automation-Key') || ''; if (!automationApiKey || provided.length !== automationApiKey.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(automationApiKey))) return res.status(401).json({ message: 'Automation authentication required.' }); next() }
