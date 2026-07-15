# GPAO-T Live Settings Provider/Channel UX Evidence - 2026-07-15

Scope:

- Live runtime: `http://127.0.0.1:18799`
- Pages checked in browser:
  - `/settings/model-connection`
  - `/settings/channels`

Verified:

- Model connection page shows a provider select box with `openai`, `anthropic`, and `google`.
- API key save button is visible as `선택한 Provider API Key 저장`.
- ChatGPT / Codex OAuth card remains visible.
- Telegram card text uses Korean `봇 토큰과 Chat ID`.
- Channel page shows a user-facing messenger/session summary.
- Channel page exposes `Telegram 대화 열기`.
- No visible `OpenClaw`, `openclaw logs`, or `openclaw-agent` text was detected in these two pages.

Evidence files:

- `browser-evidence.json`
- `model-connection-provider-select.png`
- `channels-user-summary.png`
