const test = require('node:test')
const assert = require('node:assert/strict')
const { dateInTimezone, weekDates, monthDates } = require('../src/utils/date')
const asyncHandler = require('../src/middleware/asyncHandler')
const { normalizeProfile, parseProfileResponse, parseChallengeResponse, requestGemini } = require('../src/services/geminiService')
const Challenge = require('../src/models/Challenge')
const Progress = require('../src/models/Progress')
const { makeDifficultyProgressEntry } = require('../src/utils/progress')
const { recommend } = require('../src/services/adaptation')

test('dateInTimezone uses the requested timezone', () => {
  assert.equal(dateInTimezone('America/New_York', new Date('2025-03-09T12:00:00Z')), '2025-03-09')
  assert.equal(dateInTimezone('America/Los_Angeles', new Date('2025-03-09T12:00:00Z')), '2025-03-09')
})

test('weekDates starts on Monday for the provided timezone', () => {
  const week = weekDates('America/New_York', new Date('2025-03-09T12:00:00Z'))
  assert.deepEqual(week, [
    '2025-03-03',
    '2025-03-04',
    '2025-03-05',
    '2025-03-06',
    '2025-03-07',
    '2025-03-08',
    '2025-03-09',
  ])
})

test('monthDates returns every calendar date in the requested timezone', () => {
  assert.deepEqual(monthDates('America/Los_Angeles', new Date('2025-03-01T02:00:00Z')).slice(0, 3), [
    '2025-02-01',
    '2025-02-02',
    '2025-02-03',
  ])
  assert.equal(monthDates('UTC', new Date('2025-02-15T12:00:00Z')).length, 28)
})

test('normalizeProfile accepts list-shaped career details and returns strings', () => {
  const profile = normalizeProfile({
    fullName: 'Example Person',
    headline: 'Full-stack developer',
    summary: ['Developer with web application experience.', 'Interested in distributed systems.'],
    employment: [{ role: 'Developer', company: 'Example Co', dates: '2022–2024' }],
    education: ['BSc Computer Science'],
    skills: { 'Programming languages': ['JavaScript'], Frameworks: ['React'] },
    skillCategories: { Databases: ['MongoDB'] },
    projects: [{ name: 'Portfolio', technologies: ['React', 'Node.js'] }],
    technologies: ['MongoDB', 'Express'],
    certifications: ['Cloud Practitioner'],
    strengths: ['Problem solving'],
    skillGaps: ['Testing'],
    recommendedLearningAreas: ['Automated testing'],
  })

  assert.equal(profile.fullName, 'Example Person')
  assert.equal(profile.summary, 'Developer with web application experience.\nInterested in distributed systems.')
  assert.match(profile.employment, /role: Developer/)
  assert.match(profile.employment, /company: Example Co/)
  assert.equal(profile.education, 'BSc Computer Science')
  assert.equal(profile.projects, 'name: Portfolio\ntechnologies: React\nNode.js')
  assert.deepEqual(profile.skills, ['JavaScript', 'React', 'MongoDB'])
  assert.deepEqual(profile.skillCategories, [
    { category: 'Programming languages', skills: ['JavaScript'] },
    { category: 'Frameworks', skills: ['React'] },
    { category: 'Databases', skills: ['MongoDB'] },
  ])
  assert.equal(profile.technologies, 'MongoDB\nExpress')
  assert.deepEqual(profile.strengths, ['Problem solving'])
  assert.deepEqual(profile.skillGaps, ['Testing'])
  assert.deepEqual(profile.recommendedLearningAreas, ['Automated testing'])
})

test('profile analyzer validation errors are reported as upstream response errors', () => {
  assert.throws(
    () => parseProfileResponse({ skillCategories: 1 }),
    (error) => error.status === 502 && error.expose === true && /unsupported format/.test(error.message),
  )
})

test('generated challenges require the complete response shape and HTTPS resources', () => {
  const challenge = parseChallengeResponse({
    title: 'Build a paginated endpoint',
    topic: 'Node.js',
    difficulty: 'Medium',
    description: 'Create a paginated endpoint backed by a collection.',
    instructions: ['Accept page and limit parameters.'],
    examples: ['A request for page 2 returns the next set of results.'],
    estimatedMinutes: 30,
    resourceUrl: 'https://developer.mozilla.org/',
    successCriteria: ['Validate pagination parameters.'],
  })

  assert.deepEqual(challenge.examples, ['A request for page 2 returns the next set of results.'])
  assert.equal(parseChallengeResponse({ ...challenge, resourceUrl: 'http://example.com' }).resourceUrl, '')
})

test('generated challenges normalize Gemini aliases and text values with contextual defaults', () => {
  const challenge = parseChallengeResponse({
    questionTitle: 'Build a search endpoint',
    question: 'Implement a search endpoint for a product catalogue.',
    skill: 'Express',
    difficultyLevel: 'intermediate',
    estimatedTime: '25 minutes',
    instructions: 'Validate the query.\nReturn matching products.',
    acceptanceCriteria: 'Reject empty queries; return matching results.',
    resourceURL: 'http://invalid.example',
  }, { topic: 'Backend development', difficulty: 'Medium' })

  assert.equal(challenge.title, 'Build a search endpoint')
  assert.equal(challenge.description, 'Implement a search endpoint for a product catalogue.')
  assert.equal(challenge.topic, 'Express')
  assert.equal(challenge.difficulty, 'Medium')
  assert.equal(challenge.estimatedMinutes, 10)
  assert.deepEqual(challenge.instructions, ['Validate the query.', 'Return matching products.'])
  assert.deepEqual(challenge.successCriteria, ['Reject empty queries', 'return matching results.'])
  assert.equal(challenge.resourceUrl, '')
})

test('generated challenge parser uses saved role and adaptation for omitted topic and difficulty', () => {
  const challenge = parseChallengeResponse({
    title: 'Practice API validation',
    description: 'Validate an incoming request and return structured errors.',
  }, { topic: 'Backend Developer', difficulty: 'Easy' })

  assert.equal(challenge.topic, 'Backend Developer')
  assert.equal(challenge.difficulty, 'Easy')
  assert.equal(challenge.estimatedMinutes, 10)
  assert.deepEqual(challenge.successCriteria, [])
})

test('generated questions are constrained to brief descriptions and short completion times', () => {
  const challenge = parseChallengeResponse({
    title: 'Try a small validation check',
    description: 'Add one simple validation rule to a form.',
    estimatedMinutes: 30,
  }, { topic: 'Frontend developer', difficulty: 'Easy' })

  assert.equal(challenge.estimatedMinutes, 10)
  assert.ok(challenge.description.length <= 900)
  assert.throws(() => parseChallengeResponse({
    title: 'A'.repeat(101),
    description: 'Add one simple validation rule to a form.',
  }, { topic: 'Frontend developer', difficulty: 'Easy' }))
})

test('pending challenges can record difficulty feedback without invalid progress status', async () => {
  const challenge = {
    _id: new Progress()._id,
    challengeDate: '2026-10-18',
    status: 'pending',
  }
  const entry = makeDifficultyProgressEntry(challenge, 'Easy')
  const progress = new Progress({
    user: new Progress()._id,
    difficultyProgression: [entry],
  })

  assert.equal(entry.status, undefined)
  assert.equal(progress.validateSync(), undefined)

  const legacyProgress = new Progress({
    user: new Progress()._id,
    difficultyProgression: [{
      challenge: challenge._id,
      date: challenge.challengeDate,
      status: 'pending',
      ratedDifficulty: 'Easy',
    }],
  })
  await legacyProgress.validate()
  assert.equal(legacyProgress.difficultyProgression[0].status, undefined)
})

test('adaptation starts Easy and only increases after repeated solved challenges', () => {
  assert.equal(recommend([]).recommendedDifficulty, 'Easy')
  assert.equal(recommend([
    { status: 'solved', ratedDifficulty: 'Easy' },
    { status: 'solved', ratedDifficulty: 'Easy' },
    { status: 'solved', ratedDifficulty: 'Easy' },
  ]).recommendedDifficulty, 'Medium')
})

test('invalid generated challenge data becomes a clear upstream error', () => {
  assert.throws(
    () => parseChallengeResponse({ title: 'Incomplete challenge' }),
    (error) => error.status === 502 && error.expose === true && /incomplete or invalid challenge/.test(error.message),
  )
})

test('Gemini request retries transient 503 responses and succeeds on a later attempt', async () => {
  let attempts = 0
  let requestUrl
  let requestOptions
  const result = await requestGemini('make a challenge', {
    apiKey: 'test-key',
    model: 'test-model',
    sleep: async () => {},
    fetchImpl: async (url, options) => {
      attempts += 1
      requestUrl = url
      requestOptions = options
      if (attempts < 3) return new Response('', { status: 503 })
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })

  assert.equal(attempts, 3)
  assert.equal(requestUrl, 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent')
  assert.equal(requestOptions.headers['x-goog-api-key'], 'test-key')
  assert.equal(requestUrl.includes('test-key'), false)
  assert.deepEqual(result, { ok: true })
})

test('persistent Gemini 503 returns a clear temporary-outage message after bounded retries', async () => {
  let attempts = 0
  await assert.rejects(
    requestGemini('make a challenge', {
      apiKey: 'test-key',
      model: 'test-model',
      sleep: async () => {},
      fetchImpl: async () => {
        attempts += 1
        return new Response('', { status: 503 })
      },
    }),
    (error) => error.status === 503 && /temporarily unavailable \(HTTP 503\)/.test(error.message),
  )
  assert.equal(attempts, 3)
})

test('Gemini quota errors are explicit and are not retried as service outages', async () => {
  let attempts = 0
  await assert.rejects(
    requestGemini('make a challenge', {
      apiKey: 'test-key',
      model: 'test-model',
      sleep: async () => {},
      fetchImpl: async () => {
        attempts += 1
        return new Response('', { status: 429 })
      },
    }),
    (error) => error.status === 429 && /quota reached/.test(error.message),
  )
  assert.equal(attempts, 1)
})

test('challenge schema permits multiple on-demand records while retaining daily deduplication', () => {
  const indexes = Challenge.schema.indexes()
  const dailyIndex = indexes.find(([keys]) => keys.user === 1 && keys.challengeDate === 1)
  const requestIndex = indexes.find(([keys]) => keys.user === 1 && keys.requestId === 1)

  assert.equal(Challenge.schema.path('kind').options.default, 'daily')
  assert.equal(dailyIndex[1].unique, true)
  assert.deepEqual(dailyIndex[1].partialFilterExpression, { kind: 'daily' })
  assert.equal(requestIndex[1].unique, true)
  assert.deepEqual(requestIndex[1].partialFilterExpression, { requestId: { $type: 'string' } })
})

test('asyncHandler forwards rejected controller promises to Express', async () => {
  const failure = new Error('controller failed')
  let forwarded
  asyncHandler(async () => { throw failure })({}, {}, (error) => { forwarded = error })
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(forwarded, failure)
})
