# GPAO-T Runtime Heart - Doctor/Recovery Gate Evidence

Date: 2026-07-13

## Scope

This evidence records the first source and live-health gate for the GPAO-T
Doctor/Recovery Heart. The gate is designed to prevent false "healthy" claims
when localhost health responds but install integrity, provider/auth, fresh chat,
or log-window evidence is still incomplete.

## Implemented Surface

- Source core: `src/core/doctor-recovery-heart.js`
- Public API export: `src/index.js`
- Control Center endpoints:
  - `GET /runtime/doctor-recovery-heart`
  - `GET /runtime/doctor-recovery-heart/verify`
- Gateway endpoints:
  - `GET /runtime/doctor-recovery-heart`
  - `GET /runtime/doctor-recovery-heart/verify`
- CLI commands:
  - `gpao-t doctor-heart`
  - `gpao-t doctor-heart-check`
- Installer health integration:
  - `doctor-recovery-heart` check appended to `gpao-t-macos-local.mjs health`

## User-Safe Contract

The Doctor/Recovery Heart must:

- keep `completionClaimAllowed: false` until runtime, install integrity,
  provider/auth, fresh chat, and log-window evidence are all present;
- distinguish product outage from sandbox-only localhost blocking;
- convert raw runtime findings into user-safe status labels;
- keep secret values out of diagnosis output;
- require explicit approval for dangerous repair paths.

## Verification Run

```text
node --check src/core/doctor-recovery-heart.js
node --check src/index.js
node --check src/core/control-center-serving.js
node --check src/core/gateway.js
node --check bin/gpao-t-full.js
node --check tools/gpao-t-local-install-lib.mjs
node --test test/doctor-recovery-heart.test.js test/provider-auth-heart.test.js
npm run check
node --test test/adapter-boundary.test.js test/install-hardening.test.js test/doctor-recovery-heart.test.js test/provider-auth-heart.test.js
node bin/gpao-t.js doctor-heart
node bin/gpao-t.js doctor-heart-check
node installer/gpao-t-macos-local.mjs health
```

## Result

- Syntax checks: passed.
- Focused tests: 10/10 passed.
- Related adapter/install/provider tests: 32/32 passed.
- `npm run check`: passed.
- `gpao-t doctor-heart-check`: `status: ready`, no contract findings.
- Live installer health: `status: unhealthy` because distribution integrity
  drift remains.

## Current Live Finding

The live service is responding and provider/auth store metadata is ready, but
distribution verification reports:

```text
compatibility/gpao-t/dist/probe-RjPH7tPP.js: file metadata mismatch
compatibility/gpao-t/dist/probe-RjPH7tPP.js: sha256 mismatch
```

Doctor/Recovery Heart classifies this as:

- status: `review`
- severity: `P1`
- user label: `검토 필요`
- message: currently installed GPAO-T files differ from the distribution
  manifest, so the service may run but the clean install seal is not closed.

## Non-Completion Boundary

This gate does not claim the whole Runtime Heart hardening is complete.

Remaining Heart lanes:

1. Session/Event Heart
2. Memory/Context Heart
3. Tool/MCP/Authority Heart
4. Full fresh-chat/log-window/visual evidence
5. Distribution drift repair or reseal decision
