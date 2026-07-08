# Control Center Approval Preview UX QA 2026-07-09

Status: ready

Target: `/control-center#panel-approval-preview`

This gate verifies the user-visible approval/preview flow only. It does not open approval record write, dry-run invocation, command execution, file mutation, Tauri build, dependency install, install/update/rollback execution, IPC, external network, or connector/model/tool activation.

## User Understanding

- The panel says: `아직 실행된 것은 없음`.
- The flow reads as `승인 전 미리보기`, not as execution.
- The five stages are visually separated as `계획`, `프리뷰`, `승인 범위`, `기록 위치`, and `쓰기 게이트`.
- Blocked actions use calm locked-state language such as `잠김`, `아직 저장하지 않음`, and `외부 호출 없음`.
- The next safe action remains approval/preview readability refinement before any write or invocation path.

## Screenshot Evidence

- Desktop viewport: `control-center-approval-preview-ux-2026-07-09-desktop-viewport-1440x960.png`
- Mobile viewport: `control-center-approval-preview-ux-2026-07-09-mobile-viewport-390x844.png`
- Desktop focused approval panel: `control-center-approval-preview-ux-2026-07-09-desktop-focused-1440x960.png`
- Mobile focused approval panel: `control-center-approval-preview-ux-2026-07-09-mobile-focused-390x844.png`

## Checks

- Nonblank viewport: pass
- Five stages visible in focused desktop/mobile captures: pass
- Ten locked actions visible in focused desktop/mobile captures: pass
- Next safe action visible: pass
- Mobile fixed topbar action line visible: pass
- No horizontal overflow: pass
- No script, form, or external links: pass
- Authority boundary remains visible and blocked: pass

## Still Blocked

- approval record write
- dry-run invocation
- command execution
- file mutation
- Tauri build
- dependency install
- install/update/rollback execution
- IPC
- external network
- connector/model/tool activation
