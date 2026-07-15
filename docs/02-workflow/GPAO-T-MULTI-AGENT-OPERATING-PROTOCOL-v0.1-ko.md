# GPAO-T Multi-Agent Operating Protocol v0.1

Status: active protocol  
Date: 2026-07-10  
Owner: 윤 (@aigis0927)  
Scope: GPAO-T 개발 중 Codex가 필요에 따라 멀티 에이전트를 제안, 구성, 리딩하는 기준
OpenClaw reference class: third-party comparison, compatibility, and migration only.

GPAO-T is an independent, local-first Growth Personal AI Operating System.

## 1. 목적

GPAO-T는 단일 대화형 작업만으로 완성할 제품이 아니다.

리서치, 이론 정리, 제3자 OpenClaw 호환성/마이그레이션 live 경로 분석, 구현, 테스트, UX 검토, 보안/권한 검토, GitHub 완료 프로젝트 참조가 동시에 필요할 수 있다.

따라서 Codex는 필요할 때 멀티 에이전트를 제안하고 구성할 수 있다.

단, 멀티 에이전트는 일을 복잡하게 만들기 위한 장식이 아니다. 다음 목적이 있을 때만 사용한다.

- 병렬 리서치가 필요할 때
- 기존 nbeai GitHub 완료 프로젝트를 여러 갈래로 비교해야 할 때
- 제3자 OpenClaw 호환성/마이그레이션 live 경로와 GPAO-T 제품 설계를 분리해서 검토해야 할 때
- 구현자와 리뷰어를 분리해야 할 때
- 테스트/QA 관점이 따로 필요할 때
- 보안, 권한, durable memory, connector, automation 경계가 섞일 때
- 사용자 체감 UX와 내부 런타임 안정성을 동시에 봐야 할 때

## 2. 기본 원칙

윤은 멀티 에이전트 팀을 직접 관리하지 않는다.

Codex가 다음을 맡는다.

- 어떤 에이전트가 필요한지 판단
- 각 에이전트의 역할과 산출물 정의
- 중복 작업 방지
- 결과 종합
- 충돌 판단
- 최종 의사결정 후보 정리
- 윤에게 필요한 판단만 짧게 제시

Codex는 작업 효율, 위험도, 병렬성, 검증 필요성을 보고 에이전트팀 진행이 더 낫다고 판단하면 기본적으로 Team Mode를 사용할 수 있다. Team Mode는 사용자의 추가 지시를 기다리는 장식적 회의가 아니라, GPAO-T 목적에 맞는 역할 분리형 실행 방식이다.

단, Team Mode의 기본값은 "중앙 통합 유지"다. 여러 에이전트가 동시에 판단하더라도 최종 반영, 코드 통합, 문서 확정, 검증 완료 표현은 Codex 본체의 Synthesis Lead 책임으로 남긴다.

윤은 다음만 판단하면 된다.

- 방향이 맞는가
- 제품 감각이 맞는가
- 승인 경계를 열어도 되는가
- 멀티 에이전트 결과 중 어느 쪽이 GPAO-T답다고 느끼는가

## 2.1 Team Mode 전환 기준

Codex는 다음 조건 중 하나 이상이 있으면 Team Mode를 우선 검토한다.

- 리서치, 설계, UX, 구현, QA가 동시에 필요한 작업
- T-cell 이론 적용과 실제 런타임/화면 구현이 함께 걸린 작업
- 제3자 OpenClaw 호환성/마이그레이션 live 경로 분석과 GPAO-T 제품 설계를 분리해서 봐야 하는 작업
- 사용자가 일반 사용자 입장에서 체감 UX를 중요하게 말한 작업
- 이전 작업이 뺑뺑이, 과잉 계획, 방향 꼬임, context recovery 실패를 보인 작업
- 외부 자료, nbeai GitHub 완료 프로젝트, 로컬 코드, 테스트 증거를 함께 비교해야 하는 작업

Codex는 다음 경우에는 Team Mode를 쓰지 않고 단일 실행으로 처리한다.

- 단일 파일의 작은 수정
- 이미 설계가 잠긴 테스트/문서 보정
- 즉시 고칠 수 있는 명확한 버그
- 에이전트 대기 시간이 실제 작업보다 클 때
- 쓰기 범위가 겹쳐 충돌 가능성이 더 클 때

Team Mode를 시작할 때 Codex는 먼저 다음을 정한다.

```text
중앙 목표
필요한 역할
각 역할의 산출물
건드려도 되는 파일/영역
건드리면 안 되는 승인 경계
종료 조건
```

에이전트 산출물은 기본적으로 review candidate다. 바로 제품 원칙, Canon, runtime, durable memory, live third-party compatibility runtime, public release로 승격하지 않는다.

## 3. 기본 에이전트 역할

필요시 다음 역할을 구성한다.

| 역할 | 임무 | 산출물 |
| --- | --- | --- |
| Flow Keeper | 전체 작업이 제3자 OpenClaw 호환성/마이그레이션 경로, 권한 경계, 증거 조건, 다음 행동 압축에서 벗어나지 않는지 감시 | drift / blocker / evidence / authority / next action check |
| Research Agent | GitHub, 논문, 커뮤니티, nbeai 완료 프로젝트 조사 | source-grounded research note |
| Architecture Agent | GPAO-T 전체 OS 구조와 제3자 OpenClaw 호환성/마이그레이션 경계 검토 | architecture decision memo |
| Runtime Agent | 제3자 OpenClaw 호환성 live 경로, prompt path, gateway, session, model/tool route 분석 | runtime evidence / patch proposal |
| Implementation Agent | 코드와 문서 구현 | patch / files / tests |
| QA Agent | replay, smoke, regression, user scenario 검증 | QA report |
| Security & Authority Agent | 권한, secrets, connector, live mutation, rollback 경계 검토 | authority risk memo |
| UX Companion Agent | 일반 사용자 체감, 한국어 표현, 불안감, Work Surface 흐름 검토 | human usability note |
| Synthesis Lead | 결과를 GPAO-T 목적에 맞게 합치고 최종 경로 결정 | final synthesis / next action |

Codex 본체는 기본적으로 Synthesis Lead 역할을 가진다.

Flow Keeper는 구현자나 관리자 역할이 아니다. 별도의 PM처럼 개발 우선순위를 독단적으로 바꾸지 않고, Codex가 작업 중 샛길로 빠지는지 감시한다. 특히 다음 다섯 가지를 체크한다.

- 제3자 OpenClaw 호환성/마이그레이션 경로를 제품 경계 안에서 유지하는가
- lab/fork before live 원칙을 지키는가
- sidecar/mock surface가 주 경로로 굳어지지 않는가
- 완료 주장 전에 증거가 있는가
- 다음 행동이 하나로 압축되어 있는가

Flow Keeper의 상세 운영 기준은 `docs/02-workflow/GPAO-T-PROGRAM-CONTROL-AND-WORK-SEQUENCE-v0.1-ko.md`에 둔다.

As of 2026-07-11, Flow Keeper also uses the three-track process guard:

```text
docs/02-workflow/GPAO-T-THREE-TRACK-PROCESS-GUARD-v0.1-ko.md
```

The three standing tracks are:

- `Core Kernel`: Context Mesh, Memory Wiki, T-cell admission, replay, approval/audit, reversible apply/rollback, self-growth, task packet.
- `Operating Surface`: GPAO-T-owned dashboard, multi-session/work panes, chat UX, inspector, visible memory/replay/apply/rollback state, desktop/mobile QA, and compatibility/migration state only when needed.
- `Runtime & Productization`: model/tool routing, CLI/MCP/local execution, Gateway/service lifecycle, install/update/rollback, doctor, packaging, long-run verification.

Flow Keeper must classify every non-trivial GPAO-T work unit into one of these tracks before implementation. If the work is cross-track, it must name the primary track and explain why the cross-track connection is needed now.

## 4. nbeai GitHub 참조 규칙

윤이 이미 끝낸 프로젝트들은 GitHub `nbeai` 계정에 올라가 있다.

GPAO-T 작업에서 과거 완료 프로젝트, release, package, plugin, adapter, harness, Knowledge Loop, 제3자 OpenClaw 호환성 관련 근거가 필요하면 nbeai GitHub를 중요한 외부 source-of-truth로 참고한다.

단, GitHub에 있다는 이유만으로 현재 GPAO-T의 active target이 되지는 않는다.

참조 순서:

```text
현재 사용자 요청
-> 현재 로컬 workspace / live state
-> Context Mesh / master plan
-> nbeai GitHub 완료 프로젝트
-> 외부 오픈소스 / 논문 / 커뮤니티
```

GitHub 참조는 다음 목적에 쓴다.

- 완료된 구현 확인
- release/package 구조 확인
- 이전 결정과 현재 결정의 drift 확인
- 재사용 가능한 코드/문서/테스트 패턴 확인
- GPAO-T와 GPAO for Codex의 경계 확인

GitHub 참조를 잘못 쓰는 경우:

- 과거 완료 프로젝트를 현재 요청보다 우선하는 것
- GPAO-T를 GPAO for Codex나 BEAI Harness로 다시 축소하는 것
- 제3자 OpenClaw 호환성/마이그레이션 작업을 OpenClaw 개선 프로젝트로 오해하는 것
- public release 상태와 local/live verification state를 섞는 것

## 5. 현재 Codex GPAO 플러그인 규칙

현재 Codex에는 윤이 만든 GPAO가 플러그인되어 있다.

이 사실은 다음을 의미한다.

- Codex는 GPAO의 개발 철학과 운영 규칙을 작업에 적용해야 한다.
- Context Mesh, Knowledge Loop, T-cell, GPAO Core Engine, replay, growth governance를 사용할 수 있는 내부 개발 surface가 이미 있다.
- GPAO-T 개발은 이 Codex-side GPAO 경험을 참고해야 한다.

하지만 이것은 다음을 의미하지 않는다.

- 현재 Codex 플러그인이 곧 GPAO-T 완성품이라는 뜻은 아니다.
- Codex-side GPAO가 제3자 OpenClaw 호환성 live 경로를 자동으로 고쳤다는 뜻은 아니다.
- 플러그인 설치 사실만으로 live behavior proof가 생기는 것은 아니다.

## 6. 제3자 OpenClaw 호환성/마이그레이션 작업의 목적 경계

제3자 OpenClaw 호환성 live 변경은 OpenClaw 개선이 목적이 아니다.

목적은 비교로 확인한 로컬 PC 운영 원리를 GPAO-T 소유 런타임으로 재설계하고, 기존 호환성 코드를 안전하게 이행하는 것이다.

따라서 모든 제3자 OpenClaw 호환성/마이그레이션 작업은 다음 질문을 통과해야 한다.

```text
이 변경은 GPAO-T의 OS 완성도를 높이는가?
이 변경은 GPAO-T의 기억, 맥락, 권한, 성장, 사용자 체감을 증명하는가?
이 변경이 제3자 OpenClaw 자체 최적화로 좁아지고 있지는 않은가?
```

대답이 불명확하면 Codex는 먼저 설계/리서치/검증 문서로 되돌아가야 한다.

## 7. 멀티 에이전트 사용 승인 경계

Codex는 다음 멀티 에이전트 작업을 별도 승인 없이 제안하고 준비할 수 있다.

- 역할 설계
- 읽기 전용 리서치
- 로컬 문서/코드 분석
- 테스트 계획 작성
- 리뷰 메모 작성
- patch proposal 작성

다음은 사용자 승인 경계다.

- live third-party OpenClaw compatibility runtime mutation
- Gateway restart
- service kill/restart
- external send
- connector write
- durable memory promotion
- GitHub push / public release
- account/secret/payment/destructive action

## 8. 완료 조건

멀티 에이전트 작업이 완료됐다고 말하려면 다음이 있어야 한다.

- 각 에이전트 역할과 산출물이 명확함
- source/evidence가 남아 있음
- 충돌 또는 불확실성이 표시됨
- Synthesis Lead가 GPAO-T 목적에 맞게 종합함
- 다음 안전 행동이 하나로 정리됨

멀티 에이전트 결과는 윤에게 부담을 주면 안 된다.

최종 보고는 다음 네 줄로 압축될 수 있어야 한다.

```text
무엇을 확인했는가
어떤 결론인가
무엇이 아직 위험한가
다음에 무엇을 할 것인가
```
