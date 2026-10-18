const { z } = require('zod')
const User = require('../models/User')
const Challenge = require('../models/Challenge')
const Delivery = require('../models/Delivery')
const { dateInTimezone } = require('../utils/date')

exports.recordDelivery = async (req, res) => {
  const input = z.object({
    userId: z.string(),
    challengeId: z.string(),
    channel: z.literal('email'),
    type: z.enum(['challenge', 'reminder']).default('challenge'),
    status: z.enum(['sent', 'failed']),
    error: z.string().max(1000).optional().default(''),
  }).parse(req.body)

  try {
    await Delivery.create({
      user: input.userId,
      challenge: input.challengeId,
      channel: input.channel,
      type: input.type,
      status: input.status,
      error: input.error,
    })
    res.status(201).json({ recorded: true })
  } catch (error) {
    if (error.code === 11000) return res.json({ recorded: false, duplicate: true })
    throw error
  }
}

exports.dueNotifications = async (req, res) => {
  const users = await User.find({ profileSetupComplete: true })
  const notifications = []

  for (const user of users) {
    const challenge = await Challenge.findOne({
      user: user._id,
      challengeDate: dateInTimezone(user.timezone),
      kind: 'daily',
    })
    if (!challenge) continue

    const delivered = await Delivery.exists({
      challenge: challenge._id,
      channel: 'email',
      type: 'challenge',
    })
    if (delivered) continue

    notifications.push({
      challengeId: String(challenge._id),
      userId: String(user._id),
      channel: 'email',
      email: user.email,
      title: challenge.title,
      topic: challenge.topic,
      difficulty: challenge.difficulty,
      description: challenge.description,
      resourceUrl: challenge.resourceUrl,
    })
  }

  res.json({ notifications })
}
