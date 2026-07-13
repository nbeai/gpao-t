# Owner Ops Market Readiness Gate v0.1

## 목적

이 문서는 `사장님 자동화 도우미`를 공개 마켓에 올리기 전, beta 피드백과 업종별 템플릿 후보가 충분한지 확인하는 pre-market gate다.

이 단계는 public submission이 아니다. 실제 공개 게시, 외부 계정 연결, 고객 자동 발송, 결제/환불/삭제는 계속 닫혀 있다.

## 입력 사다리

```text
스킬팩
-> no-API workflow
-> stdio MCP / read-only connector
-> local plugin package
-> team alpha
-> first owner beta
-> beta feedback synthesis
-> industry template catalog
-> market readiness gate
```

## Beta Feedback Synthesis

기본 수집 항목:

- 테스트 호스트: Codex / OpenClaw / Claude Code
- 업종: 스마트스토어, 음식점/카페, 미용/예약 서비스 등
- 이해 쉬움
- 실무 쓸모
- 안심감
- 설정 어려움
- blocker tag
- 요청 템플릿

합격 기준:

```text
이해 쉬움 평균 4점 이상
실무 쓸모 평균 4점 이상
안심감 평균 4점 이상
설정 어려움 평균 2.5점 이하
치명 blocker 0개
```

## Industry Template Catalog

첫 public-facing template 후보는 업종별로 묶는다.

각 template에는 다음이 있어야 한다.

- 입력 힌트
- 출력 힌트
- 권한 경계
- replay 필요 항목

고객 자동 발송은 모든 template에서 잠겨 있어야 한다.

## CLI 확인 명령

```bash
node bin/gpao-t.js owner-ops beta-feedback-synthesis
node bin/gpao-t.js owner-ops industry-template-catalog
node bin/gpao-t.js owner-ops market-readiness-gate
node bin/gpao-t.js owner-ops market-readiness-check
```

Gateway:

```text
GET /owner-ops/beta-feedback-synthesis
GET /owner-ops/industry-template-catalog
GET /owner-ops/market-readiness-gate
GET /owner-ops/market-readiness/verify
```

## Public Submission Block

market readiness가 `ready`여도 public submission은 자동으로 열리지 않는다.

추가로 필요한 것:

- 사용자 명시 승인
- privacy copy review
- signed/package distribution evidence
- install/update/rollback evidence
- public marketplace authority
- 외부 계정/credential/security review

## 다음 단계

마켓 readiness가 통과하면, [OWNER-OPS-PRE-PUBLIC-PACKAGE-REVIEW-v0.1-ko.md](/Users/jyp/Documents/Playground%202/gpao-t/docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-PACKAGE-REVIEW-v0.1-ko.md)에 따라 상위 템플릿별 replay fixture와 privacy copy를 만든다. 공개 제출은 별도 승인 전까지 계속 차단한다.
