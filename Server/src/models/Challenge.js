const mongoose = require('mongoose')
const feedbackSchema = new mongoose.Schema({ difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true }, submittedAt: { type: Date, default: Date.now } }, { _id: false })
const challengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSkill', required: true, index: true },
  challengeDate: { type: String, required: true },
  timezone: { type: String, required: true },
  kind: { type: String, enum: ['daily', 'on_demand'], default: 'daily', required: true },
  requestId: { type: String, default: undefined },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 4000 },
  instructions: { type: [String], default: [] },
  examples: { type: [String], default: [] },
  topic: { type: String, required: true, maxlength: 150 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  resourceUrl: { type: String, default: '' },
  estimatedMinutes: { type: Number, min: 1, max: 240 },
  successCriteria: { type: [String], default: [] },
  adaptation: { level: String, reason: String },
  status: { type: String, enum: ['pending', 'solved', 'not solved'], default: 'pending' }, ratedDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: null }, completedAt: Date, feedbackHistory: { type: [feedbackSchema], default: [] },
}, { timestamps: true, autoIndex: false })
challengeSchema.index({ user: 1, challengeDate: 1 }, { unique: true, partialFilterExpression: { kind: 'daily' } })
challengeSchema.index({ user: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } })
challengeSchema.index({ user: 1, createdAt: -1 })
module.exports = mongoose.model('Challenge', challengeSchema)
