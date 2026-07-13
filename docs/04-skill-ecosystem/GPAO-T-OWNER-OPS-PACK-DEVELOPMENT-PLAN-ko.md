# GPAO-T Owner Ops Pack Development Plan

Status: planning baseline v0.1  
Owner: 윤 (@aigis0927) / GPAO-T  
Date: 2026-07-11  
Scope: Korean owner-operator automation skill pack -> MCP/connectors -> plugin/market package

## 1. 제품 정의

`GPAO-T Owner Ops Pack`은 한국 자영업자와 1인/소규모 사업자가 반복 업무를 직접 자동화 도구로 설계하지 않아도, 자기 사업의 불편을 말하면 GPAO-T가 자동화 후보, 초안, 권한 경계, 기록, 개선 루프를 만들어주는 실전 운영 스킬팩이다.

한국어 제품명 후보:

- `사장님 자동화 도우미`
- `사장님 업무판`
- `한국 자영업 운영팩`

핵심 정의:

```text
사용자는 자동화를 만들지 않는다.
사용자는 자기 사업의 반복 문제를 말한다.
GPAO-T가 그것을 안전한 자동화 후보와 실행 전 초안으로 바꾼다.
```

## 2. 개발 원칙

### 2.1 스킬팩 먼저

첫 단계는 API 연결이나 외부 실행이 아니다. 먼저 스킬팩으로 다음을 구현한다.

- 반복 업무 문답
- 업종별 문제 분류
- 자동화 후보 생성
- 권한 단계 추천
- 붙여넣기/CSV/Excel/로컬 파일 기반 처리
- 요약/분류/답변 초안
- 로컬 기록
- 다음 자동화 후보 제안

### 2.2 MCP/커넥터는 두 번째

스킬팩이 실제 수요와 반복 업무 패턴을 증명한 뒤, MCP/커넥터를 붙인다.

우선순위:

```text
local file / paste / CSV / Excel
-> Google Sheets / Gmail / Calendar
-> Notion / Trello / local folders
-> Naver / Kakao / SmartStore official API where available
-> Baemin / Coupang Eats / Instagram only after policy and authority review
```

### 2.3 플러그인/마켓은 마지막

플러그인은 설치, UI, 권한, 로컬 기록, 커넥터 설정, 스킬팩 배포를 하나의 제품으로 묶는 단계다. 스킬팩/커넥터가 검증되기 전에는 마켓형 패키지로 성급히 승격하지 않는다.

## 3. 사용자 표면

Owner Ops의 첫 화면은 자동화 빌더가 아니라 `사장님 업무판`이어야 한다.

전면에 보여야 할 것:

```text
오늘 놓치면 안 되는 일
AI가 정리한 초안
사장님 확인 필요
반복 업무 찾기
자동화 만들기
자동화 효과 리포트
```

전면에 과도하게 보이면 안 되는 것:

- trigger/action schema
- connector raw config
- OAuth scope raw list
- record id
- replay raw state
- route score
- backend enum
- MCP method name

이 정보는 inspector / 운영 메뉴 / 개발자 보기로 접는다.

## 4. Phase Plan

### Phase 0. Research and Field Casebook

목표: 한국 자영업자의 반복 업무 유형을 제품 언어로 고정한다.

작업:

- 업종별 반복 업무 목록 수집
- 한국 플랫폼별 입력 채널 정리
- 위험한 자동화와 안전한 자동화 분리
- 실제 사용 문장 예시 수집
- 실패/오해/불신 포인트 정리

필수 산출물:

- `OWNER-OPS-FIELD-CASEBOOK-ko.md`
- `OWNER-OPS-AUTHORITY-MATRIX-ko.md`
- `OWNER-OPS-FIRST-SCENARIOS-ko.md`

대표 업종:

- 음식점 / 카페
- 미용실 / 네일 / 피부관리
- 학원 / 레슨 / 코칭
- 쇼핑몰 / 스마트스토어
- 병원 / 상담 / 예약 기반 서비스
- 공방 / 스튜디오 / 프리랜서

완료 기준:

```text
최소 6개 업종
각 업종별 반복 업무 5개 이상
각 업무별 안전 시작 단계 정의
각 업무별 금지/승인 필요 행동 정의
```

### Phase 1. Owner Ops Skill Pack v0.1

목표: 외부 API 없이 자영업자가 반복 업무를 말하면 자동화 후보와 초안을 만드는 스킬팩을 만든다.

스킬팩 ID:

```text
gpao-owner-ops-pack
```

필수 manifest 필드:

```text
id
category
title
targetUserProblem
tcellPrinciple
triggerSignals
inputTypes
outputArtifacts
researchProtocol
qualityGates
replayCases
authorityBoundary
growthSignals
supportedIndustries
automationLadder
```

핵심 기능:

1. 업종 선택
2. 반복 업무 문답
3. 자동화 후보 생성
4. 붙여넣기/CSV/Excel 입력
5. 요약/분류/초안 생성
6. 권한 경계 표시
7. 로컬 실행 기록 후보 생성
8. 다음 자동화 후보 제안

자동화 사다리:

```text
level_1_read_only: 보기만 함
level_2_summarize: 요약함
level_3_draft: 초안 만듦
level_4_approval_execute: 승인 후 실행
level_5_limited_auto: 조건부 자동 실행
```

v0.1 기본값:

```text
허용: level_1_read_only, level_2_summarize, level_3_draft
차단: level_4_approval_execute, level_5_limited_auto
```

완료 기준:

```text
사용자 불편 문장
-> 반복 업무 후보
-> 자동화 후보 3개
-> 권한 단계
-> 입력 방법
-> 산출물 초안
-> replay case
```

### Phase 2. No-API Workflows

목표: 외부 계정 연결 없이도 제품 가치를 증명한다.

지원 입력:

- 붙여넣기 텍스트
- CSV
- Excel
- 로컬 폴더
- 캡처 이미지 설명 입력
- Google Sheet export 파일

첫 workflow:

#### 음식점 리뷰 답변

입력:

```text
리뷰 텍스트 붙여넣기 또는 CSV
```

출력:

```text
부정 리뷰
긍정 리뷰
긴급 대응 리뷰
답변 초안
반복 개선 포인트
```

#### 쇼핑몰 문의 분류

입력:

```text
스마트스토어/쇼핑몰 문의 CSV 또는 붙여넣기
```

출력:

```text
배송 문의
교환/환불
재입고
상품 정보
답변 초안
긴급 처리 목록
```

#### 예약 문의 초안

입력:

```text
DM/문자/톡 문의 붙여넣기
```

출력:

```text
예약 가능성
필요한 추가 질문
응대 초안
확정 전 확인 사항
```

완료 기준:

```text
외부 계정 연결 없이 3개 대표 업무가 end-to-end로 작동
각 업무는 empty state, malformed input, long input, sensitive input을 처리
```

### Phase 3. Local Records and Effect Replay

목표: 사용자가 얻은 효과를 로컬 기록으로 남기고, 반복 개선 후보를 만든다.

기록 항목:

```text
automationCandidateId
industry
workflowType
inputSource
generatedDraftCount
reviewNeededCount
userEditedCount
acceptedCount
rejectedCount
commonCorrections
nextAutomationCandidates
authorityLevel
createdAt
```

효과 리포트:

```text
이번 주 줄어든 반복 업무
사장님 확인이 필요했던 일
자주 고친 표현
새로 자동화할 만한 일
위험해서 자동화하지 않은 일
```

완료 기준:

```text
local record write
local history read
weekly summary draft
growth signal candidate
rollback/reference note
```

### Phase 4. Read-Only MCP / Connector v0.1

목표: 검증된 workflow에 read-only 연결을 붙인다.

우선 커넥터:

```text
Google Sheets read
Gmail read/search
Calendar read
Notion read
local folder watch/read
```

한국 플랫폼은 별도 policy review 뒤 진행:

```text
Naver Place
Naver SmartStore
Kakao Channel
Baemin
Coupang Eats
Instagram
```

원칙:

- API 가능 여부를 먼저 확인한다.
- 공식 API가 없거나 약관 위험이 크면 자동 연결하지 않는다.
- 처음에는 export/import, 복사/붙여넣기, 파일 업로드를 대체 경로로 제공한다.
- credential read/write는 별도 approval gate 뒤에 둔다.

완료 기준:

```text
read-only connector route
credential boundary
sample import
failure/recovery state
audit record
no external write
```

### Phase 5. Approval-Based Action v0.1

목표: 안전한 workflow에 한해 승인 후 실행을 연다.

처음 열 수 있는 행동:

- 답변 초안 저장
- 메시지 복사본 생성
- 캘린더 초안 생성
- Notion/Sheet에 로컬 기록 추가

나중에 열 행동:

- 고객에게 답장 발송
- 리뷰 답변 게시
- 예약 변경
- 쿠폰 안내 발송

계속 잠글 행동:

- 결제
- 환불
- 삭제
- 대량 발송
- 법률/세무 확정 판단
- 외부 공개
- 개인정보 대량 처리

완료 기준:

```text
preview
-> confirmation
-> approval packet
-> action record
-> audit record
-> rollback/reference note
```

### Phase 6. Plugin / Market Package

목표: 검증된 스킬팩과 커넥터를 설치 가능한 제품 단위로 묶는다.

패키지 구성:

```text
Owner Ops Skill Pack
Owner Ops Templates
Owner Ops Local Records
Owner Ops Connector Contracts
Owner Ops UI Surface
Owner Ops Authority Matrix
Owner Ops Replay Cases
```

마켓 노출 문구:

```text
한국 자영업자를 위한 반복 업무 자동화 도우미.
리뷰, 문의, 예약, 쇼핑몰 응대, 매출 요약을 안전한 초안과 확인 중심으로 시작합니다.
```

출시 전 조건:

- 최소 3개 업종 scenario pass
- 최소 5개 workflow replay pass
- no-API mode pass
- read-only connector mode pass
- approval action mode 일부 pass
- 한국어 UX 검수
- privacy/security review
- install/update/rollback proof

## 5. Core Data Contracts

### Automation Candidate

```json
{
  "id": "owner_ops_review_reply_001",
  "industry": "restaurant",
  "problem": "리뷰 답변이 밀림",
  "workflowType": "review_reply",
  "inputSources": ["paste", "csv", "excel"],
  "outputs": ["review_summary", "reply_drafts", "improvement_points"],
  "authorityLevel": "draft_only",
  "blockedActions": ["auto_post", "external_send", "delete", "refund"],
  "qualityGates": ["tone_fit", "risk_check", "customer_privacy_check"],
  "replayCases": ["negative_review", "praise_review", "mixed_review"],
  "growthSignals": ["repeated_user_edits", "new_common_complaint"]
}
```

### Owner Ops Task Packet

```json
{
  "userProblem": "예약 문의가 자꾸 늦어요",
  "businessType": "beauty_salon",
  "workflowCandidate": "reservation_inquiry_reply",
  "inputSource": "paste",
  "contextNeeded": ["service_menu", "opening_hours", "booking_policy"],
  "skillRoute": ["gpao-owner-ops-pack", "gpao-korean-business-pack"],
  "authorityBoundary": "draft_only",
  "expectedOutput": ["inquiry_classification", "reply_draft", "missing_info_questions"],
  "recordPolicy": "local_only"
}
```

## 6. Quality Gates

필수 품질 기준:

- 자영업자 언어로 이해 가능해야 한다.
- 자동화 용어보다 사업 문제 언어가 먼저 나와야 한다.
- 외부 발송/삭제/결제/환불은 기본 잠금이어야 한다.
- 답변 초안은 고객에게 바로 보내기 전 사장 확인을 전제로 해야 한다.
- 개인정보와 민감정보는 요약/마스킹 경계를 가져야 한다.
- 모든 자동화 후보는 안전 시작 단계가 있어야 한다.
- 모든 workflow는 replay case가 있어야 한다.

실패 조건:

- 사용자가 trigger/action을 직접 설계해야 한다.
- API 연결 없이는 아무 가치가 없다.
- 자동 발송이 기본값이다.
- 기술 enum이 사용자 화면에 노출된다.
- 결과가 일반 챗봇 답변과 구분되지 않는다.
- 업종별 현실 문맥이 없다.

## 7. First Build Order

권장 첫 구현 순서:

```text
1. Owner Ops field casebook
2. gpao-owner-ops-pack registry entry
3. owner-ops route probe
4. automation candidate generator
5. no-api review reply workflow
6. no-api shopping inquiry workflow
7. no-api reservation inquiry workflow
8. local record schema
9. effect replay summary
10. owner ops UI surface draft
```

첫 성공 기준:

```text
음식점 사장이 리뷰를 붙여넣는다.
GPAO-T가 리뷰를 분류하고 답변 초안을 만든다.
위험한 자동 게시를 잠근다.
사장이 확인할 항목만 보여준다.
로컬 기록과 다음 개선 후보를 남긴다.
```

## 8. Authority Boundary

v0.1 기본 정책:

```text
Allowed:
- local parsing
- local summary
- local draft
- local record
- local replay summary

Review required:
- connector credential setup
- read-only external data access
- saving to external workspace

Blocked:
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
```

## 9. Relationship to GPAO-T

Owner Ops Pack은 GPAO-T 본체를 대체하지 않는다. GPAO-T의 스킬 생태계 위에 올라가는 도메인 작동 단위다.

연결 구조:

```text
GPAO-T Work Surface
-> Owner Ops Pack
-> Context Mesh / T-cell admission
-> Skill execution adapter
-> Local record / replay
-> Connector governance
-> Plugin package
```

Owner Ops Pack은 GPAO-T의 비개발자 시장성을 증명하는 첫 강한 도메인 proof surface가 될 수 있다.

