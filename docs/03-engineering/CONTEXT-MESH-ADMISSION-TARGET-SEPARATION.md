# Context Mesh Admission Target Separation

Status: implemented  
Date: 2026-07-09  
Scope: Work Surface, First Local Work Loop, Context Mesh resolve, turn admission

## Why This Exists

First Local Work Loop v1 proved the local work loop, but it exposed a continuity risk:

- a previous `release-file` active target can be useful for short follow-up requests
- the same P0 continuity anchor is harmful when it leaks into ordinary Work Surface requests
- retrieved memory must not become admitted memory by default
- supporting context must not become an answer anchor

This pass separates request-type active targets before admission.

## Request-Type Policy

`src/core/context-admission-policy.js` is the local source of truth.

| Request shape | Active target | Prior target handling |
| --- | --- | --- |
| explicit release-file request | `release-file` | can be answer anchor |
| release-file follow-up | `release-file` | can recover prior release flow |
| generic follow-up with prior flow | prior active target | can recover prior flow |
| artifact request without release signal | `artifact` | current request wins |
| general Work Surface request | `general-runtime` | prior release target becomes stale/supporting |
| general work request | `general-runtime` | prior release target becomes stale/supporting |

## Admission Roles

Context Mesh candidates now carry target-use metadata:

- `answer_anchor`: candidate matches the current request's active target.
- `supporting_context`: candidate may inform the turn but cannot anchor the answer.
- `stale_supporting`: candidate is relevant history from an old target and is visible only as downgraded support.

The turn admission layer respects these fields:

- `answerAnchorEligible: false` prevents anchor promotion.
- `stale_supporting` receives a score downgrade but remains visible for inspection.
- generic Work Surface requests do not inherit `release-file` from runtime continuity.

## Product Behavior

For a request like:

```text
GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.
```

GPAO-T now uses:

```text
requestType: work_surface_general_request
activeTargetId: general-runtime
stalePriorTarget: true
```

For a request like:

```text
그럼 배포파일은?
```

GPAO-T keeps the intended recovery path:

```text
requestType: release_file_follow_up
activeTargetId: release-file
continuityState: recovered
```

## Design Track Boundary

This pass does not attempt product-grade visual polish. GPAO-T Design Reference based UI polish remains a separate track. UI surfaces only received minimal label support so users can distinguish:

- 주 맥락
- 보조 맥락
- 이전 흐름 보조 맥락

## Verification Contract

Regression tests must prove:

- explicit release-file follow-ups still recover `release-file`
- generic Work Surface requests use `general-runtime`
- stale release-file candidates are not admitted as anchors
- First Local Work Loop does not inherit stale release-file continuity
- Control Center / Work Surface can display the downgraded role without opening model/tool/connector execution
