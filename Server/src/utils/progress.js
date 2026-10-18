const Progress = require('../models/Progress')
function priorDate(date) { const value = new Date(`${date}T12:00:00.000Z`); value.setUTCDate(value.getUTCDate() - 1); return value.toISOString().slice(0, 10) }
function formatDate(value) { return new Date(value).toISOString().slice(0, 10) }
function makeDifficultyProgressEntry(challenge, difficulty) {
  const entry = {
    challenge: challenge._id,
    date: challenge.challengeDate,
    ratedDifficulty: difficulty,
  }
  if (challenge.status === 'solved' || challenge.status === 'not solved') {
    entry.status = challenge.status
    entry.completedAt = challenge.completedAt
  }
  return entry
}
function computeStreak(dates) {
  const uniqueDates = [...new Set(dates)].sort()
  if (!uniqueDates.length) return 0
  let streak = 0
  let cursor = uniqueDates.at(-1)
  while (cursor) {
    const next = uniqueDates.includes(cursor)
    if (!next) break
    streak += 1
    cursor = priorDate(cursor)
    if (cursor === uniqueDates.at(-1)) break
  }
  return streak
}
async function refreshProgress(userId) {
  const progress = await Progress.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { new: true, upsert: true })
  const dates = [...new Set(progress.completionDates || [])].sort()
  const currentStreak = computeStreak(dates)
  progress.completionDates = dates; progress.currentStreak = currentStreak; progress.longestStreak = Math.max(progress.longestStreak || 0, currentStreak); progress.completedChallengeCount = dates.length
  await progress.save(); return progress
}
async function recordOutcome(challenge) {
  const progress = await Progress.findOneAndUpdate({ user: challenge.user }, { $setOnInsert: { user: challenge.user } }, { new: true, upsert: true })
  const index = progress.outcomes.findIndex((item) => String(item.challenge) === String(challenge._id))
  const previousOutcome = index >= 0 ? progress.outcomes[index] : null
  const outcome = { challenge: challenge._id, date: challenge.challengeDate, status: challenge.status, ratedDifficulty: challenge.ratedDifficulty, completedAt: challenge.completedAt }
  if (index >= 0) progress.outcomes[index] = outcome; else progress.outcomes.push(outcome)
  const otherSolvedForDate = progress.outcomes.some((item) => String(item.challenge) !== String(challenge._id) && item.date === challenge.challengeDate && item.status === 'solved')
  const completionDates = new Set(progress.completionDates)
  if (challenge.status === 'solved') completionDates.add(challenge.challengeDate)
  else if (previousOutcome?.status === 'solved' && !otherSolvedForDate) completionDates.delete(challenge.challengeDate)
  progress.completionDates = [...completionDates]
  await progress.save(); return refreshProgress(challenge.user)
}
module.exports = { refreshProgress, recordOutcome, makeDifficultyProgressEntry }
