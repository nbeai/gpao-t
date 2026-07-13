# Owner Ops First Owner Scenario v0.1

## 목적

Owner Ops는 기능 목록이 아니라 한국 자영업자가 실제로 이해하고 쓸 수 있는 자동화 흐름이어야 한다.

첫 기준 시나리오는 다음 하나로 고정한다.

```text
스마트스토어 사장님이 문의 CSV를 붙여넣는다.
GPAO-T가 배송/교환/재입고 문의를 분류한다.
고객 전송 전 답변 초안을 만든다.
사장님 확인 후 로컬 기록만 남긴다.
replay로 이번 기록과 다음 자동화 후보를 확인한다.
MCP host smoke로 Codex/OpenClaw/Claude Code 공통 호출 가능성을 확인한다.
```

## 시나리오

| 항목 | 값 |
| --- | --- |
| id | `smartstore_inquiry_csv_to_local_draft` |
| 업종 | 스마트스토어 / 쇼핑몰 |
| workflow | `shopping_inquiry` |
| 입력 | CSV/TSV 또는 붙여넣기 |
| 출력 | 문의 분류, 답변 초안, 확인 필요 항목, 로컬 기록, replay |
| 권한 | 로컬 미리보기와 로컬 JSONL 기록만 허용 |

예시 입력:

```csv
문의,상태
배송 언제 출발하나요?,신규
사이즈가 안 맞으면 교환 가능한가요?,신규
블랙 색상 재입고 언제 되나요?,신규
```

## 검증 표면

CLI:

```bash
node bin/gpao-t.js owner-ops first-owner-scenario
node bin/gpao-t.js owner-ops run-first-owner-scenario
node bin/gpao-t.js owner-ops first-owner-scenario-check
```

Gateway:

```text
GET  /owner-ops/first-owner-scenario
POST /owner-ops/first-owner-scenario/run
GET  /owner-ops/first-owner-scenario/verify
```

MCP smoke:

```text
initialize
tools/list
tools/call owner_ops.intake_preview
tools/call owner_ops.local_record_write without confirmLocalRecord -> rejected
```

## 차단 경계

이 시나리오는 다음 행동을 열지 않는다.

- 고객 메시지 발송
- 리뷰 게시
- 외부 네트워크 호출
- OAuth / token / credential 저장
- 환불, 주문 취소, 결제
- 대량 메시지
- 백그라운드 자동화
- durable memory promotion

## 완료 기준

다음이 모두 통과해야 Owner Ops를 플러그인/마켓 패키징 단계로 넘길 수 있다.

```text
fixture ready
local intake ready
shopping inquiry candidate selected
workflow preview ready
external_send locked
local record written_local_only
replay ready
MCP host smoke ready
unconfirmed MCP local write rejected
CLI/Gateway verification ready
```
