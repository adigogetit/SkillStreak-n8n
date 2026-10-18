# SkillStreak backend

The backend owns all application intelligence:

- PDF text extraction
- Gemini profile analysis
- Gemini daily-challenge generation and adaptation
- MongoDB persistence, authentication, and streaks

n8n is notification-only. It sends an already-saved task by email; it never receives a Gemini key or generates a task. Telegram delivery and account linking are disabled for now.

## Required server environment

Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `N8N_AUTOMATION_API_KEY`.

`GEMINI_API_KEY` comes from Google AI Studio and must remain in `Server/.env`. It is never placed in React, n8n, or GitHub.

To make a short live request to the configured model without printing the API key, run:

```powershell
npm.cmd run gemini:smoke
```

Use `node scripts/gemini-smoke.js --list-models` to list models available to the configured key, or `node scripts/gemini-smoke.js --model=MODEL_NAME` to test a specific model without changing `.env`.

Run the API with:

```powershell
npm.cmd install
npm.cmd run dev
```

The API scheduler checks every ten minutes. Once a confirmed user’s local notification time is reached, it asks Gemini for one challenge, saves it with a unique `{ user, challengeDate }` index, and makes it available to the dashboard and notification workflow.

See the root [README](../README.md) for full local setup and [n8n/README.md](n8n/README.md) for notification-only configuration.
