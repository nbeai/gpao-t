# GPAO-T Browser Auto Login Seal - 2026-07-13

Status: PASS
Created: 2026-07-13T10:12:27.207Z

## Scope

The user requested that typing the live GPAO-T dashboard address should open the working dashboard without repeatedly showing the connection/login screen, including Safari and the Codex in-app browser.

## Action

Seeded the current Safari profile localStorage for the live loopback dashboard origin. The runtime token was read from the local GPAO-T config and was not printed or written into source/static HTML.

## Evidence

- URL after direct open: http://127.0.0.1:18799/chat?session=agent%3Amain%3Amain
- Document title: nBeAI. GPAO-T
- Stored connection token: present, length-only verified
- Stored dashboard settings: present
- Visible connection screen: false
- Visible work screen: true
- Runtime health: checked separately by /health

## Product Note

This fixes the current Safari owner profile. A future reinstall or gateway token rotation must re-run the same safe seed path or ship a first-class local bootstrap flow that preserves the same no-static-secret rule.

## Codex In-App Browser Evidence

- Initial state: login/connection screen was visible at http://127.0.0.1:18799/chat?session=main.
- Action: entered the local GPAO-T runtime token into the in-app browser login form without printing the token.
- Direct URL retest: http://127.0.0.1:18799/ redirected to http://127.0.0.1:18799/chat?session=agent%3Amain%3Amain.
- Visible connection screen after retest: false.
- Visible work screen after retest: true.
- Title: nBeAI. GPAO-T.

## Remaining Product Hardening

Current owner browsers are repaired. A clean new browser profile will still need either first-run token entry or a first-class GPAO-T local bootstrap flow. This must be solved without embedding static secrets in served HTML.

## 2026-07-13T14:13Z Recheck

Status: PASS

After the user reported that the supplied address still showed a login/connection screen, the official runtime dashboard open path was rerun:

- Command path: `gpao-t dashboard`
- Result: token auto-auth URL was copied and opened without printing the token.
- Safari direct URL retest: `http://127.0.0.1:18799/chat?session=main`
- Safari final URL: `http://127.0.0.1:18799/chat?session=agent%3Amain%3Amain`
- Safari document title: `nBeAI. GPAO-T`
- Visible connection/login screen: false
- Visible chat surface: true
- Visible prompt: `메시지를 입력하세요`
- Visible model lane: `gpt-5.5 · openai · 보통`

Runtime/install verification after the same pass:

- `curl http://127.0.0.1:18799/health`: pass, `{"ok":true,"status":"live"}`
- `node installer/gpao-t-macos-local.mjs health --json` outside the Codex sandbox: pass, status `healthy`
- Live distribution folder verification: pass, `full-sha256`
- LaunchAgent plist: present and loaded

Note: Node `fetch` from inside the Codex sandbox can fail with `EPERM`; installer health must be run outside the sandbox for the live local HTTP check.
