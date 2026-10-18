const path = require('node:path')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const apiKey = process.env.GEMINI_API_KEY
const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
const modelOverride = process.argv.find((argument) => argument.startsWith('--model='))
const model = modelOverride ? modelOverride.slice('--model='.length) : configuredModel
const listModels = process.argv.includes('--list-models')

function sanitize(value) {
  return String(value || '')
    .replaceAll(apiKey || '\u0000', '[redacted]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted]')
    .slice(0, 500)
}

async function main() {
  if (!apiKey) {
    console.error('Gemini smoke test failed: GEMINI_API_KEY is missing from Server/.env.')
    process.exitCode = 1
    return
  }
  if (!/^[A-Za-z0-9._-]+$/.test(model)) {
    console.error('Gemini smoke test failed: GEMINI_MODEL has an invalid format.')
    process.exitCode = 1
    return
  }

  if (listModels) {
    const endpoint = new URL('https://generativelanguage.googleapis.com/v1beta/models')
    let response
    try {
      response = await fetch(endpoint, {
        headers: { 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(30000),
      })
    } catch {
      console.error('Gemini Models API request failed. Check server network access.')
      process.exitCode = 1
      return
    }
    console.log(`Models API HTTP status: ${response.status}`)
    let data
    try {
      data = await response.json()
    } catch {
      console.error('Gemini Models API response was not valid JSON.')
      process.exitCode = 1
      return
    }
    if (!response.ok) {
      if (data?.error?.status) console.error(`Google error status: ${sanitize(data.error.status)}`)
      if (data?.error?.message) console.error(`Google error message: ${sanitize(data.error.message)}`)
      process.exitCode = 1
      return
    }
    const available = (data.models || [])
      .filter((item) => item.supportedGenerationMethods?.includes('generateContent'))
      .map((item) => item.name?.replace(/^models\//, ''))
      .filter(Boolean)
    console.log(`Models supporting generateContent (${available.length}):`)
    console.log(available.join('\n'))
    if (!available.includes(configuredModel)) {
      console.log(`Configured model ${configuredModel} is not listed as available for generateContent.`)
    }
    return
  }

  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`)

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with a brief greeting.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 128 },
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch {
    console.error(`Gemini smoke test failed: network request to v1beta/models/${model}:generateContent failed.`)
    process.exitCode = 1
    return
  }

  console.log(`Gemini model: ${model}`)
  console.log('Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent')
  console.log(`HTTP status: ${response.status}`)

  let data
  try {
    data = await response.json()
  } catch {
    console.error('Gemini response was not valid JSON.')
    process.exitCode = 1
    return
  }

  if (!response.ok) {
    const details = data?.error
    if (details?.status) console.error(`Google error status: ${sanitize(details.status)}`)
    if (details?.message) console.error(`Google error message: ${sanitize(details.message)}`)
    else console.error('Google returned an error without a readable message.')
    process.exitCode = 1
    return
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()
  if (!text) {
    const candidate = data?.candidates?.[0]
    const reason = candidate?.finishReason || data?.promptFeedback?.blockReason
    console.error(`Gemini returned no text candidate${reason ? ` (reason: ${sanitize(reason)})` : ''}.`)
    process.exitCode = 1
    return
  }

  console.log(`Response: ${sanitize(text)}`)
}

main().catch(() => {
  console.error('Gemini smoke test failed unexpectedly. Details suppressed to protect credentials.')
  process.exitCode = 1
})
