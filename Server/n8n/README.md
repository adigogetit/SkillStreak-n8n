# SkillStreak n8n workflows

For the end-to-end n8n Cloud setup, server environment variables, Header Auth configuration, test steps, and recipient linking, follow the [root integration guide](../../README.md).

Workflow exports in this folder:

- [`challenge-webhook-workflow.json`](./challenge-webhook-workflow.json) — receives saved Create Now challenges and sends a dynamic email.
- [`notification-workflow.json`](./notification-workflow.json) — existing polling workflow for daily scheduled challenge notifications.

Telegram delivery and account linking are disabled in the application for now. Deactivate previously imported Telegram workflows in n8n Cloud and remove Telegram nodes from any active notification workflow. The JSON files are importable templates, not published n8n Cloud workflows. Select the private email and automation credentials after importing. Do not put Gemini, MongoDB, SMTP, or automation credentials in these exports.
