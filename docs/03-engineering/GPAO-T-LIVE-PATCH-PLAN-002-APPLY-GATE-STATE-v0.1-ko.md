# GPAO-T Live Patch Plan 002: Apply Gate State

Date: 2026-07-11
Status: core ready / live read-only UI bridge applied and verified

## 목적

Applied Replay Inspector 다음 단계로, GPAO-T의 기억/맥락 적용 흐름을 하나의 read-only Apply Gate 상태로 고정한다.

이 단계의 목표는 적용을 실행하는 것이 아니다. 목표는 어떤 증거가 있어야 적용 후보가 다음 단계로 갈 수 있는지, 어떤 권한이 여전히 닫혀 있는지, rollback과 post-apply replay가 어디서 요구되는지 UI와 Gateway가 같은 계약으로 보게 만드는 것이다.

## 구현 범위

- `buildMemoryApplyGateState()`
  - memory review queue의 최신 candidate, replay, apply request, approval audit, reversible apply, rollback 상태를 압축한다.
  - `source_truth -> memory_candidate -> replay_evidence -> apply_request -> approval_audit -> reversible_apply -> rollback_receipt -> post_apply_replay` 순서를 명시한다.
  - durable memory, OpenClaw memory, session meta, external send, automatic admission을 모두 blocked로 유지한다.
- `verifyMemoryApplyGateState()`
  - UI apply button, reversible apply UI, OpenClaw memory write, durable promotion, session meta write가 열렸는지 검사한다.
  - rollback receipt와 post-apply replay requirement가 빠졌는지 검사한다.
- Gateway:
  - `GET /memory/apply-gate`
  - `GET /memory/apply-gate/verify`

## 현재 Target Policy

- `context_mesh_candidate`
  - local-only append engine은 존재한다.
  - UI invocation은 아직 blocked다.
  - automatic admission, durable promotion, external send, write from UI는 blocked다.
- `gpao_t_memory_wiki`
  - design-only다.
  - apply engine은 없다.
- `openclaw_memory`
  - blocked다.
  - apply engine은 없다.
- `session_meta`
  - blocked다.
  - apply engine은 없다.

## 검증

- `node --check gpao-t/src/core/memory-candidate-review-queue.js`
- `node --check gpao-t/src/core/gateway.js`
- `node --check gpao-t/src/index.js`
- `node --test gpao-t/test/memory-wiki.test.js gpao-t/test/openclaw-absorption-control.test.js`
- `npm --prefix gpao-t run check`
- `npm --prefix gpao-t test`
- `node gpao-t/bin/gpao-t.js gateway GET /memory/apply-gate`
- `node gpao-t/bin/gpao-t.js gateway GET /memory/apply-gate/verify`

All passed on 2026-07-11.

## Live Patch Boundary

This patch exposed the state through the existing `gpao.appliedReplayInspector.get` live bridge and GPAO-T dashboard inspector.

This patch remains read-only.

Do not enable:

- apply button execution
- rollback button execution
- OpenClaw memory write
- durable memory promotion
- session metadata mutation
- connector write
- external send
- automatic admission

## Rollback Requirement For Next Live Patch

Completed before the live OpenClaw patch:

- capture the live bundle and server-method files touched by the patch
- write a manifest with file hashes
- verify `/health`
- verify Safari authenticated DOM
- preserve a command-level rollback path

Backup:

- `/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-backups/openclaw-live-apply-gate-state-2026-07-11-before-patch/`

Safari proof:

- `Apply Gate`
- `UI 적용`: `잠금`
- `OpenClaw memory`: `차단`
- `session meta`: `차단`
- screenshot: `/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-apply-gate-readonly-safari-2026-07-11.png`

## 다음 단계

1. Design the explicit reversible apply invocation UX as a separate patch.
2. Keep the first executable target limited to local-only `context_mesh_candidate`.
3. Require apply request, approval/audit record, reversible apply receipt, rollback receipt, and post-apply replay before opening any UI action.
4. Keep OpenClaw memory, durable memory, session meta, connector write, external send, and automatic admission blocked until dedicated target engines exist.
