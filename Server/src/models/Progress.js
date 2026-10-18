const mongoose = require('mongoose')
const outcomeSchema = new mongoose.Schema({ challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }, date: String, status: { type: String, enum: ['solved', 'not solved'] }, ratedDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', null], default: null }, completedAt: Date }, { _id: false })
const progressSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSkill', required: true, unique: true }, completionDates: { type: [String], default: [] }, currentStreak: { type: Number, default: 0 }, longestStreak: { type: Number, default: 0 }, completedChallengeCount: { type: Number, default: 0 }, outcomes: { type: [outcomeSchema], default: [] }, difficultyProgression: { type: [outcomeSchema], default: [] }, adaptationHistory: { type: [{ recommendedDifficulty: String, reason: String, createdAt: { type: Date, default: Date.now } }], default: [] } }, { timestamps: true })
progressSchema.pre('validate', function () {
  this.difficultyProgression.forEach((entry) => {
    if (entry.status === 'pending') entry.status = undefined
  })
})
module.exports = mongoose.model('Progress', progressSchema)
