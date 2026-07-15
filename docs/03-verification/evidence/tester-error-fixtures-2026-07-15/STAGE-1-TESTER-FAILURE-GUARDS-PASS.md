# GPAO-T Stage -1 Tester Failure Guards Pass - 2026-07-15

## Status

Pass.

This evidence records the source-level regression guards added for the tester-reported failures shared on 2026-07-15.

## Tester-Reported Failures Covered

### 1. chat.send internal control field leak

Reported:

```text
invalid chat.send params: at root: unexpected property '__controlUiReconnectResume'
```

Guard added:

- `sanitizeChatSendParams()`
- `verifyChatSendSanitizer()`
- Gateway route: `POST /stage-1/chat-send/sanitize`
- Gateway verification route: `GET /stage-1/chat-send/sanitize/verify`

Pass condition:

- `__controlUiReconnectResume` and other UI/control/reconnect-only fields are stripped before provider payload creation.
- User message, session, model, context, and allowed chat fields are preserved.

### 2. Long-context local clone analysis timeout

Reported:

```text
The model did not produce a response before the model idle timeout. Please try again, or increase models.providers..timeoutSeconds for slow local or self-hosted providers. If agents.defaults.timeoutSeconds or a run-specific timeout is lower, raise that ceiling too; provider timeouts cannot extend the whole agent run.
```

Guard added:

- `buildTimeoutBudget()`
- `verifyTimeoutBudget()`
- Model Router policy now carries `timeoutBudget` and `timeoutVerification`.
- Gateway route: `POST /stage-1/timeout-budget`
- Gateway verification route: `GET /stage-1/timeout-budget/verify`

Pass condition:

- Timeout ceiling relationship is verified as `run >= provider >= operation/tool`.
- GitHub/repo/clone/full-analysis style requests are marked for staged scan instead of one blocking call.

### 3. GitHub push completion claim without execution receipt

Reported unsafe completion claim:

```text
푸시 완료했습니다, 민수님.
```

Guard added:

- `guardExternalWriteCompletion()`
- `verifyExternalWriteCompletionGuard()`
- Tool/Authority Heart now includes `external_write_claim_guard_ready`.
- Gateway route: `POST /stage-1/external-write/guard`
- Gateway verification route: `GET /stage-1/external-write/guard/verify`

Pass condition:

- GitHub push/release/external write cannot be described as complete unless an execution receipt has action, exit code, remote, branch, commit, and remote confirmation.
- Without a receipt, GPAO-T returns a safe non-completion claim.

### 4. Heartbeat warning repeated in main chat

Reported:

```text
Heartbeat check failed before it could produce an update. The main chat session remains available.
```

Guard added:

- `isolateHeartbeatFailures()`
- `verifyHeartbeatFailureIsolation()`
- Tool/Authority Heart now includes `heartbeat_failure_isolation_ready`.
- Gateway route: `POST /stage-1/heartbeat/isolate`
- Gateway verification route: `GET /stage-1/heartbeat/isolate/verify`

Pass condition:

- Repeated heartbeat failures are coalesced into Doctor/status events.
- If main chat is ready, repeated heartbeat warnings do not pollute the chat body.

## Files Changed

- `src/core/tester-failure-guards.js`
- `src/core/model-router.js`
- `src/core/tool-authority-heart.js`
- `src/core/gateway.js`
- `src/index.js`
- `test/tester-failure-guards.test.js`
- `package.json`

## Verification Commands

```text
node --check src/core/tester-failure-guards.js
node --check src/core/model-router.js
node --check src/core/tool-authority-heart.js
node --check src/core/gateway.js
node --check src/index.js
node --test test/tester-failure-guards.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
node --test test/adapter-boundary.test.js test/tool-authority-heart.test.js test/runtime-heart-hardening.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
npm run check
npm test
```

## Verification Results

- Targeted Stage -1 tester guard test: `7 pass / 0 fail`
- Related adapter/tool/runtime regression tests: `18 pass / 0 fail`
- `npm run check`: pass
- `npm test`: pass
  - main suite: `472 pass / 0 fail`
  - dashboard readiness suites:
    - `9 pass / 0 fail`
    - `10 pass / 0 fail`
    - `9 pass / 0 fail`
    - `1 pass / 0 fail`
    - `1 pass / 0 fail`

## Completion Boundary

This closes the four reported failure classes at source/test/gateway contract level. It does not claim that every live installed teammate runtime has already been updated; that requires a rebuilt dated distribution and installation/update smoke on the target machine.
