# Owner Ops Team Alpha Guide v0.1

## 목적

Owner Ops 팀원 alpha는 공개 배포가 아니다.  
팀원이 로컬에서 `사장님 자동화 도우미`를 실행해 보고, 실제 한국 자영업자에게 필요한 흐름인지 확인하는 첫 내부 검수 단계다.

## 테스트 대상

- 패키지: `gpao-t-owner-ops`
- 이름: 사장님 자동화 도우미
- 첫 시나리오: 스마트스토어 문의 CSV -> 분류 -> 답변 초안 -> 로컬 기록 -> replay
- 연결 표면: CLI, Gateway, stdio MCP

## 시작 전 주의

- 실제 고객 개인정보, 전화번호, 계좌, 민감 주문 정보는 넣지 않는다.
- 실제 고객에게 전송하지 않는다.
- OAuth/API 계정 연결을 시도하지 않는다.
- 테스트 자료는 샘플 CSV나 비식별화된 붙여넣기 문장으로 시작한다.

## Alpha 확인 명령

```bash
node bin/gpao-t.js owner-ops plugin-package-check
node bin/gpao-t.js owner-ops first-owner-scenario-check
node bin/gpao-t.js owner-ops team-alpha-guide
node bin/gpao-t.js owner-ops owner-ux-copy
node bin/gpao-t.js owner-ops team-alpha-check
node bin/gpao-t.js owner-ops host-registration-guide
node bin/gpao-t.js owner-ops alpha-feedback-form
node bin/gpao-t.js owner-ops host-alpha-check
```

Gateway:

```text
GET /owner-ops/team-alpha-guide
GET /owner-ops/owner-ux-copy
GET /owner-ops/team-alpha/verify
GET /owner-ops/host-registration-guide
GET /owner-ops/alpha-feedback-form
GET /owner-ops/host-alpha/verify
```

## 팀원이 봐야 할 것

1. 사장님 입장에서 무엇을 넣어야 하는지 바로 이해되는가?
2. 초안이 실제 업무에서 복사해 고칠 만한가?
3. 자동 전송되지 않는다는 점이 충분히 명확한가?
4. 결과가 마음에 안 들 때 보류/수정해야 한다는 느낌이 드는가?
5. MCP로 연결했을 때 같은 도구처럼 느껴지는가?

## 사장님 화면 문구 기준

첫 화면:

```text
오늘 밀린 문의를 붙여넣어 보세요.
고객에게 바로 보내지 않습니다.
먼저 분류하고, 답변 초안을 만들고, 사장님 확인용 기록만 남깁니다.
```

안전 라벨:

```text
자동 전송 안 함
계정 연결 안 함
환불/취소 안 함
로컬 기록만
```

잠긴 행동 문구:

```text
고객에게 보내기는 아직 잠겨 있습니다.
외부 계정 연결은 아직 사용하지 않습니다.
결제, 환불, 삭제는 자동으로 하지 않습니다.
반복 자동 실행은 아직 켜지지 않습니다.
```

## 합격 신호

- 비개발자도 첫 시나리오 목적을 1분 안에 설명할 수 있다.
- 팀원이 고객 발송/환불/주문 취소가 잠겨 있음을 명확히 확인한다.
- 샘플 자료로 초안과 replay가 재현된다.
- OpenClaw/Codex/Claude Code 중 최소 한 호스트에서 stdio MCP 등록 전 smoke를 이해한다.

## 아직 열지 않는 것

- 공개 마켓 게시
- OAuth/API 계정 연결
- 고객 메시지 자동 발송
- 리뷰 자동 게시
- 결제, 환불, 삭제, 주문 취소
- 백그라운드 반복 자동화
- durable memory promotion

## 다음 단계

Alpha 피드백을 owner-facing UX copy와 first scenario fixture에 반영한다. 최소 2개 호스트에서 local stdio MCP smoke가 확인되면 first owner beta guide로 넘어간다.

상세 호스트 등록과 피드백 양식은 [OWNER-OPS-HOST-REGISTRATION-AND-FEEDBACK-v0.1-ko.md](/Users/jyp/Documents/Playground%202/gpao-t/docs/04-skill-ecosystem/OWNER-OPS-HOST-REGISTRATION-AND-FEEDBACK-v0.1-ko.md)를 따른다.
