# GPAO-T 2.0 Hardware Engine Work Order v0.1

Status: new development-thread handoff  
Audience: GPAO-T 2.0 development thread, BEAI/GPAO implementation agent  
Owner: 윤  
Date: 2026-07-09

## 0. Purpose

이 문서는 GPAO-T 2.0을 처음부터 다시 설계할 때 가장 먼저 닫아야 할 **Hardware Engine** 개발 작업지시서다.

중요 보정:

```text
이 문서는 기존 gpao-t 폴더 안에서 계속 개발하라는 뜻이 아니다.
GPAO-T 2.0 Hardware Engine은 별도 작업 폴더와 별도 문서/evidence/state 체계를 가진
완전히 독립된 개발 환경으로 시작한다.
```

Authoritative new workspace:

```text
/Users/jyp/Documents/Playground 2/gpao-t-hardware-engine
```

Independent work-order copy:

```text
/Users/jyp/Documents/Playground 2/gpao-t-hardware-engine/docs/03-engineering/GPAO-T-2-HARDWARE-ENGINE-WORK-ORDER-v0.1-ko.md
```

이 기존 `gpao-t` 안의 문서는 전환 안내/reference copy다. 새 개발창은 위 독립 workspace의 문서를 기준으로 진행해야 한다.

최상위 목표:

```text
안전 / 안정 / 확장성 / 유연함 / 호환성 / 속도
```

이 여섯 목표는 GPAO-T 2.0 Hardware Engine의 개발 수용 기준이다. 자세한 기준은 독립 workspace의 작업지시서에 반영되어 있다.

여기서 Hardware Engine은 물리 하드웨어 자체가 아니다. 사용자의 표현을 그대로 살리면, 로컬 기반 퍼스널 AI 운영체제에서 가장 안정적이고 변화가 적어야 하는 연결 구조다.

```text
LLM model
+ local PC
+ CLI / MCP / tools
+ local files
+ external devices / connectors
+ gateway / dashboard
+ approval / audit / replay / rollback
```

이 전체를 하나의 안정된 중앙 엔진 모듈로 잡는다.

핵심 명제:

```text
AI 개발의 미래 화두는 모델 성능 경쟁만이 아니라,
기억/맥락을 기반으로 에이전트가 장기 작업을 수행하고,
실행 결과를 통해 스스로 개선되는
개인/조직용 AI 운영체제를 완성하는 방향이다.
```

GPAO-T 2.0은 이 명제를 만족하는 로컬 AI OS여야 한다.

## 1. New Thread Role

이 문서는 새 개발 대화창의 첫 작업 기준이다.

새 개발창은 다음 역할을 맡는다.

- GPAO-T 2.0 Hardware Engine 전용 개발창
- `/Users/jyp/Documents/Playground 2/gpao-t-hardware-engine` 독립 workspace에서만 작업
- OpenClaw의 안정적인 런타임/게이트웨이/대시보드 구조를 먼저 정밀 감사
- GPAO-T 1.x에서 이미 얻은 Context Mesh, T-cell, Approval/Audit, Work Surface 경험을 재사용하되, 바로 UI부터 만들지 않음
- 먼저 중앙 엔진 모듈을 설계/구현/검증
- 현재 대화창은 총괄 검토/방향 조정/리뷰 창으로 유지

새 개발창은 바로 코딩부터 시작하지 않는다. 반드시 먼저 다음 산출물을 만든다.

```text
1. OpenClaw Hardware Layer Source Audit Pass 001
2. GPAO-T 2.0 Hardware Engine Architecture Contract v0.1
3. Implementation Slice Plan
4. Risk / Boundary Matrix
5. Verification Plan
```

## 2. Why Hardware Engine First

GPAO-T 1.x 개발 과정에서 확인한 문제는 명확하다.

- UI와 게이트를 계속 쌓으면 제품은 복잡해지지만 중심 엔진이 흐릿해질 수 있다.
- 모델 라우터, 도구 실행, MCP, CLI, 커넥터, audit, rollback이 서로 따로 놀면 결국 운영체제가 아니라 기능 묶음이 된다.
- 로컬 AI OS에서 가장 안정적이어야 하는 부분은 “모델과 로컬 PC와 외부 장치를 연결하는 구조”다.
- 이 안정된 엔진 위에 GPAO/T-cell/Context Mesh를 얹어야 확장성이 생긴다.

따라서 GPAO-T 2.0은 다음 순서로 간다.

```text
Hardware Engine first
-> T-Kernel / Context Intelligence
-> GPAO Operating Surface
-> Product UX / Team Distribution
```

## 3. Product Layering

GPAO-T 2.0의 계층은 다음과 같다.

```text
Layer 1. Hardware Engine
  - runtime core
  - model connector boundary
  - local PC bridge
  - CLI / MCP / tool execution bus
  - connector/device adapter interface
  - local gateway API
  - event/session/audit/replay/rollback ledger
  - install/update/doctor/package substrate

Layer 2. T-Kernel / Context Intelligence
  - Memory Wiki
  - Context Mesh
  - T-cell admission
  - Task Packet
  - Skill route
  - Self-growth proposal/replay/apply loop

Layer 3. GPAO Operating Surface
  - Work Session
  - Control Center
  - Inspector
  - Approval / Audit UX
  - Korean-first user experience
  - Team/tester distribution surface
```

Hardware Engine은 OpenClaw식 로컬 런타임 안정성을 배우는 층이다.  
T-Kernel은 GPAO-T의 고유 지능 구조다.  
Operating Surface는 사용자가 실제로 느끼는 제품이다.

## 4. Mandatory OpenClaw Source Audit

이 작업은 OpenClaw를 베끼는 작업이 아니다. 하지만 OpenClaw가 이미 잘 닫은 로컬 런타임, 게이트웨이, 대시보드, 세션/로그/스킬 구조는 반드시 실제 소스 기준으로 감사한다.

### 4.1 Live Dashboard

먼저 가능한 경우 실제 로컬 OpenClaw Control Dashboard를 열어 확인한다.

```text
http://127.0.0.1:18789
```

### 4.2 Source Root

Live dashboard가 꺼져 있거나 화면 감사와 병행할 때 다음 built source를 직접 읽는다.

```text
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui
```

### 4.3 Required Files

다음 파일은 반드시 검사한다.

```text
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/index.html
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/manifest.webmanifest
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/sw.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/index-ChrPUbLI.css
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/index-BEWaPr0D.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/gateway-runtime-CMyVbEq5.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/ko-DKTSwiiP.js
```

### 4.4 Required Route / Module References

다음 route/module bundle도 반드시 검사한다.

```text
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/activity-d-8LPZXQ.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/agents-DE2ekHkI.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/sessions-C1p-CU5G.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/workboard-BCRymLbV.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/usage-hK8PD-uU.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/skills-O_Lk1Nti.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/skill-workshop-C5LZHAxC.js
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/logs-BS9a0UVJ.js
```

### 4.5 Existing GPAO-T Design Repair Reference

GPAO-T 1.x 디자인 수리팩도 반드시 참조한다.

```text
/Users/jyp/Documents/Playground 2/gpao-t/docs/02-design/GPAO-T-SESSION-WORKSPACE-DESIGN-REPAIR-PACK-v0.1-ko.md
```

이 문서는 OpenClaw Control Dashboard의 깔끔한 운영 밀도와 Codex식 세션 워크스페이스를 결합하는 방향을 이미 정의한다.

## 5. What To Learn From OpenClaw

OpenClaw에서 가져올 것은 코드 복제가 아니라 안정적인 구조 원리다.

반드시 분석할 것:

- local gateway가 UI와 runtime을 연결하는 방식
- dashboard route 구성
- session / activity / logs / usage / agents / skills / workboard의 정보 구조
- service worker / manifest / app-shell 구성
- runtime status와 failure fallback을 표시하는 방식
- skill workshop의 proposal / apply / rollback 메타데이터 흐름
- CLI / gateway / local service가 어떻게 연결되는지
- 설치 환경, Node runtime, local port, process, health check, update/doctor에 가까운 구조
- UI에서 실행 상태, 로그, 사용량, 스킬, 에이전트가 어떻게 분리되는지

가져오면 안 되는 것:

- OpenClaw 브랜드나 UI 복제
- messenger/channel-first 제품 모델
- 개발자-heavy 문구를 GPAO-T 사용자 표면에 그대로 노출
- 실행 권한을 느슨하게 여는 구조
- dashboard를 최종 사용자 메인 화면으로 만드는 구조

GPAO-T는 OpenClaw보다 사용자 친화적이고, 한국어 기본값이며, Codex급 세션형 작업 UX를 가져야 한다.

## 6. Hardware Engine Modules

Hardware Engine v0.1은 다음 모듈로 설계한다.

### 6.1 Runtime Core

로컬 OS 엔진의 생명주기 담당.

- start / stop / health
- local runtime status
- process boundary
- local port / route registry
- mode: read-only / dry-run / approval-required / active

### 6.2 Model Connector Boundary

모델 제공자와의 연결 경계.

- provider registry
- route profile
- credential boundary
- latency/cost/risk policy
- fallback chain
- model output boundary

초기에는 credential read/write와 live model call을 열지 않는다.

### 6.3 Local PC Bridge

사용자 PC와의 연결 경계.

- file read candidate
- workspace scan candidate
- local app/runtime status
- OS command proposal
- permission class

초기에는 파일 쓰기, destructive command, install/update 실행을 열지 않는다.

### 6.4 CLI / MCP / Tool Bus

도구 실행을 중앙에서 분류하고 통제한다.

- CLI candidate
- MCP candidate
- tool candidate
- dry-run plan
- expected effect
- risk class
- rollback reference
- approval packet requirement

초기에는 실제 실행이 아니라 proposal / dry-run contract만 연다.

### 6.5 Connector / Device Adapter Interface

외부 서비스와 장치 연결을 위한 표준 인터페이스.

- connector registry
- scope
- credential boundary
- read-only lane
- write lane
- external-send lane
- paid/destructive lane
- audit/replay/rollback requirement

초기에는 read-only proof도 바로 열지 않는다. 먼저 registry와 boundary를 닫는다.

### 6.6 Session / Event Store

장기 작업을 이어가기 위한 사건 기록 층.

- session id
- turn id
- user request
- task packet reference
- model route reference
- tool proposal reference
- approval/audit reference
- replay/rollback reference

### 6.7 Authority / Audit / Replay / Rollback

모든 실행 전후를 관리하는 안전층.

- authority level
- approval packet
- audit record
- replay fixture
- rollback reference
- blocked action reason
- stale/conflict handling

### 6.8 Package / Install / Update / Doctor

로컬 앱으로 배포되기 위한 기반.

- prerequisite doctor
- version manifest
- install plan
- update plan
- rollback plan
- local snapshot/export
- signed package gate

초기에는 실제 install/update/rollback 실행을 열지 않는다.

### 6.9 Dashboard API

Control Center와 Work Session이 읽을 수 있는 API.

- `/engine/health`
- `/engine/status`
- `/engine/routes`
- `/engine/sessions`
- `/engine/events`
- `/engine/tool-bus`
- `/engine/model-boundary`
- `/engine/authority`
- `/engine/audit`
- `/engine/doctor`

초기 route는 GET/read-only만 허용한다.

## 7. First Implementation Scope

첫 구현 범위는 작게 보이더라도 실제 엔진의 중심을 잡아야 한다.

반드시 포함:

```text
1. Hardware Engine architecture contract
2. engine state schema
3. runtime health object
4. model connector registry schema
5. tool/MCP/CLI bus registry schema
6. session/event ledger schema
7. authority/audit/replay/rollback schema
8. read-only CLI surface
9. read-only gateway/API surface
10. local verification tests
```

초기에는 금지:

```text
- live model call
- credential read/write
- actual CLI/MCP/tool execution
- connector activation
- external network/send
- paid action
- destructive action
- install/update/rollback execution
- durable memory promotion
- self-growth apply
- public release/deploy
```

## 8. Required First Slice

첫 대단계는 다음 하나로 본다.

```text
GPAO-T 2.0 Hardware Engine Foundation v0.1
```

이 대단계 안에서 다음을 끝낸다.

### 8.1 OpenClaw Hardware Layer Source Audit Pass 001

산출물:

```text
docs/03-engineering/OPENCLAW-HARDWARE-LAYER-SOURCE-AUDIT-PASS-001.md
```

포함 내용:

- 실제로 읽은 OpenClaw 파일 목록
- gateway/runtime/control-ui 구조 요약
- GPAO-T가 흡수할 구조 원리
- 흡수하지 않을 요소
- 위험/권한 경계
- GPAO-T Hardware Engine에 매핑되는 항목

### 8.2 Hardware Engine Architecture Contract v0.1

산출물:

```text
docs/03-engineering/GPAO-T-2-HARDWARE-ENGINE-ARCHITECTURE-v0.1.md
```

포함 내용:

- 엔진 계층도
- 모듈 책임
- module boundary
- allowed operations
- blocked operations
- data contracts
- route contracts
- verification contracts

### 8.3 Hardware Engine Local Skeleton v0.1

초기 코드는 현재 repo 구조에 맞춰 결정한다. 단, 다음 원칙을 지킨다.

- `src/core` 아래에 중앙 엔진 모듈을 둔다.
- CLI/Gateway route는 기존 GPAO-T 패턴을 따른다.
- 새 이름은 구현자가 repo 구조를 보고 정하되, 문서에는 대응표를 남긴다.
- 기존 GPAO-T 1.x 코드를 무리하게 재작성하지 않는다.
- 새 엔진이 기존 Work Surface/Control Center와 연결될 수 있는 read-only summary를 제공한다.

### 8.4 Engine Doctor / Health v0.1

로컬 상태를 확인하는 첫 doctor를 만든다.

필수 확인:

- repo root
- runtime mode
- local route availability
- schema readiness
- blocked boundary readiness
- audit/replay path readiness
- OpenClaw reference path availability

### 8.5 Engine Dry-run Bus v0.1

실제 실행 없이 proposal과 dry-run plan만 만든다.

필수 필드:

- requested action
- action class
- authority level
- expected effect
- affected resources
- required approval
- audit target
- rollback reference
- blocked reason if not allowed

### 8.6 Dashboard API Proof v0.1

Control Center/Work Surface에서 읽을 수 있는 read-only route를 만든다.

필수:

- no POST
- no mutation
- no external call
- no credential access
- no command execution
- route verification
- browser/local route proof where applicable

## 9. Verification

완료 주장은 다음 검증을 통과해야 한다.

필수:

```text
npm run check
npm test
npm run verify
git diff --check
```

가능한 경우:

```text
node bin/gpao-t.js <new-engine-command> --json
node bin/gpao-t.js <new-engine-check-command>
node bin/gpao-t.js control serve-check
beai verify --run --scenario --meaning
beai closeout --apply
```

UI route를 만들었다면:

- desktop screenshot QA
- mobile screenshot QA
- no horizontal overflow
- no external link activation
- no script injection beyond intended app shell
- Korean label clipping check

## 10. Report Format

개발팀 완료 보고는 짧고 명확해야 한다.

반드시 포함:

```text
현재 대단계:
끝낸 범위:
OpenClaw에서 실제 확인한 파일:
구현/문서 변경:
검증 결과:
계속 차단된 경계:
남은 리스크:
전체 플랜상 위치:
다음 대단계:
커밋:
```

작은 meta-gate를 계속 쪼개서 보고하지 않는다. 하나의 대단계를 실제로 끝낸 뒤 보고한다. 단, credential, 외부 전송, 비용 발생, destructive action, public release, live connector activation, durable memory promotion, install/update/rollback execution 같은 권한 경계가 생기면 멈추고 짧게 보고한다.

## 11. Absolute Boundaries

다음은 명시 승인 전까지 금지다.

- credential read/write
- paid model call
- external network/send
- live connector activation
- live MCP/tool/CLI execution
- destructive file operation
- install/update/rollback execution
- public release/deploy
- durable memory promotion
- self-growth apply
- recurring automation activation

초기 Hardware Engine은 안전한 read-only/dry-run/proposal 중심이어야 한다.

## 12. Relationship To T-cell / GPAO

Hardware Engine은 GPAO-T의 지능이 아니다. Hardware Engine은 지능이 안정적으로 작동할 수 있게 하는 로컬 OS 기반이다.

T-cell / Context Mesh / Memory Wiki / Self-growth는 그 위에서 작동한다.

관계는 다음과 같다.

```text
Hardware Engine:
  Can this system connect, observe, route, propose, audit, replay, and rollback safely?

T-Kernel:
  What context, principle, memory, skill, and authority should be admitted for this task?

GPAO Operating Surface:
  Can the user understand, trust, control, and improve the work?
```

Hardware Engine이 흔들리면 T-cell도, Context Mesh도, Work Surface도 안정적으로 커질 수 없다.

## 13. New Thread Opening Prompt

새 개발창에는 아래 내용을 그대로 전달한다.

```text
GPAO-T 2.0 Hardware Engine 전용 개발을 시작한다.

작업 기준 문서:
/Users/jyp/Documents/Playground 2/gpao-t/docs/03-engineering/GPAO-T-2-HARDWARE-ENGINE-WORK-ORDER-v0.1-ko.md

먼저 바로 구현하지 말고, 문서의 지시에 따라 OpenClaw Hardware Layer Source Audit Pass 001을 수행해라.

반드시 확인할 OpenClaw live dashboard:
http://127.0.0.1:18789

반드시 확인할 OpenClaw source root:
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui

특히 index.html, manifest.webmanifest, sw.js, index CSS/JS, gateway-runtime, ko bundle, activity/agents/sessions/workboard/usage/skills/skill-workshop/logs route bundle을 실제로 읽고,
GPAO-T 2.0 Hardware Engine에 흡수할 구조 원리와 버릴 요소를 구분해라.

목표는 OpenClaw를 복제하는 것이 아니라,
LLM model + local PC + CLI/MCP/tools + connectors + gateway/dashboard + approval/audit/replay/rollback을 안정적으로 잇는
GPAO-T 2.0 중앙 엔진 모듈을 먼저 완성하는 것이다.

첫 대단계는 GPAO-T 2.0 Hardware Engine Foundation v0.1이다.
작은 meta-gate를 쪼개지 말고, OpenClaw source audit -> architecture contract -> local skeleton -> engine doctor/health -> dry-run bus -> read-only dashboard API proof까지 하나의 대단계로 진행해라.

명시 승인 전까지 live model call, credential read/write, actual CLI/MCP/tool execution, connector activation, external network/send, paid/destructive action, install/update/rollback execution, durable memory promotion, self-growth apply, public release/deploy는 열지 마라.

완료 보고에는 현재 대단계, 끝낸 범위, 실제 확인한 OpenClaw 파일, 구현/문서 변경, 검증 결과, 계속 차단된 경계, 남은 리스크, 전체 플랜상 위치, 다음 대단계, 커밋을 포함해라.
```
