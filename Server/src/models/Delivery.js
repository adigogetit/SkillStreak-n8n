const mongoose = require('mongoose')
const deliverySchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSkill', required: true }, challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true }, channel: { type: String, enum: ['email'], required: true }, type: { type: String, enum: ['challenge', 'reminder'], default: 'challenge' }, status: { type: String, enum: ['sent', 'failed'], required: true }, error: { type: String, default: '' }, sentAt: { type: Date, default: Date.now } }, { timestamps: true })
deliverySchema.index({ challenge: 1, channel: 1, type: 1 }, { unique: true })
module.exports = mongoose.model('Delivery', deliverySchema)
