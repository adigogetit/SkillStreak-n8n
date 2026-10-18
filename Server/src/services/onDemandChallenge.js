const { createOnDemandChallenge } = require('./challengeGeneration')
const { sendChallengeNotification } = require('./notificationService')

async function createOnDemandChallengeWithNotification(user, requestId, {
  createChallenge = createOnDemandChallenge,
  notify = sendChallengeNotification,
} = {}) {
  const result = await createChallenge(user, requestId)
  if (!result.created) {
    return {
      ...result,
      notification: { status: 'not_sent', warning: '' },
    }
  }
  try {
    return { ...result, notification: await notify(user, result.challenge) }
  } catch {
    console.warn('n8n challenge notification failed after the challenge was saved.')
    return {
      ...result,
      notification: {
        status: 'failed',
        warning: 'Challenge saved, but the notification could not be triggered. Check n8n configuration and try again later.',
      },
    }
  }
}

module.exports = { createOnDemandChallengeWithNotification }
