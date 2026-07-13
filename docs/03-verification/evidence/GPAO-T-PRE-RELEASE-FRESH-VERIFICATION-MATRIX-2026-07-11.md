# GPAO-T Pre-Release Fresh Verification Matrix

Status: Phase 2 fresh verification complete / long-suite cost noted  
Date: 2026-07-11  
Scope: `GPAO-T-PRE-RELEASE-SCOPE-MANIFEST-2026-07-11.md`  
Public release: blocked  
Live apply: not executed

## 1. Summary

The bounded release-smoke matrix passed for syntax, live-turn bridge, OpenClaw live hook readiness, Control Center integration, local package candidate gate, package readback, final local candidate packet, production completion audit, and supervised testing readiness.

The final pre-release gate is no longer blocked by product-axis readiness after rerun:

- `owner-ops product-axis-readiness-check`: `ready`
- `owner-ops production-completion-audit-check`: `ready`
- `owner-ops supervised-testing-readiness-check`: `ready`

The full `npm test` run completed cleanly after allowing enough time for long Owner Ops integration tests. It should still not be treated as a quick release-smoke command because the suite took about 22.8 minutes and contains long monolithic Owner Ops flows.

## 2. Passed Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix gpao-t run check` | pass | syntax/module check passed |
| `node --test gpao-t/test/control-center.test.js gpao-t/test/live-turn-absorption-bridge.test.js gpao-t/test/openclaw-absorption-control.test.js` | 45 pass / 0 fail / 0 cancelled | Control Center + live-turn + OpenClaw readiness bundle |
| `node bin/gpao-t.js openclaw live-turn-hook-readiness-check` from `gpao-t/` cwd | ready | command must run from package cwd because readiness uses package-relative paths |
| `node bin/gpao-t.js owner-ops local-package-candidate-check` | ready | write remains token-gated |
| `node bin/gpao-t.js owner-ops local-package-candidate-readback-check` | ready | archive, manifest, checksum, embedded file hashes verified; 66 files |
| `node bin/gpao-t.js owner-ops final-local-release-candidate-check` | ready | candidate state `local_release_candidate_ready_public_execution_blocked` |
| `node bin/gpao-t.js owner-ops final-local-release-candidate-write` | written_local_only | local JSON/Markdown packet written; no public release |
| `node bin/gpao-t.js owner-ops final-candidate-owner-decision-append continue_supervised_testing` | blocked | missing approval token; no record written |
| `node bin/gpao-t.js owner-ops final-candidate-owner-decision-check` | ready | owner decision lane ready; public release blocked |
| `node bin/gpao-t.js owner-ops final-candidate-next-action-check` | ready | next action mapping ready; public release/upload blocked |
| `node bin/gpao-t.js owner-ops product-axis-readiness-check` | ready | 6 / 6 phases ready; public release closed |
| `node bin/gpao-t.js owner-ops production-completion-audit-check` | ready | local product axis ready; external completion pending; public release closed |
| `node bin/gpao-t.js owner-ops supervised-testing-readiness-check` | ready | supervised testing ready; public release/customer send/credential access closed |
| `npm test` from `gpao-t/` cwd | 308 pass / 0 fail / 0 cancelled | full suite clean; duration about 1,369,274 ms |

## 3. Recovered Review Findings

Interpretation:

- The local package/final-candidate packet is available.
- A first parallel check briefly reported `local_product_axis_not_ready`; sequential reruns recovered this to `ready`.
- Release verification should avoid overlapping state-sensitive Owner Ops gates until these checks are isolated.
- This matches the existing serial-test rule: confidence matters more than parallel speed when generated package/readback state is shared.

## 4. Full Suite Observation

Command:

```sh
npm test
```

Earlier interrupted observation:

- 155 pass
- 0 fail
- 14 cancelled
- `test/owner-ops-final-candidate.test.js` ran for about 491 seconds before interruption.
- The cancelled files were downstream of the interrupted long integration file, not assertion failures.

Isolated observation:

```sh
node --test gpao-t/test/owner-ops-final-candidate.test.js
```

- interrupted after about 69 seconds with 0 pass / 0 fail / 1 cancelled.
- individual CLI commands inside that test completed quickly when run separately.

Recovered final observation:

- `node --test test/owner-ops-final-candidate.test.js`: 1 pass / 0 fail / 0 cancelled, duration about 280,550 ms.
- `npm test`: 308 pass / 0 fail / 0 cancelled, duration about 1,369,274 ms.

Release interpretation:

- Full suite is clean when given enough time.
- Bounded smoke commands are still required for day-to-day release iteration because the full suite is too slow for every small gate.

## 5. Required Repairs Before Pre-Release Candidate Lock

P0-R1. State-sensitive gate discipline:
- Do not run product-axis, production-audit, and supervised-readiness checks concurrently against shared generated package/readback state.
- Keep them sequential until the package/readback state is isolated per test root.

P1-R2. Owner Ops long-suite optimization:
- Split the monolithic `owner-ops-final-candidate.test.js` into bounded release-smoke and longer soak tests, or add subtest granularity so progress and the slow surface is visible.
- Keep public release/upload/signing blocked in all split tests.
- This is no longer a Phase 2 blocker because the isolated test and full suite passed; it remains a speed/operability improvement.

P1-R3. Fresh full-suite policy:
- Keep `npm test` as a full confidence gate.
- Use bounded release-smoke commands for current Pre-Release Candidate iteration speed.

## 6. Next Gate

Phase 2 is green.

Next implementation should proceed to Phase 3 live hook preview diff / rollback manifest. Long-suite optimization can be handled as a P1 improvement.
