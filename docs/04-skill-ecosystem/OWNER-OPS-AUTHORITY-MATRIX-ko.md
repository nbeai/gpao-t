# Owner Ops Authority Matrix

Status: v0.1 local baseline  
Scope: Skill pack first, MCP/connectors later, plugin/market last

## 자동화 사다리

| 단계 | 사용자 언어 | v0.1 상태 | 의미 |
| --- | --- | --- | --- |
| level_1_read_only | 보기만 함 | 허용 | 붙여넣기/파일 내용을 읽고 놓친 부분을 정리한다. |
| level_2_summarize | 요약함 | 허용 | 리뷰/문의/예약 메시지를 분류하고 요약한다. |
| level_3_draft | 초안 만듦 | 허용 | 사장님이 확인하고 쓸 수 있는 답변 초안을 만든다. |
| level_4_approval_execute | 승인 후 실행 | 차단 | 외부 저장/전송은 이후 별도 승인 게이트에서 연다. |
| level_5_limited_auto | 조건부 자동 실행 | 차단 | 반복 자동 실행은 정책/권한/롤백 검증 전까지 잠근다. |

## 지금 허용

- local parsing
- local summary
- local draft
- local JSONL record
- local replay summary

## 나중에 검토

- connector credential setup
- read-only external account access
- saving draft to external workspace

## v0.1 차단

- external send
- customer message send
- review posting
- payment
- refund
- deletion
- bulk messaging
- legal/tax final advice
- durable memory promotion
- live skill mutation

