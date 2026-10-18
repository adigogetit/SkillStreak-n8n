const { n8nWebhookUrl, automationApiKey, n8nWebhookTimeoutMs } = require('../config/env')

function webhookConfigurationError(webhookUrl, apiKey, timeoutMs) {
  const missing = [
    !webhookUrl && 'N8N_WEBHOOK_URL',
    !apiKey && 'N8N_AUTOMATION_API_KEY',
  ].filter(Boolean)
  if (missing.length) return `Set ${missing.join(' and ')} in Server/.env.`
  try {
    const parsed = new URL(webhookUrl)
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) throw new Error()
  } catch {
    return 'N8N_WEBHOOK_URL must be a valid HTTP or HTTPS URL.'
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    return 'N8N_WEBHOOK_TIMEOUT_MS must be a whole number from 1000 to 30000.'
  }
  return ''
}

async function sendChallengeNotification(user, challenge, {
  webhookUrl = n8nWebhookUrl,
  apiKey = automationApiKey,
  timeoutMs = n8nWebhookTimeoutMs,
  fetchImpl = fetch,
} = {}) {
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  const configurationError = webhookConfigurationError(webhookUrl, apiKey, timeoutMs)
  if (configurationError) {
    const warning = `Challenge saved, but n8n email notifications are not configured. ${configurationError}`
    console.warn('n8n email notification configuration is incomplete or invalid.')
    return { status: 'not_configured', emailConfigured: Boolean(email), warning }
  }
  if (!email) {
    return {
      status: 'not_configured',
      emailConfigured: false,
      warning: 'Challenge saved, but no email address is configured for this account.',
    }
  }

  const payload = {
    email,
    title: challenge.title,
    topic: challenge.topic,
    difficulty: challenge.difficulty,
    description: challenge.description,
    instructions: challenge.instructions || [],
    examples: challenge.examples || [],
    successCriteria: challenge.successCriteria || [],
    estimatedMinutes: challenge.estimatedMinutes || null,
  }
  let response
  try {
    response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Automation-Key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    const warning = 'Challenge saved, but n8n could not be reached. Check the email webhook URL and network connection.'
    console.warn('n8n email notification could not be reached.')
    return { status: 'failed', emailConfigured: true, warning }
  }

  if (!response.ok) {
    const warning = `Challenge saved, but n8n rejected the email notification (HTTP ${response.status}). Check the webhook and Header Auth configuration.`
    console.warn(`n8n email notification was rejected (HTTP ${response.status}).`)
    return { status: 'failed', emailConfigured: true, warning }
  }

  return { status: 'triggered', emailConfigured: true, warning: '' }
}

module.exports = { sendChallengeNotification, webhookConfigurationError }
