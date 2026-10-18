const { z } = require('zod')
const Challenge = require('../models/Challenge')
const Progress = require('../models/Progress')
const { dateInTimezone, weekDates, monthDates } = require('../utils/date')
const { recordOutcome, refreshProgress, makeDifficultyProgressEntry } = require('../utils/progress')
const { createOnDemandChallengeWithNotification } = require('../services/onDemandChallenge')
async function ownChallenge(id, userId) { const challenge = await Challenge.findOne({ _id: id, user: userId }); if (!challenge) { const err = new Error('Challenge not found.'); err.status = 404; err.expose = true; throw err } return challenge }
function challengePayload(challenge) {
  if (!challenge) return null
  return {
    id: String(challenge._id),
    title: challenge.title,
    topic: challenge.topic,
    difficulty: challenge.difficulty,
    description: challenge.description,
    instructions: challenge.instructions || [],
    examples: challenge.examples || [],
    resourceUrl: challenge.resourceUrl,
    estimatedMinutes: challenge.estimatedMinutes,
    successCriteria: challenge.successCriteria || [],
    status: challenge.status,
    kind: challenge.kind || 'daily',
    challengeDate: challenge.challengeDate,
  }
}
exports.today = async (req, res) => { const date = dateInTimezone(req.user.timezone); const challenge = await Challenge.findOne({ user: req.user._id, challengeDate: date, kind: 'daily' }); res.json({ challenge }) }
exports.history = async (req, res) => { const challenges = await Challenge.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60); res.json({ challenges }) }
exports.createNow = async (req, res) => {
  const { requestId } = z.object({ requestId: z.string().uuid() }).parse(req.body)
  if (!req.user.profileSetupComplete || !req.user.targetRole?.trim()) {
    return res.status(400).json({ message: 'Complete and save your profile with a target role before generating a challenge.' })
  }
  const result = await createOnDemandChallengeWithNotification(req.user, requestId)
  res.status(result.created ? 201 : 200).json({
    challenge: challengePayload(result.challenge),
    notification: result.notification,
  })
}
exports.updateStatus = async (req, res) => { const { status } = z.object({ status: z.enum(['Solved', 'Not solved', 'solved', 'not solved']) }).parse(req.body); const challenge = await ownChallenge(req.params.id, req.user._id); const normalized = status.toLowerCase(); if (challenge.status === normalized) return res.json({ challenge, message: 'Challenge status already recorded.' }); challenge.status = normalized; challenge.completedAt = new Date(); await challenge.save(); await recordOutcome(challenge); res.json({ challenge }) }
exports.feedback = async (req, res) => {
  const { difficulty } = z.object({ difficulty: z.enum(['Easy', 'Medium', 'Hard']) }).parse(req.body)
  const challenge = await ownChallenge(req.params.id, req.user._id)
  if (challenge.ratedDifficulty === difficulty) return res.json({ challenge, message: 'Feedback already recorded.' })
  challenge.ratedDifficulty = difficulty
  challenge.feedbackHistory.push({ difficulty })
  await challenge.save()
  const progress = await Progress.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id }, $push: { difficultyProgression: makeDifficultyProgressEntry(challenge, difficulty) } },
    { new: true, upsert: true },
  )
  const outcome = progress.outcomes.find((item) => String(item.challenge) === String(challenge._id))
  if (outcome) {
    outcome.ratedDifficulty = difficulty
    await progress.save()
  }
  res.json({ challenge, progress })
}
exports.dashboard = async (req, res) => {
  const today = dateInTimezone(req.user.timezone)
  const [todayChallenge, latestChallenge, challenges, progress] = await Promise.all([
    Challenge.findOne({ user: req.user._id, challengeDate: today, kind: 'daily' }),
    Challenge.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
    Challenge.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
    refreshProgress(req.user._id),
  ])
  const dates = weekDates(req.user.timezone)
  const todayDate = dateInTimezone(req.user.timezone)
  const year = Number(todayDate.slice(0, 4))
  const completionDates = progress.completionDates || []
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    const days = monthDates(req.user.timezone, new Date(Date.UTC(year, index, 15, 12)))
    return {
      month,
      completed: days.filter((date) => completionDates.includes(date)).length,
      days: days.map((date) => ({ date, day: Number(date.slice(-2)), done: completionDates.includes(date), isToday: date === todayDate })),
    }
  })
  res.json({
    user: req.user.toClient(),
    stats: {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      totalCompleted: progress.completedChallengeCount,
      weeklyCompleted: progress.completionDates.filter((date) => dates.includes(date)).length,
    },
    todayChallenge: challengePayload(todayChallenge),
    latestChallenge: challengePayload(latestChallenge),
    weeklyProgress: dates.map((date, index) => ({ day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index], done: completionDates.includes(date) })),
    monthlyProgress: { year, months },
    recentChallenges: challenges.map((challenge) => ({
      ...challengePayload(challenge),
      status: challenge.status === 'pending' ? 'Pending' : challenge.status === 'solved' ? 'Solved' : 'Not solved',
    })),
  })
}
