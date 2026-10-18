const required = ['MONGODB_URI', 'JWT_SECRET']
for (const key of required) if (!process.env[key] && process.env.NODE_ENV === 'production') throw new Error(`Missing required environment variable: ${key}`)

module.exports = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  automationApiKey: process.env.N8N_AUTOMATION_API_KEY || '',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
  n8nWebhookTimeoutMs: Number(process.env.N8N_WEBHOOK_TIMEOUT_MS || 8000),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
}
