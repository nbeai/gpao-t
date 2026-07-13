# Owner Ops MCP / Connector Plan v0.1

## 목적

Owner Ops Pack은 먼저 스킬팩과 no-API 로컬 workflow로 검증한다. 그 다음에 Codex, OpenClaw, Claude Code가 공통으로 호출할 수 있는 MCP/CLI 표면으로 확장한다.

핵심 원칙은 단순하다.

```text
스킬팩으로 업무 흐름을 검증한다.
MCP로 공통 호출 표면을 만든다.
커넥터는 읽기 전용부터 연다.
외부 전송/쓰기/결제/삭제는 승인, 감사, 롤백 전까지 열지 않는다.
```

## 호환 대상

| 대상 | 1차 연결 방식 | 의도 |
| --- | --- | --- |
| Codex | stdio MCP / local CLI | 로컬 작업 맥락과 함께 Owner Ops preview/replay 호출 |
| OpenClaw | stdio MCP / gateway wrapper / local CLI | OpenClaw skills/gateway 구조에서 Owner Ops를 leaf capability로 래핑 |
| Claude Code | stdio MCP / local CLI | 같은 tool manifest로 workflow preview와 replay 호출 |

## MCP 도구 표면

| Tool | 권한 | 설명 |
| --- | --- | --- |
| `owner_ops.skill_pack` | read-only | Owner Ops Pack 구조와 권한 경계 반환 |
| `owner_ops.candidates` | read-only | 사업자 언어에서 자동화 후보 제안 |
| `owner_ops.workflow_preview` | read-only | 리뷰/쇼핑몰/예약 문의 로컬 초안 미리보기 |
| `owner_ops.intake_preview` | read-only | 붙여넣기, CSV/TSV, 로컬 파일, 로컬 폴더를 workflow preview로 연결 |
| `owner_ops.local_record_write` | local-write, approval required | 사용자 확인 후 로컬 JSONL 기록만 저장 |
| `owner_ops.replay` | read-only | 로컬 기록 기반 효과 요약과 다음 후보 생성 |

## Stdio MCP Wrapper v0.1

Owner Ops는 no-network stdio MCP wrapper를 제공한다.

```bash
node bin/gpao-t-owner-ops-mcp.js
```

패키지 bin 이름:

```bash
gpao-t-owner-ops-mcp
```

지원 JSON-RPC method:

| Method | 상태 | 설명 |
| --- | --- | --- |
| `initialize` | allowed | 서버 정보와 tool capability 반환 |
| `tools/list` | allowed | Owner Ops MCP tool 목록 반환 |
| `tools/call` | allowed with boundary | read-only tool 호출 또는 확인된 local JSONL record write |

차단 method:

- `resources/write`
- `prompts/mutate`
- `sampling/createMessage`
- `external/send`

`owner_ops.local_record_write`는 MCP tool이지만 `confirmLocalRecord: true`가 없으면 거부된다. 이 도구도 외부 전송이 아니라 로컬 JSONL 기록만 남긴다.

## Read-Only Intake Connector v0.1

지원되는 intake:

| Intake | 상태 | 설명 |
| --- | --- | --- |
| `paste_intake` | ready | 사용자가 복사한 리뷰/문의/예약 문장을 붙여넣어 workflow preview 생성 |
| `local_csv_tsv_file` | ready | 로컬 CSV/TSV 파일을 읽어 table preview와 workflow preview 생성 |
| `local_excel_metadata` | metadata-only | Excel binary는 내용 파싱 없이 파일 존재/크기만 확인 |
| `local_folder_preview` | ready | 폴더 내 후보 파일 목록과 추천 workflow만 미리보기 |

명령:

```bash
node bin/gpao-t.js owner-ops intake-plan
node bin/gpao-t.js owner-ops intake-paste review_reply "음식은 맛있었는데 대기 시간이 길었어요"
node bin/gpao-t.js owner-ops intake-table shopping_inquiry smartstore.csv "문의,상태
배송 언제 되나요?,신규"
node bin/gpao-t.js owner-ops intake-file ./smartstore.csv shopping_inquiry
node bin/gpao-t.js owner-ops intake-folder ./owner-data
node bin/gpao-t.js owner-ops intake-check
```

MCP:

- `owner_ops.intake_preview`

이 도구는 `paste`, `table_text`, `local_file`, `local_folder` intakeType을 받는다. 모든 경로는 read-only preview이며, 원본 파일 overwrite/delete/move, background watch, external upload, customer send는 열지 않는다.

## 커넥터 시작 순서

1. `local_csv_excel`
   - CSV/TSV export를 읽어 리뷰, 문의, 예약 내역을 분류한다.
   - `.xlsx` / `.xls`는 v0.1에서 metadata-only로 표시하고, CSV/TSV export를 권장한다.
2. `local_folder_watch_preview`
   - 실제 background watch가 아니라 폴더 미리보기와 읽기 후보만 제공한다.
3. `browser_copy_paste_intake`
   - 외부 계정 연결 없이 복사/붙여넣기 기반 intake를 제공한다.
4. `future_read_only_account_connector`
   - 충분한 승인/보안 설계 뒤 계정 자료 읽기 전용을 검토한다.

## 차단 경계

v0.1에서는 다음을 열지 않는다.

- OAuth / token / credential 저장
- API read/write
- 고객 메시지 자동 발송
- 리뷰 자동 게시
- 결제, 환불, 삭제, 예약 확정
- 백그라운드 반복 자동화
- durable memory promotion

## 검증 명령

```bash
node bin/gpao-t.js owner-ops mcp-plan
node bin/gpao-t.js owner-ops connector-catalog
node bin/gpao-t.js owner-ops mcp-tools
node bin/gpao-t.js owner-ops mcp-check
node bin/gpao-t.js owner-ops mcp-server
node bin/gpao-t.js owner-ops mcp-server-check
node bin/gpao-t.js owner-ops intake-plan
node bin/gpao-t.js owner-ops intake-check
node bin/gpao-t-owner-ops-mcp.js
```

`mcp-check`가 `ready`인 경우에만 다음 단계인 no-network stdio MCP wrapper scaffold로 넘어간다.
`mcp-server-check`가 `ready`인 경우에만 테스트 host에 로컬 MCP 서버로 등록한다. 외부 계정 연결, OAuth, 고객 발송, 리뷰 게시, 결제/환불/삭제는 여전히 별도 단계다.

## First Owner Scenario Smoke v0.1

MCP/connector 표면은 실제 사용자 시나리오 하나를 통과해야 다음 패키징 단계로 넘어간다.

기준 문서:

```text
docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-SCENARIO-ko.md
```

명령:

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

이 smoke는 `owner_ops.intake_preview`를 MCP host 경로로 호출하고, `confirmLocalRecord` 없는 `owner_ops.local_record_write`가 거부되는지 확인한다.

## Plugin / Market Package Surface v0.1

첫 시나리오 smoke가 통과하면 로컬 패키지 manifest와 마켓 listing draft를 만들 수 있다.

기준 문서:

```text
docs/04-skill-ecosystem/OWNER-OPS-PLUGIN-PACKAGE-v0.1-ko.md
```

명령:

```bash
node bin/gpao-t.js owner-ops plugin-package
node bin/gpao-t.js owner-ops market-listing
node bin/gpao-t.js owner-ops plugin-package-check
```

Gateway:

```text
GET /owner-ops/plugin-package
GET /owner-ops/market-listing
GET /owner-ops/plugin-package/verify
```

이 표면은 로컬 패키지 준비와 설명 초안만 만든다. 공개 마켓 게시, OAuth/API 계정 연결, 고객 발송, 리뷰 게시, 결제/환불/삭제, 백그라운드 자동화는 열지 않는다.
