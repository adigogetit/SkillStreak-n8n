const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { sendChallengeNotification, webhookConfigurationError } = require('../src/services/notificationService')
const { createOnDemandChallenge } = require('../src/services/challengeGeneration')
const { createOnDemandChallengeWithNotification } = require('../src/services/onDemandChallenge')
const profileController = require('../src/controllers/profileController')

function mockChallengeStore() {
  let savedChallenge = null
  let createCount = 0
  return {
    model: {
      findOne: async (query) => query.requestId && savedChallenge?.requestId === query.requestId ? savedChallenge : null,
      find: () => ({ sort: () => ({ limit: async () => [] }) }),
      create: async (challenge) => {
        createCount += 1
        savedChallenge = { ...challenge, _id: 'saved-challenge-id' }
        return savedChallenge
      },
    },
    getSaved: () => savedChallenge,
    getCreateCount: () => createCount,
  }
}

test('Create Now persists one challenge and reuses it for duplicate request IDs', async () => {
  const store = mockChallengeStore()
  let generationCount = 0
  const dependencies = {
    challengeModel: store.model,
    progressModel: { findOne: async () => null },
    getDate: () => '2026-10-18',
    generate: async () => {
      generationCount += 1
      return { title: 'Short practice', topic: 'Arrays', difficulty: 'Easy', description: 'Practice one array operation.' }
    },
  }
  const first = await createOnDemandChallenge({ _id: 'user-id', timezone: 'UTC' }, 'request-1', dependencies)
  const retry = await createOnDemandChallenge({ _id: 'user-id', timezone: 'UTC' }, 'request-1', dependencies)

  assert.equal(first.created, true)
  assert.equal(first.challenge._id, 'saved-challenge-id')
  assert.equal(retry.created, false)
  assert.equal(retry.challenge._id, 'saved-challenge-id')
  assert.equal(store.getCreateCount(), 1)
  assert.equal(generationCount, 1)
})

test('n8n receives the account email and complete saved challenge after persistence', async () => {
  let request
  const user = { _id: 'user-id', email: 'member@example.test', telegram: { connected: true, chatId: 'legacy-chat' } }
  const challenge = {
    title: 'Find the largest number',
    topic: 'Arrays',
    difficulty: 'Easy',
    description: 'Write a function that returns the largest number in an array.',
    instructions: ['Compare each value with the current largest.'],
    examples: ['[2, 8, 3] -> 8'],
    successCriteria: ['Return 8 for [2, 8, 3].'],
    estimatedMinutes: 10,
  }
  const result = await sendChallengeNotification(user, challenge, {
    webhookUrl: 'https://n8n.example.test/webhook/skillstreak-challenge',
    apiKey: 'private-test-key',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200 }
    },
  })

  assert.equal(request.url, 'https://n8n.example.test/webhook/skillstreak-challenge')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  assert.equal(request.options.headers['X-Automation-Key'], 'private-test-key')
  assert.deepEqual(JSON.parse(request.options.body), {
    email: 'member@example.test',
    title: 'Find the largest number',
    topic: 'Arrays',
    difficulty: 'Easy',
    description: 'Write a function that returns the largest number in an array.',
    instructions: ['Compare each value with the current largest.'],
    examples: ['[2, 8, 3] -> 8'],
    successCriteria: ['Return 8 for [2, 8, 3].'],
    estimatedMinutes: 10,
  })
  assert.deepEqual(result, { status: 'triggered', emailConfigured: true, warning: '' })
})

test('missing webhook configuration is reported without making a request', async () => {
  let called = false
  const result = await sendChallengeNotification({ email: 'member@example.test' }, {}, {
    webhookUrl: '',
    apiKey: '',
    fetchImpl: async () => { called = true },
  })

  assert.equal(called, false)
  assert.equal(result.status, 'not_configured')
  assert.match(result.warning, /N8N_WEBHOOK_URL and N8N_AUTOMATION_API_KEY/)
  assert.doesNotMatch(result.warning, /private|secret/i)
})

test('malformed webhook URL and invalid timeout are clear configuration errors', () => {
  assert.match(webhookConfigurationError('not a URL', 'test-key', 8000), /N8N_WEBHOOK_URL must be a valid/)
  assert.match(webhookConfigurationError('https://n8n.example.test/webhook', 'test-key', 0), /N8N_WEBHOOK_TIMEOUT_MS/)
})

test('legacy Telegram settings are ignored and email notification succeeds without a Telegram warning', async () => {
  let payload
  const result = await sendChallengeNotification({ _id: 'user-id', email: 'member@example.test' }, {
    title: 'Saved challenge',
    topic: 'Arrays',
    difficulty: 'Easy',
    description: 'A short task.',
  }, {
    webhookUrl: 'https://n8n.example.test/webhook/skillstreak-challenge',
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body)
      return { ok: true, status: 200 }
    },
  })

  assert.equal(payload.email, 'member@example.test')
  assert.equal(Object.hasOwn(payload, 'telegramChatId'), false)
  assert.equal(result.status, 'triggered')
  assert.equal(result.warning, '')
})

test('missing email recipient is reported without calling n8n', async () => {
  let called = false
  const result = await sendChallengeNotification({ _id: 'user-id', email: '' }, {
    title: 'Saved challenge',
    topic: 'Arrays',
    difficulty: 'Easy',
    description: 'A short task.',
  }, {
    webhookUrl: 'https://n8n.example.test/webhook/skillstreak-challenge',
    apiKey: 'test-key',
    fetchImpl: async () => { called = true },
  })

  assert.equal(called, false)
  assert.equal(result.status, 'not_configured')
  assert.equal(result.emailConfigured, false)
  assert.match(result.warning, /no email address is configured/i)
})

test('n8n timeouts and non-success responses are non-blocking notification failures', async () => {
  const user = { email: 'member@example.test' }
  const challenge = { title: 'Saved challenge', topic: 'Arrays', difficulty: 'Easy', description: 'A short task.' }
  const options = {
    webhookUrl: 'https://n8n.example.test/webhook/skillstreak-challenge',
    apiKey: 'test-key',
  }
  const timeout = await sendChallengeNotification(user, challenge, {
    ...options,
    fetchImpl: async () => { throw new Error('request aborted') },
  })
  const rejected = await sendChallengeNotification(user, challenge, {
    ...options,
    fetchImpl: async () => ({ ok: false, status: 503 }),
  })

  assert.equal(timeout.status, 'failed')
  assert.match(timeout.warning, /could not be reached/)
  assert.equal(rejected.status, 'failed')
  assert.match(rejected.warning, /HTTP 503/)
})

test('a notification exception after save does not turn challenge creation into a failure', async () => {
  const saved = { _id: 'saved-challenge-id', title: 'Persisted challenge' }
  const order = []
  const result = await createOnDemandChallengeWithNotification({ _id: 'user-id' }, 'request-1', {
    createChallenge: async () => {
      order.push('saved')
      return { challenge: saved, created: true }
    },
    notify: async () => {
      order.push('notify')
      throw new Error('n8n unavailable')
    },
  })

  assert.deepEqual(order, ['saved', 'notify'])
  assert.equal(result.challenge, saved)
  assert.equal(result.notification.status, 'failed')
  assert.match(result.notification.warning, /Challenge saved/)
})

test('duplicate request IDs never trigger a second n8n notification', async () => {
  let notifications = 0
  const result = await createOnDemandChallengeWithNotification({ _id: 'user-id' }, 'request-1', {
    createChallenge: async () => ({ challenge: { _id: 'existing-id' }, created: false }),
    notify: async () => { notifications += 1 },
  })

  assert.equal(result.notification.status, 'not_sent')
  assert.equal(notifications, 0)
})

test('n8n workflow uses the POST path and dynamic Webhook body recipients', () => {
  const workflowPath = path.join(__dirname, '../n8n/challenge-webhook-workflow.json')
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
  const webhook = workflow.nodes.find((node) => node.name === 'SkillStreak Challenge Webhook')
  const email = workflow.nodes.find((node) => node.name === 'Send an Email')
  const emailText = email.parameters.text

  assert.equal(webhook.parameters.httpMethod, 'POST')
  assert.equal(webhook.parameters.path, 'skillstreak-challenge')
  assert.match(email.parameters.toEmail, /SkillStreak Challenge Webhook/)
  assert.equal(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.telegram'), false)
  for (const field of ['title', 'topic', 'difficulty', 'description', 'instructions', 'examples', 'successCriteria', 'estimatedMinutes']) {
    assert.match(emailText, new RegExp(`challenge\\.${field}`))
  }
  assert.match(emailText, /const incoming = \$\('SkillStreak Challenge Webhook'\)\.item\.json/)
  assert.match(emailText, /const challenge = incoming\.body \|\| incoming/)
  assert.match(email.parameters.subject, /challenge\.topic/)
})

test('Telegram delivery is rejected by the profile API', async () => {
  let responseStatus
  let responseBody
  let saved = false
  const response = {
    status(code) {
      responseStatus = code
      return this
    },
    json(body) {
      responseBody = body
    },
  }
  await assert.rejects(profileController.updateProfile({
    body: { targetRole: 'Software developer', deliveryChannel: 'telegram' },
    user: {
      save: async () => { saved = true },
    },
  }, response))

  assert.equal(responseStatus, undefined)
  assert.equal(responseBody, undefined)
  assert.equal(saved, false)
})

test('saving an existing profile resets its delivery channel to email', async () => {
  let savedFields
  let responseBody
  const user = {
    deliveryChannel: 'telegram',
    experienceLevel: 'Entry-level',
    skills: [],
    timezone: 'UTC',
    notificationTime: '09:00',
    careerProfile: {},
    set(fields) {
      savedFields = fields
      Object.assign(this, fields)
    },
    async save() {},
    toClient() {
      return { deliveryChannel: this.deliveryChannel }
    },
  }
  await profileController.updateProfile({
    body: { targetRole: 'Software developer' },
    user,
  }, {
    json(body) {
      responseBody = body
    },
  })

  assert.equal(savedFields.deliveryChannel, 'email')
  assert.equal(responseBody.user.deliveryChannel, 'email')
})

test('Create Now workflow sends email only and does not contain a Telegram branch', () => {
  const workflowPath = path.join(__dirname, '../n8n/challenge-webhook-workflow.json')
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
  const email = workflow.nodes.find((node) => node.name === 'Send an Email')

  assert.ok(email)
  assert.match(email.parameters.toEmail, /SkillStreak Challenge Webhook/)
  assert.equal(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.telegram'), false)
  assert.equal(workflow.nodes.some((node) => /telegram/i.test(node.name)), false)
})

test('email workflow renders the full challenge from the original Webhook node output', () => {
  const workflowPath = path.join(__dirname, '../n8n/challenge-webhook-workflow.json')
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
  const email = workflow.nodes.find((node) => node.name === 'Send an Email')
  const payload = {
    body: {
      email: 'learner@example.test',
      title: 'Find the largest number',
      topic: 'Arrays',
      difficulty: 'Easy',
      description: 'Write a function that returns the largest number in an array.',
      instructions: ['Compare each value with the current largest.'],
      examples: ['[2, 8, 3] -> 8'],
      successCriteria: ['Return 8 for [2, 8, 3].'],
      estimatedMinutes: 10,
    },
  }
  const n8nNode = (name) => ({ item: { json: name === 'SkillStreak Challenge Webhook' ? payload : {} } })
  const evaluate = (expression) => new Function('$', `return ${expression.slice(3, -2)}`)(n8nNode)

  assert.equal(evaluate(email.parameters.toEmail), 'learner@example.test')
  assert.match(evaluate(email.parameters.subject), /Find the largest number.*Arrays/)
  const rendered = evaluate(email.parameters.text)
  for (const value of [
    'Find the largest number',
    'Arrays',
    'Easy',
    'Write a function that returns the largest number in an array.',
    'Compare each value with the current largest.',
    '[2, 8, 3] -> 8',
    'Return 8 for [2, 8, 3].',
    '10 minutes',
  ]) {
    assert.ok(rendered.includes(value), `Email did not include: ${value}`)
  }
})
