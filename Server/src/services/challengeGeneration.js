const User = require('../models/User')
const Challenge = require('../models/Challenge')
const Progress = require('../models/Progress')
const { dateInTimezone } = require('../utils/date')
const { recommend } = require('./adaptation')
const { generateChallenge } = require('./geminiService')
function localTime(timezone) { try { return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()) } catch { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()) } }
async function createChallenge(user, { kind, requestId } = {}, {
  challengeModel = Challenge,
  progressModel = Progress,
  generate = generateChallenge,
  getDate = dateInTimezone,
} = {}) {
  const challengeDate = getDate(user.timezone)
  if (kind === 'daily') {
    const existing = await challengeModel.findOne({ user: user._id, challengeDate, kind: 'daily' })
    if (existing) return { challenge: null, created: false }
  }
  if (requestId) {
    const existing = await challengeModel.findOne({ user: user._id, requestId })
    if (existing) return { challenge: existing, created: false }
  }
  const [recentChallenges, progress] = await Promise.all([
    challengeModel.find({ user: user._id }).sort({ createdAt: -1 }).limit(12),
    progressModel.findOne({ user: user._id }),
  ])
  const adaptation = recommend(progress?.outcomes || [])
  const generated = await generate({ user, recentChallenges, adaptation })
  try {
    const challenge = await challengeModel.create({
      user: user._id,
      challengeDate,
      timezone: user.timezone,
      kind,
      requestId,
      ...generated,
      adaptation: { level: adaptation.recommendedDifficulty, reason: adaptation.reason },
    })
    return { challenge, created: true }
  } catch (error) {
    if (error.code !== 11000) throw error
    if (requestId) return { challenge: await challengeModel.findOne({ user: user._id, requestId }), created: false }
    if (kind === 'daily') return { challenge: null, created: false }
    throw error
  }
}
async function createTodayChallenge(user) { return (await createChallenge(user, { kind: 'daily' })).challenge }
async function createOnDemandChallenge(user, requestId, dependencies) { return createChallenge(user, { kind: 'on_demand', requestId }, dependencies) }
async function generateDueChallenges() { const users = await User.find({ profileSetupComplete: true }); for (const user of users) { if (localTime(user.timezone) < user.notificationTime) continue; try { await createTodayChallenge(user) } catch (error) { console.error(`Challenge generation failed for user ${user.id}:`, error.message) } } }
function startChallengeScheduler() { generateDueChallenges().catch((error) => console.error('Initial challenge scheduler error:', error.message)); return setInterval(() => generateDueChallenges().catch((error) => console.error('Challenge scheduler error:', error.message)), 10 * 60 * 1000) }
module.exports = { createTodayChallenge, createOnDemandChallenge, generateDueChallenges, startChallengeScheduler }
