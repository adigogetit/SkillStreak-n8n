import test from 'node:test'
import assert from 'node:assert/strict'
import { getCreateNowFeedback } from '../src/utils/challengeNotification.js'

test('Create Now keeps success feedback and shows a warning when n8n email notification fails', () => {
  const feedback = getCreateNowFeedback({
    challenge: { id: 'saved-challenge-id' },
    notification: {
      status: 'failed',
      warning: 'Challenge saved, but n8n could not be reached.',
    },
  })

  assert.equal(feedback.message, 'Your personalized challenge was created and saved.')
  assert.equal(feedback.warning, 'Challenge saved, but n8n could not be reached.')
})
