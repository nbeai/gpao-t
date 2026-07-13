# GPAO-T Control Center Loopback Blocked Classification

Date: 2026-07-13
Status: classified

## Finding

`control-center.test.js` loopback serving smoke is a sandbox/environment issue,
not a GPAO-T product bug.

## Evidence

- Sandbox command:
  - `node bin/gpao-t.js control serve-check`
  - result: `listen EPERM: operation not permitted 127.0.0.1`
- Targeted test:
  - `node --test test/control-center.test.js --test-name-pattern "serves the static Control Center|runs serving smoke" --test-concurrency=1 --test-timeout=300000 --test-reporter=spec`
  - result: `31 pass / 0 fail`
- Unsandboxed loopback check:
  - `node bin/gpao-t.js control serve-check`
  - result: `status: ready`, `findings: []`, health/status routes 200, blocked POST 405

## Classification

```text
category: environmental
root cause: sandbox blocked loopback listen on 127.0.0.1
product bug: false
test harness bug: false
next action: run loopback serving smoke outside sandbox when product claims require it
```

## Product Rule

Do not mark Control Center loopback serving as failed when the only failure is
`EPERM` from sandboxed loopback listen and unsandboxed `serve-check` returns
`ready`.
