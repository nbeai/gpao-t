# GPAO-T Competitive Research v0.1

Status: first research map  
Date: 2026-07-10  
Scope: 자가성장형 퍼스널 AI OS / 로컬 AI 에이전트 / 메모리 OS / AI-native OS 시도 조사

## 1. 요약

GPAO-T와 유사한 시도는 이미 여러 갈래에서 존재한다.

하지만 아직 하나의 완성된 형태로 수렴되지는 않았다.

현재 공개 사례들은 다음 여섯 계열로 나뉜다.

1. 로컬 PC 에이전트 / 컴퓨터 조작형 AI
2. AI second brain / 개인 지식 비서
3. Memory OS / stateful agent memory
4. 자가개선 / 스킬 축적형 에이전트
5. 멀티에이전트 작업 운영체계
6. Agent OS / AI-native OS 연구

GPAO-T의 기회는 이 조각들을 단순히 합치는 것이 아니다. 기회는 OpenClaw류 로컬 실행 능력 위에 기억, 맥락, 권한, 리플레이, 자가성장을 일반 사용자도 이해할 수 있는 운영체계로 묶는 데 있다.

## 2. 대표 사례

| 사례 | 성격 | GPAO-T에 주는 힌트 | 남은 빈자리 |
| --- | --- | --- | --- |
| [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | 자율 에이전트 / Agent Protocol 계열 | 목표 기반 자동 실행과 에이전트 프로토콜 | 개인 OS라기보다 자율 에이전트 플랫폼 |
| [OpenInterpreter](https://github.com/openinterpreter/openinterpreter) | 로컬 컴퓨터 조작형 에이전트 | 사용자의 PC에서 실제 작업 실행 | 기억, 권한, 성장 OS는 별도 과제 |
| [Khoj](https://github.com/khoj-ai/khoj) | self-hostable AI second brain | 개인 지식, 자동화, 로컬/온라인 LLM 연결 | 운영체제보다는 지식 비서 |
| [Letta](https://github.com/letta-ai/letta) | MemGPT 계열 stateful agent platform | 장기 기억과 상태 유지 | 일반 사용자 OS UX와 권한 거버넌스는 별도 |
| [MemoryOS](https://github.com/BAI-LAB/MemoryOS) | 개인화 AI 에이전트를 위한 메모리 운영체계 | 단기/중기/장기 기억 구조 | 메모리 중심, 전체 OS는 아님 |
| [OpenHands](https://github.com/OpenHands/OpenHands) | 개발 작업 자동화 에이전트 | 작업 실행, 개발 자동화 | 개발자 중심 |
| [ChatDev](https://github.com/OpenBMB/ChatDev) | 가상 소프트웨어 회사형 멀티에이전트 | 역할 기반 협업, 경험 개선 | 개인 OS보다는 제작 시뮬레이션 |
| [MetaGPT](https://github.com/FoundationAgents/MetaGPT) | 멀티에이전트 소프트웨어 조직 | PM/엔지니어/리뷰어 역할 분리 | 일반 사용자 생활/업무 OS와는 거리 |
| [CrewAI](https://github.com/crewAIInc/crewAI) | 역할 기반 에이전트 오케스트레이션 | 작업자 역할 구조 | 프레임워크 성격 |
| [LangGraph](https://github.com/langchain-ai/langgraph) | 상태 기반 에이전트 그래프 | 루프, 상태, 승인 흐름 설계 참고 | 제품이 아니라 개발 프레임워크 |

## 3. 연구 흐름에서 중요한 키워드

### 3.1 MemGPT / Letta

MemGPT 계열은 LLM의 제한된 컨텍스트를 운영체제식 메모리 관리 문제로 본다.

GPAO-T에 중요한 점:

- 기억을 단순 검색 결과가 아니라 상태 관리 문제로 본다.
- 장기 대화와 다중 세션을 다룬다.
- agent state를 제품의 핵심으로 본다.

GPAO-T가 더 가져가야 할 점:

- 기억 admission
- 현재 요청 우선권
- 권한 경계
- 자가성장 적용 전 replay
- 일반 사용자에게 보이는 설명 가능성

### 3.2 MemoryOS

MemoryOS는 개인화 AI 에이전트를 위한 메모리 운영체계를 제안한다.

GPAO-T에 중요한 점:

- short-term / mid-term / long-term memory 계층
- storage / updating / retrieval / generation 흐름
- 개인화 성능 개선을 메모리 구조와 연결

GPAO-T의 차별화 지점:

- 메모리 저장보다 operating principle 추출이 중요하다.
- T-cell은 memory fragment가 아니라 작동 원리 단위다.
- 성장 후보는 replay와 승인 없이 live behavior가 되면 안 된다.

### 3.3 OS-Copilot / FRIDAY

OS-Copilot 계열은 컴퓨터를 쓰는 일반 에이전트가 경험을 통해 스킬을 축적하는 방향이다.

GPAO-T에 중요한 점:

- 브라우저, 파일, 터미널, 앱을 다루는 일반 컴퓨터 작업
- 경험 기반 skill accumulation
- 이전 실패와 성공을 다음 작업에 반영

GPAO-T가 더 가져가야 할 점:

- skill accumulation을 숨은 자기수정으로 만들지 않기
- 사용자 승인 경계
- rollback 가능한 성장 적용
- 한국어 사용자 체감과 불안 감소

### 3.4 OpenJarvis / AgentOS / AOHP

이 계열은 기존 앱 중심 OS에서 에이전트 중심 OS로 넘어가는 관점을 제안한다.

GPAO-T에 중요한 점:

- 앱은 사람만 직접 여는 대상이 아니라 agent가 조합하는 skill/module이 될 수 있다.
- OS의 중심은 파일/앱 실행만이 아니라 intent, memory, tool, learning의 조합이 될 수 있다.
- local-cloud collaboration, on-device inference, OS-level security가 중요해진다.

GPAO-T가 더 가져가야 할 점:

- 로컬 PC의 실제 사용자 경험
- non-developer first
- 실행 전 이해 가능한 승인
- OpenClaw substrate 흡수
- T-cell/GPAO Core 기반의 성장 판단

## 4. 커뮤니티와 보안에서 보이는 반복 문제

OpenClaw류 로컬 에이전트와 자동화 에이전트에서 반복되는 문제는 다음이다.

- 설치와 설정이 일반 사용자에게 어렵다.
- 모델, 권한, 파일 접근, 브라우저 접근이 한꺼번에 얽힌다.
- 프롬프트 인젝션과 악성 스킬 위험이 있다.
- AI가 무엇을 기억했고 왜 그렇게 행동했는지 알기 어렵다.
- 자동화가 편리해질수록 승인 경계가 흐려진다.
- 개발자에게는 흥미롭지만 일반 사용자에게는 불안하고 피곤할 수 있다.

이 문제들은 GPAO-T의 약점이 아니라 존재 이유다.

GPAO-T는 더 강한 자동 실행 도구가 아니라, 사람이 안심하고 오래 쓸 수 있는 AI-native 개인 운영체계가 되어야 한다.

## 5. GPAO-T가 흡수할 것과 거절할 것

흡수할 것:

- OpenClaw / OpenInterpreter 계열의 로컬 실행 능력
- Khoj / PROJECTMEM 계열의 개인 지식과 local-first memory
- Letta / MemoryOS 계열의 stateful memory 구조
- OS-Copilot / OpenJarvis 계열의 skill accumulation
- AutoGPT / CrewAI / LangGraph 계열의 agent workflow
- AgentOS / AOHP 계열의 AI-native OS 관점

거절할 것:

- 숨은 durable memory promotion
- 사용자가 모르는 live self-mutation
- 도구 실행과 답변 생성을 섞는 구조
- 권한 경계 없는 connector write
- 프롬프트만으로 해결했다는 주장
- replay 없는 자기개선 주장
- 일반 사용자가 이해할 수 없는 개발자 전용 UX

## 6. GPAO-T 포지션

GPAO-T는 경쟁 제품을 단순 복제하지 않는다.

공식 포지션:

> GPAO-T는 OpenClaw 같은 로컬 실행 능력 위에, T-cell 이론과 GPAO Core Engine을 얹어, 기억 / 맥락 / 권한 / 자가성장을 안전하게 운영하는 퍼스널 AI OS다.

핵심 차별점:

- 기억을 무조건 저장하지 않는다.
- 성장을 무조건 자동 적용하지 않는다.
- 실패를 성장 후보로 만든다.
- 성장 후보는 replay로 검증한다.
- 검증된 것만 승인 후 적용한다.
- 사용자는 개발자가 아니어도 흐름을 이해할 수 있다.
- AI가 더 똑똑해지는 만큼 더 투명하고 안정적이어야 한다.

## 7. 다음 리서치 큐

다음 리서치는 GitHub issues / discussions 중심으로 진행한다.

우선순위:

1. OpenClaw / OpenInterpreter 사용자가 겪는 설치, 권한, 보안, 속도, 기억 문제
2. Letta / MemoryOS 사용자가 기대하는 long-term memory UX
3. Khoj / PROJECTMEM류 local-first memory에서 반복되는 pain point
4. OS-Copilot / OpenJarvis류 self-improvement의 적용 조건과 실패 조건
5. AgentOS / AOHP류 OS-level agent security 논의

리서치 결과는 GPAO-T 기능 요구사항으로 바로 변환한다.

