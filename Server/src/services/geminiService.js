const { z } = require('zod')
const { geminiApiKey, geminiModel } = require('../config/env')
function normalizeText(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join('\n')
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => {
        const text = normalizeText(item)
        return text ? `${key}: ${text}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}
function textField(maxLength) {
  return z.preprocess(normalizeText, z.string().max(maxLength).default(''))
}
function isHttpsUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname)
  } catch {
    return false
  }
}
function normalizeStringArray(value) {
  if (value === undefined) return undefined
  if (value === null) return []
  if (typeof value === 'string') return value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean)
  if (!Array.isArray(value)) return value
  return value.map(normalizeText).filter(Boolean)
}
const skillCategorySchema = z.object({
  category: z.string().trim().min(1).max(100),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
})
function normalizeCategories(value) {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.map((item) => ({
    category: normalizeText(item?.category || item?.name || item?.group),
    skills: normalizeStringArray(item?.skills || item?.items || []),
  }))
  if (typeof value === 'object') return Object.entries(value).map(([category, skills]) => ({
    category,
    skills: normalizeStringArray(skills),
  }))
  return value
}
function normalizeProfileInput(profile) {
  const input = { ...profile }
  if (input.skills && !Array.isArray(input.skills) && typeof input.skills === 'object') {
    const categoriesFromSkills = normalizeCategories(input.skills)
    const existingCategories = normalizeCategories(input.skillCategories)
    input.skillCategories = Array.isArray(existingCategories)
      ? [...categoriesFromSkills, ...existingCategories]
      : existingCategories
    input.skills = Object.values(input.skills).flatMap((items) => normalizeStringArray(items) || [])
  } else if (input.skillCategories !== undefined) {
    input.skillCategories = normalizeCategories(input.skillCategories)
  }
  if (input.skills === undefined) input.skills = []
  return input
}
const profileSchema = z.object({
  fullName: textField(100),
  headline: textField(300),
  currentRole: textField(300),
  summary: textField(4000),
  employment: textField(6000),
  education: textField(4000),
  skills: z.preprocess(normalizeStringArray, z.array(z.string().trim().min(1).max(80)).max(80).default([])),
  skillCategories: z.array(skillCategorySchema).max(30).default([]),
  projects: textField(6000),
  technologies: textField(3000),
  certifications: z.preprocess(normalizeStringArray, z.array(z.string().max(160)).max(40).default([])),
  strengths: z.preprocess(normalizeStringArray, z.array(z.string().max(300)).max(30).default([])),
  skillGaps: z.preprocess(normalizeStringArray, z.array(z.string().max(300)).max(30).default([])),
  recommendedLearningAreas: z.preprocess(normalizeStringArray, z.array(z.string().max(300)).max(30).default([])),
})
const challengeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(1).max(150),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  description: z.string().trim().min(1).max(900),
  instructions: z.array(z.string().trim().min(1).max(180)).max(4).default([]),
  examples: z.array(z.string().trim().min(1).max(250)).max(2).default([]),
  estimatedMinutes: z.number().int().min(5).max(15),
  resourceUrl: z.string().max(1000).refine((value) => value === '' || isHttpsUrl(value)),
  successCriteria: z.array(z.string().trim().min(1).max(180)).max(4).default([]),
})
function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) {
    const error = new Error('Gemini returned unreadable data. Please retry the operation.')
    error.status = 502
    error.expose = true
    throw error
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch (cause) {
    const error = new Error('Gemini returned malformed profile data. Please retry or continue with manual entry.')
    error.status = 502
    error.expose = true
    error.cause = cause
    throw error
  }
}
const RETRYABLE_GEMINI_STATUSES = new Set([500, 502, 503, 504])
const GEMINI_MAX_ATTEMPTS = 3

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function geminiHttpError(status) {
  const error = new Error(
    status === 429
      ? 'Gemini rate limit or quota reached (HTTP 429). Check the API quota and billing for the configured Google project.'
      : status === 401 || status === 403
        ? `Gemini rejected the configured API key or permissions (HTTP ${status}). Verify GEMINI_API_KEY and its model access.`
        : status === 400 || status === 404
          ? `Gemini rejected the request or configured model (HTTP ${status}). Verify GEMINI_MODEL is available to this API key.`
          : `Gemini is temporarily unavailable (HTTP ${status}). Please try again shortly.`,
  )
  error.status = status === 429 ? 429 : status >= 500 ? 503 : 502
  error.expose = true
  return error
}

async function requestGemini(prompt, {
  apiKey = geminiApiKey,
  model = geminiModel,
  fetchImpl = fetch,
  sleep = wait,
  maxAttempts = GEMINI_MAX_ATTEMPTS,
} = {}) {
  if (!apiKey) {
    const error = new Error('Gemini is not configured. Add GEMINI_API_KEY to Server/.env.')
    error.status = 503
    error.expose = true
    throw error
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  let lastNetworkError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(30000),
      })
    } catch (cause) {
      lastNetworkError = cause
      if (attempt < maxAttempts) {
        await sleep(500 * (2 ** (attempt - 1)))
        continue
      }
      const error = new Error(`Could not connect to Gemini after ${maxAttempts} attempts. Check server network access and try again.`)
      error.status = 503
      error.expose = true
      error.cause = lastNetworkError
      throw error
    }

    if (!response.ok) {
      if (RETRYABLE_GEMINI_STATUSES.has(response.status) && attempt < maxAttempts) {
        await sleep(500 * (2 ** (attempt - 1)))
        continue
      }
      throw geminiHttpError(response.status)
    }

    let data
    try {
      data = await response.json()
    } catch (cause) {
      const error = new Error('Gemini returned a response that could not be read. Please try again.')
      error.status = 502
      error.expose = true
      error.cause = cause
      throw error
    }
    return extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
  }
}

async function generate(prompt) {
  return requestGemini(prompt)
}
function normalizeProfile(profile) {
  const input = normalizeProfileInput(profile)
  const categories = normalizeCategories(input.skillCategories)
  const categorizedSkills = Array.isArray(categories) ? categories.flatMap((category) => category.skills || []) : []
  input.skills = [...new Set([...(normalizeStringArray(input.skills) || []), ...categorizedSkills])]
  input.skillCategories = categories
  return profileSchema.parse(input)
}
function parseProfileResponse(profile) {
  try {
    return normalizeProfile(profile)
  } catch (cause) {
    if (!(cause instanceof z.ZodError)) throw cause
    const error = new Error('Gemini returned profile data in an unsupported format. Please retry or continue with manual entry.')
    error.status = 502
    error.expose = true
    error.cause = cause
    throw error
  }
}
function parseChallengeResponse(challenge, defaults = {}) {
  try {
    const input = challenge?.challenge || challenge?.generatedChallenge || (typeof challenge?.question === 'object' ? challenge.question : challenge)
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new z.ZodError([])

    const description = normalizeText(input.description || input.problemStatement || input.problem || input.prompt || input.task || (typeof input.question === 'string' ? input.question : ''))
    const title = normalizeText(input.title || input.challengeTitle || input.questionTitle || input.name)
      || description.split(/[.!?\n]/, 1)[0].slice(0, 200)
    const rawDifficulty = normalizeText(input.difficulty || input.difficultyLevel).toLowerCase()
    const difficulty = ({
      easy: 'Easy',
      beginner: 'Easy',
      medium: 'Medium',
      intermediate: 'Medium',
      hard: 'Hard',
      advanced: 'Hard',
    })[rawDifficulty] || defaults.difficulty
    const rawMinutes = input.estimatedMinutes ?? input.estimatedTime ?? input.timeEstimate ?? input.durationMinutes
    const parsedMinutes = typeof rawMinutes === 'number'
      ? rawMinutes
      : Number.parseInt(String(rawMinutes || '').match(/\d+/)?.[0], 10)
    const rawUrl = normalizeText(input.resourceUrl || input.resourceURL || input.learningResource)
    const resourceUrl = /^https:\/\//i.test(rawUrl) ? rawUrl : ''

    return challengeSchema.parse({
      title,
      topic: normalizeText(input.topic || input.skill || input.subject || input.domain) || defaults.topic,
      difficulty,
      description,
      instructions: normalizeStringArray(input.instructions || input.steps || []),
      examples: normalizeStringArray(input.examples || input.testCases || input.testcases || []),
      estimatedMinutes: Number.isInteger(parsedMinutes) && parsedMinutes >= 5 && parsedMinutes <= 15 ? parsedMinutes : 10,
      resourceUrl,
      successCriteria: normalizeStringArray(input.successCriteria || input.acceptanceCriteria || input.criteria || []),
    })
  } catch (cause) {
    const fields = cause instanceof z.ZodError
      ? [...new Set(cause.issues.map((issue) => issue.path[0]).filter(Boolean))]
      : []
    const details = fields.length ? ` Invalid fields: ${fields.join(', ')}.` : ''
    const error = new Error(`Gemini returned an incomplete or invalid challenge.${details} Please try generating it again.`)
    error.status = 502
    error.expose = true
    error.cause = cause
    throw error
  }
}
async function analyzeProfile(text) { return parseProfileResponse(await generate(`Extract only facts explicitly stated in this LinkedIn PDF text. Do not infer missing information or qualifications. Return JSON with fullName, headline, currentRole, summary, employment, education, skills, skillCategories, projects, technologies, certifications, strengths, skillGaps, and recommendedLearningAreas. Return detail fields as strings or arrays of strings/details; skills, categories, certifications, strengths, gaps, and learning areas as arrays. skillCategories should be an array of {category, skills} groups (for example programming languages, frameworks, databases, developer tools, other technical skills). Use empty strings or arrays where unavailable. PDF text:\n${text.slice(0, 24000)}`)) }
async function generateChallenge({ user, recentChallenges, adaptation }) { const profile = user.careerProfile || {}; return parseChallengeResponse(await generate(`Create one short, beginner-friendly career practice question. Keep it easy to start, even when the learner has experience. Return exactly one JSON object, no markdown. Include title (max 8 words), topic, difficulty (use Easy unless the learner's recent results clearly justify a higher level), description (one clear task in 1-2 short sentences, max 90 words), instructions (0-3 short bullets), examples (0-1, only if useful), estimatedMinutes (5-15), resourceUrl (valid HTTPS URL or empty string), and successCriteria (1-3 concise bullets). Avoid multi-part assignments, lengthy background, large projects, and long checklists. Ask for one concrete action that can be completed in a few minutes. Target role: ${user.targetRole}. Experience: ${user.experienceLevel}. Relevant profile headline: ${profile.headline || ''}. Relevant skills: ${(user.skills || []).slice(0, 15).join(', ')}. Skill gaps: ${(profile.skillGaps || []).slice(0, 5).join(', ')}. Learning priorities: ${(profile.recommendedLearningAreas || []).slice(0, 5).join(', ')}. Recent titles to avoid repeating: ${(recentChallenges || []).slice(0, 8).map((item) => item.title).join(', ')}. Recommended difficulty: ${adaptation.recommendedDifficulty}. Personalize the one task to the user's role and skills.`), { difficulty: adaptation.recommendedDifficulty, topic: user.targetRole }) }
module.exports = { analyzeProfile, generateChallenge, normalizeProfile, parseProfileResponse, parseChallengeResponse, requestGemini }
