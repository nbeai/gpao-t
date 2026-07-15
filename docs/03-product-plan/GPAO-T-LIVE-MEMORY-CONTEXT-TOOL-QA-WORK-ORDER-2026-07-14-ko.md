# GPAO-T 라이브 대화 메모리/맥락/도구 QA 작업 지시서

작성일: 2026-07-14
상태: active evidence-backed work order

## 목표

GPAO-T 대화창을 개발자 화면이 아니라 사용자 화면으로 유지하면서, 실제 대화 흐름에서 메모리, 맥락, 도구가 부족함 없이 작동하는지 검증하고 보강한다.

## 완료 기준

- 대화창 기본 화면에 `작업공간 요약`, 내부 workspace 파일 요약, raw evidence strip이 노출되지 않는다.
- 메모리 검색은 Memory Wiki, T-cell 후보, chat preflight/replay뿐 아니라 실제 라이브 세션 transcript까지 검색 재료로 사용한다.
- 메모리 검색은 OpenAI embedding quota 없이도 local hybrid search로 동작한다.
- 활성 P0 도구는 사용자 대화 경로에서 실제 호출 가능해야 한다.
- 도구 오류가 있으면 영어 내부 문구로 노출하지 않고, 사용자 화면에서는 한국어 상태로 정리한다.
- 쓰기, 외부 전송, 자동 실행, 장기 기억 승격은 승인 경계 안에서만 열린다.

## Lane 1. 사용자 화면 정리

범위:
- 채팅 화면
- 세션 rail
- Activity 표시
- 설정/정보로 이동 가능한 사용자 표면

작업:
- `작업공간 요약` 및 `gpao-workspace-user-summary` 제거
- `이번 답변의 작동 근거` 입력창 상단 strip 제거 유지
- `Tool error`, `Web Fetch`, `Web Search` 같은 내부/영문 Activity 문구를 사용자용 한국어 문구로 정규화
- Safari/Playwright 화면에서 금지 문구 0건 확인

증거:
- `test/live-user-screen-ux-patch.test.js`
- 라이브 대시보드 Playwright find: `작업공간 요약` 0건, `Tool error` 0건

## Lane 2. 메모리/맥락 사용자 QA

범위:
- `~/.gpao-t/memory`
- `~/.gpao-t/chat`
- `~/.gpao-t/agents/main/sessions`
- `~/.gpao-t/workspace`
- `~/.gpao-t/events`

작업:
- 실제 세션 JSONL transcript를 bounded tail read로 색인한다.
- 내부 thinking/암호화 replay는 색인하지 않고, 사용자 발화/응답 텍스트/도구 호출 요약만 색인한다.
- 세션 transcript source는 `agent_session_transcript`로 분리한다.
- 디렉터리를 sparse/offloaded file로 오진하지 않는다.
- 최근 여러 세션 테스트를 사람이 묻듯 질의해, 기억 복원 품질을 확인한다.

현재 증거:
- 라이브 인덱스 문서 수: 478
- `agent_session_transcript`: 9개
- live source status: ready
- targeted tests: memory search/context heart/LLM-ready packet 10개 통과

남은 고도화:
- 세션 transcript를 단순 검색 후보에서 T-cell admission 후보로 더 정교하게 연결
- “전체 전문은 못 읽었다” 사용자 문구를 더 정확한 범위 설명으로 개선
- 오래된 후보와 최근 실제 세션 사이의 점수 균형 재조정

## Lane 3. 활성 도구 QA

P0 기본 도구:
- web_search
- web_readability / web_fetch
- memory_search
- chat_session
- runtime_status

P1 도구:
- browser_control
- file_read_write
- document_extract
- launch_agent
- secret_refs
- codex_runtime_route
- plugin_registry

P2:
- semantic_memory

검증 방식:
- 사용자가 대화창에 자연어로 요청한다.
- Activity에 도구 호출이 표시되는지 본다.
- 최종 답변이 실제 도구 결과에 근거하는지 본다.
- 오류가 나면 기능 실패인지, 일부 fetch 실패인지, 표시 품질 문제인지 분류한다.

현재 감사 결과:
- P0 ready: 5
- P1 ready: 4
- P1 review: launch_agent, secret_refs, codex_runtime_route
- P2 review: semantic_memory

남은 보강:
- `openclaw status --all`이 legacy `~/.openclaw`를 보는 문제와 GPAO-T Doctor 명령을 사용자 기준으로 분리
- launch agent 설치/자동 실행 경계 정리
- plaintext secret warning을 SecretRefs lane에서 닫기
- Codex route warning을 실제 사용 경로와 맞게 정리

## 금지

- 도구가 목록에 있다는 이유만으로 완료라고 말하지 않는다.
- health 200만으로 사용자 경험이 정상이라고 말하지 않는다.
- 화면 검증 없이 “제거됨”이라고 말하지 않는다.
- 외부 전송, Notion 쓰기, 파일 쓰기, 자동 실행, 장기 기억 승격을 사용자 승인 없이 실제 수행하지 않는다.

## 이번 패스 결과

- 사용자 화면: `작업공간 요약` 제거 완료.
- 사용자 화면: `Tool error` 영어 노출 정규화 스크립트 추가.
- 메모리: 실제 라이브 세션 transcript 색인 추가.
- 메모리: 디렉터리 상태 오진 수정.
- 라이브 인덱스: 재생성 완료.
- 활성 도구: P0 도구 감사 ready, 사용자 웹검색/메모리 질의 경로 확인.

