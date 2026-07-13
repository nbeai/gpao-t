# GPAO-T Live Provider Auth Repair - 2026-07-13

Status: PASS

## User-visible failure

The live GPAO-T dashboard opened, but an actual chat turn failed before reply with:

- provider: openai
- error class: missing-provider-auth
- expected auth store: /Users/jyp/.gpao-t/agents/main/agent/gpao-t-agent.sqlite

## Root cause

The user-facing dashboard connection was not the real issue. The live runtime had provider auth in the legacy/compatibility auth store name, while the active GPAO-T reply path looked for the GPAO-T-named agent auth store. This meant the screen could load while model invocation failed.

## Repair

- Copied the existing portable primary auth profile from the working main agent auth store into the GPAO-T runtime auth store.
- Created/synchronized /Users/jyp/.gpao-t/agents/main/agent/gpao-t-agent.sqlite.
- Restarted LaunchAgent ai.nbeai.gpao-t.
- Rechecked /health.

No API key, OAuth token, or secret value was printed or recorded in this document.

## Verification

- /health returned live.
- In-app browser opened http://127.0.0.1:18799/chat?session=agent%3Amain%3Amain without login.
- Sent a fresh live chat smoke prompt.
- The assistant replied: 정상 응답 가능 상태.
- Gateway log showed provider transport request to OpenAI ChatGPT Responses and status=200 at 2026-07-13T20:44:30+09:00.
- gateway.error.log had no new missing-provider-auth entry after the repair window.

## Remaining hardening

Source/package install logic must ensure both compatibility and GPAO-T-named agent auth stores are aligned, or the runtime must converge on one canonical auth store path before the next distribution rebuild.
