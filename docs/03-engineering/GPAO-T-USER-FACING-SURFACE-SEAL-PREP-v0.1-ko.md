# GPAO-T User-Facing Surface Seal Prep v0.1

Status: active prep order
Date: 2026-07-12
Owner: 윤

## 목적

라이브 지파오티에서 사용자가 눈으로 보고, 클릭하고, 읽고, 저장하고, 오류로 경험하는 모든 표면을 `nBeAI. GPAO-T`로 봉인한다.

이 작업은 단순 로고 교체가 아니다. 대시보드 전체 메뉴, 하위 페이지, 설정 버튼 아래의 모든 설정 섹션, 브라우저/PWA 메타데이터, 페어링/노드/플러그인/사용량/설정/디버그/오류 화면, 워크스페이스 런타임 문서, 내보내기 파일명, 도움말 링크까지 모두 포함한다.

여기서 "대시보드 전체"는 사용자가 UI에서 접근 가능한 모든 화면을 뜻한다. 좌측 사이드바의 고정 메뉴만이 아니라 `설정`, `더 보기`, command palette/search, session menu, group menu, chat settings, model/voice/settings popover, plugin detail, device pairing modal, export dialog, update banner, error recovery screen, empty state도 포함한다.

## 원칙

1. 사용자 표면에서는 `OpenClaw`, OpenClaw 로고/마스코트, OpenClaw 서비스명, OpenClaw 도움말 링크가 남으면 안 된다.
2. 내부 구현 식별자, 패키지 경로, 호환 키, 연구 문서의 출처 표기는 즉시 바꾸면 런타임을 깨뜨릴 수 있으므로 별도 분류한다.
3. 내부 출처로 남는 OpenClaw는 `GPAO-T가 흡수한 원천 런타임/기술 계층`으로만 다룬다.
4. live dist 직접 수정은 백업, 해시가드, manifest, rollback, readback을 동반한다.
5. 완료 표현은 visual QA와 문자열 봉인 검사가 끝난 뒤에만 쓴다.

## 감사 결과 요약

### 이미 봉인된 부분

- 브라우저 title: `nBeAI. GPAO-T`
- PWA manifest name/short_name: `nBeAI. GPAO-T`
- 주요 icon reference: `gpao-logo.jpeg`, `favicon-32.png`, `apple-touch-icon.png`
- 기본 채팅 화면의 상단 개발자 work pane 숨김 패치
- Telegram direct session을 별도 `소통` rail로 분리하는 v0.3 패치

### 즉시 처리할 user-facing 잔재

| 등급 | 위치 | 잔재 | 처리 |
| --- | --- | --- | --- |
| P0 | live `control-ui/index.html` fallback | `Control UI did not start`, `Control UI troubleshooting`, `docs.openclaw.ai` | GPAO-T 오류/복구 문구와 로컬 도움말 링크로 교체 |
| P0 | live i18n bundle | `OpenClaw mobile`, `Official OpenClaw mobile apps`, `ClawHub`, `extend OpenClaw` | source/i18n 기준 replacement map 작성 후 patch/rebuild 또는 guarded live patch |
| P0 | live Korean locale bundle | `OpenClaw 모바일`, `공식 OpenClaw 모바일 앱`, `OpenClaw가 소유한`, `OpenClaw를 확장` | Korean 우선 봉인 |
| P0 | live `favicon.svg` | legacy red claw mascot | GPAO-T logo/svg로 교체 또는 asset dereference |
| P0 | usage page bundle | `openclaw-usage-*` export filenames | `gpao-t-usage-*`로 교체 |
| P1 | service worker | `openclaw-control-*` cache prefix, `openclaw-notification` tag | 새 cache/tag로 교체하고 기존 cache 정리 |
| P1 | debug page | `openclaw security audit --deep` | GPAO-T wrapper command 또는 사용자용 점검 문구로 교체 |
| P1 | plugins/settings | `ClawHub`, `OpenClaw capability`, OpenClaw docs | GPAO-T 확장/도움말 언어로 교체 |
| P1 | workspace shell source | “OpenClaw 대시보드에서 분기”, “live OpenClaw 변경 없음” | GPAO-T owned workspace 문구로 교체 |
| P1 | app shell / tauri shell | `Read-Mostly`, `Authority Boundary`, `Evidence Inspector` 등 개발자 문구 | 일반 사용자용 한국어 메뉴/상태 언어로 완화 |

### 설정 버튼 포함 전체 접근 화면 기준

설정은 별도 부속 화면이 아니라 GPAO-T 사용자 경험의 핵심 표면이다. 따라서 다음 섹션 전체를 user-facing seal 대상으로 고정한다.

| 영역 | 포함되는 화면 | 처리 기준 |
| --- | --- | --- |
| General / Appearance | 언어, 테마, setup wizard, profile/appearance preference | GPAO-T 용어로 정리하고 legacy mascot/lobster/claw 성격 요소 제거 또는 숨김 |
| Connections | Gateway URL, auth, channel, device 연결, pairing 안내 | OpenClaw Gateway 문구를 GPAO-T local runtime/연결 문구로 교체 |
| Agents & Tools | agents, model provider, tools, skills, MCP | 개발자용 raw label은 고급 설정으로 숨기고 기본 화면은 GPAO-T 작업/도구 언어로 교체 |
| System / Infrastructure | browser, media, logs, service, debug, security audit | 일반 사용자 화면에서는 상태/점검/복구 언어로 낮추고 원천 런타임명은 내부 상세에만 배치 |
| Automation / Cron | 예약, wakeup, delivery, run history | GPAO-T 자동화/반복 작업 언어로 통일 |
| Plugins / Discover | ClawHub, optional OpenClaw capability, connector text | GPAO-T 확장/연결 언어로 교체하거나 public discover 성격이 불명확하면 숨김 |
| About / Build identity | Control UI, Gateway build identity | `nBeAI. GPAO-T` 제품 정보로 교체하되, OpenClaw origin은 기술 세부정보 접힘 영역으로 이동 |

### 별도 마이그레이션이 필요한 잔재

| 위치 | 이유 | 원칙 |
| --- | --- | --- |
| `openclaw-app` custom element | 번들 mount 계약일 수 있음 | 사용자에게 보이지 않으면 즉시 변경 금지 |
| `openclaw.control.settings.v1` localStorage key | 설정 마이그레이션 필요 | GPAO-T key를 추가하고 기존 키는 읽기 호환 |
| `~/.openclaw/openclaw.json` | 런타임 config path | GPAO-T alias/manifest 먼저, 실제 path rename은 후속 |
| `OPENCLAW_*` env/service names | gateway/service lifecycle 위험 | alias와 service health check를 먼저 설계 |
| `@openclaw/*` package names | 실제 dependency 경로 | 내부 technical substrate로 보존 가능 |

## 전체 표면 범위

1. Browser/PWA: title, favicon, apple icon, manifest, service worker, cache name, notification tag.
2. Dashboard shell: sidebar, topbar, command palette, search, session rail, Telegram rail, status badge.
3. Chat: welcome, composer, model selector, session title, loading/streaming/stop states, error state.
4. Sessions: create, rename, archive, restore, delete, group, sort, empty state.
5. Nodes/pairing: mobile pairing, device approval, QR, token copy, stale pairing cleanup.
6. Plugins/skills: discover, installed, connector text, ClawHub references, MCP helper copy.
7. Settings: settings home, general, appearance, connection, channels, agents/tools, model providers, skills, MCP, automation, cron, system, infrastructure, browser/media, logs/debug, profile, about, every nested modal/popover/search result.
8. Usage: charts, plan usage, export filenames, cost/limit labels.
9. Debug/logs/activity: user-visible diagnostics, security audit commands, raw gateway labels.
10. Workspace runtime: `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`, `WELCOME.md`.
11. Error/fallback: blank screen recovery, auth failure, origin/protocol/network failure, update banner.
12. Package/internal-verification surface: install guide, first-run guide, exported evidence visible to the internal verifier.
13. Hidden-but-accessible UI: command palette entries, tooltip text, aria labels, menu actions, confirmation dialogs, browser notification text, copied/exported filenames.

## 실행 순서

### Phase 1. Inventory freeze

- live dist, `~/.openclaw/workspace`, `~/.openclaw/service-env`, `~/.openclaw/devices`, package docs를 read-only scan한다.
- 결과를 `user_facing`, `developer_internal`, `technical_compat`, `historical_evidence`로 분류한다.
- `OpenClaw` 문자열이 있다고 모두 실패로 보지 않는다. 사용자가 볼 수 있는 표면에 남는 것만 P0/P1로 본다.
- route inventory는 반드시 `Chat`, `Overview`, `Sessions`, `Agents`, `Skills`, `Skill Workshop`, `Nodes`, `Dreaming`, `Communications`, `Usage`, `Plugins`, `Tasks`, `Worktrees`, `Channels`, `Instances`, `Cron`, `Logs`, `Debug`, `Profile`, `About`, `Settings`의 모든 nested section을 포함한다.
- 설정 버튼 아래 화면은 `검색 결과에만 나오는 항목`, `modal/popover로만 열리는 항목`, `admin 권한이 있어야 보이는 항목`까지 접근 가능 표면으로 취급한다.

### Phase 2. Source surface patch

- `workspace-shell.js`, `browser-local-app-shell.js`, `core-work-surface.js`, `multi-chat-workspace.js`, `model-invocation.js`의 사용자 노출 문구를 GPAO-T owned language로 바꾼다.
- developer label은 일반 사용자 label로 낮춘다.
- 테스트는 기존 source tests에 user-facing forbidden string gate를 추가한다.

### Phase 3. Live control UI surface patch

- 별도 도구 `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`를 만든다.
- 이 도구는 기본 dry-run이며, `--apply --approval-token apply-gpao-t-surface-seal-live` 없이는 live dist를 쓰지 않는다.
- patch targets:
  - `control-ui/index.html`
  - `control-ui/favicon.svg`
  - `control-ui/sw.js`
  - `control-ui/assets/*i18n*.js`
  - `control-ui/assets/ko-*.js`
  - `control-ui/assets/usage-page-*.js`
  - `control-ui/assets/debug-page-*.js`
  - main app shell bundle containing docs/profile/mascot/localStorage labels
  - settings/about/plugins/nodes/model-provider 관련 app shell/i18n bundle

### Phase 4. Runtime workspace seal

- `~/.openclaw/workspace` 파일은 GPAO-T runtime prompt pack으로 다시 검수한다.
- 일반 사용자가 파일 탭에서 봐도 “OpenClaw 기본 에이전트 홈”이 아니라 “GPAO-T Runtime Workspace”로 이해되어야 한다.
- OpenClaw 출처 설명은 developer/internal section으로만 제한한다.

### Phase 5. Risk migration

- service/env/config/device 이름은 즉시 일괄 rename하지 않는다.
- 먼저 GPAO-T alias, readback, backward compatibility를 만든다.
- 이후 Gateway health, device auth, Safari session, Telegram direct session이 깨지지 않는지 확인한 뒤 좁게 적용한다.

### Phase 6. Visual and conversation QA

- Safari fresh reload에서 기본 화면, 새 대화, 기존 세션, Telegram rail, 설정, 노드, 플러그인, 사용량, 오류 fallback을 확인한다.
- desktop/mobile viewport screenshot을 남긴다.
- 테스트 대화창은 QA 후 삭제한다.
- 완료 조건: 사용자 표면에서 OpenClaw 흔적이 보이지 않고, chat/send/stream/stop/session operations가 정상 작동한다.

## 완료 기준

- 기본 대시보드와 모든 메뉴/하위 페이지에서 OpenClaw 로고, 마스코트, 서비스명, 도움말 링크가 보이지 않는다.
- 오류/복구 화면도 GPAO-T로 설명한다.
- export/download 파일명이 GPAO-T 기준이다.
- runtime workspace 점검 응답이 “Aigis 개인 홈”이나 “OpenClaw 기본 workspace”가 아니라 “GPAO-T Runtime Workspace”로 나온다.
- 기술 호환 이름은 내부로만 남고, 사용자 UI/문서/도움말에 노출되지 않는다.
- dry-run, apply manifest, rollback manifest, visual QA, smoke test evidence가 모두 남는다.

## 이번 준비 작업의 결론

현재 지파오티는 주 화면 정체성은 상당히 GPAO-T로 왔지만, 전체 사용자 경험 봉인은 아직 끝나지 않았다.

다음 실제 개발 단위는 `Phase 2 + Phase 3`를 한 묶음으로 가져간다. 즉, source user-facing copy를 먼저 정리하고, 이어서 guarded live surface seal patch 도구를 만들어 live dist의 i18n/fallback/icon/export/service-worker 잔재를 처리한다.

## Route Inventory v0.1

추가 route 감사 결과, live dashboard는 설정을 포함한 user-facing route/copy layer에서 아직 OpenClaw 소유 언어가 많이 남아 있다. 다음 표를 실제 패치 체크리스트로 사용한다.

| Route / 메뉴 | 현재 위험 | 조치 |
| --- | --- | --- |
| `/chat` Chat | Gateway chat, OpenClaw session/memory wording, export/search/tool error | rewrite |
| `/overview` Overview | Gateway status/token/log identity | rewrite |
| `/activity` Activity | tool activity/debug copy | 기본 사용자 화면에서는 hide, 고급 점검으로 이동 |
| `/workboard` Workboard | agent work queue, dispatcher, proof, worker logs | rewrite |
| `/instances` Instances | Gateway/client presence wording | rewrite |
| `/sessions` Sessions | session keys, checkpoints, fork/restore/archive developer copy | rewrite |
| `/usage` Usage | API usage/costs, export, error analytics | rewrite, export filename seal |
| `/cron` Cron Jobs | scheduler/jobs/runs developer ops copy | hide or rewrite |
| `/tasks` Tasks | background task/CLI/subagent copy | rewrite |
| `/agents` Agents | workspace/tools/identity/core files | rewrite |
| `/skills` Skills | ClawHub labels/search/install/detail | rewrite or hide discover |
| `/settings/plugins` Plugins | ClawHub, optional OpenClaw capability, extend OpenClaw, Gateway restart | rewrite/hide discover |
| `/skills/workshop` Skill Workshop | proposal/apply/revision/support file developer workflow | power-user surface로 rewrite or hide |
| `/nodes` Nodes | OpenClaw mobile pairing, Gateway approvals, device commands | rewrite |
| `/dreaming` Dreaming | memory dreaming/consolidation internal runtime concept | rewrite or hide |
| `/settings/profile` Profile | reef/claws/mascot flavor | rewrite |
| `/settings/general` Settings / General | `openclaw.json`, Gateway access, Control UI override | rewrite, config path는 technical detail로 이동 |
| `/settings/appearance` Appearance | Control UI, setup wizard, mascot-flavored copy | rewrite, legacy mascot 제거 |
| `/settings/channels` Channels | Gateway/channel status, channel account errors | rewrite |
| `/settings/communications` Communications | channels/messages/audio settings, Gateway URL bits | rewrite |
| `/settings/ai-agents` AI & Agents | agents/models/skills/tools/memory/session raw labels | rewrite |
| `/settings/automation` Automation | commands/hooks/cron/plugins developer ops | hide or rewrite |
| `/settings/mcp` MCP | MCP servers/auth/tools/diagnostics | power-user settings로 rewrite |
| `/settings/infrastructure` Infrastructure | Gateway/web/browser/media settings | hide or rewrite |
| `/settings/worktrees` Worktrees | `owned by OpenClaw` | rewrite |
| `/debug` Debug | manual RPC, snapshots, models, event log | hide/internal keep |
| `/logs` Logs | Gateway JSONL logs, export visible/filtered | hide/internal keep |
| `/settings/about` About | Control UI build identity, connected Gateway version | rewrite; OpenClaw origin은 접힘 기술 세부정보 |
| `/plugin?plugin=&id=` Plugin tab host | plugin-provided panels, unknown copy | allowlist/internal keep |

## Discoverable State Inventory

| 상태 | 현재 위험 | 조치 |
| --- | --- | --- |
| mount/fallback error | `OpenClaw Control UI`, `Control UI did not start`, `docs.openclaw.ai` | rewrite |
| lazy route failure | latest `Control UI` bundle | rewrite |
| settings search | settings route labels가 바뀌기 전에는 OpenClaw/Gateway copy를 노출할 수 있음 | route label rewrite 후 재검사 |
| export states | chat/logs/usage export에서 OpenClaw/Gateway filename/copy 가능 | filename/copy rewrite |
| modals | plugin detail/install risk, node pairing, session rename/delete/group, skill file preview | node/plugin/session 우선 rewrite |
| static GPAO-T control center | `OpenClaw 라이브 훅 준비` | 사용자 표면이면 rewrite, 내부 기술 접힘이면 keep |
