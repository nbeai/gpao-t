# Owner Ops First Owner Beta Guide v0.1

## 목적

이 문서는 `사장님 자동화 도우미`를 실제 한국 자영업자에게 처음 보여주기 전의 beta 안내서다.

팀원 alpha와 호스트 등록 smoke를 통과한 뒤에만 사용한다. 공개 배포, 외부 계정 연결, 고객 자동 발송은 아직 열지 않는다.

## 첫 Beta 원칙

```text
샘플 또는 비식별 자료만 사용한다.
초안은 사장님 확인용이다.
고객에게 자동 전송하지 않는다.
결제, 환불, 삭제, 주문 취소는 자동으로 하지 않는다.
피드백은 제품 문구, 업종 템플릿, 첫 시나리오에 반영한다.
```

## 사장님에게 보여줄 첫 문장

```text
오늘 밀린 문의를 붙여넣어 보세요.
고객에게 바로 보내지 않습니다.
먼저 분류하고, 답변 초안을 만들고, 확인용 기록만 남깁니다.
초안이 마음에 들면 사장님이 직접 복사해서 고쳐 쓰면 됩니다.
```

## 샘플 데이터

스마트스토어 문의 CSV:

```csv
문의,상태
배송 언제 출발하나요?,신규
사이즈가 안 맞으면 교환 가능한가요?,신규
오늘 주문하면 금요일 전에 받을 수 있나요?,신규
```

리뷰 답변 텍스트:

```text
음식은 맛있었는데 대기 시간이 길었어요.
친절했지만 포장이 조금 아쉬웠어요.
다음에도 주문하고 싶어요.
```

예약 문의 텍스트:

```text
이번 주 토요일 오후 3시에 네일 예약 가능한가요?
가격과 소요 시간도 궁금합니다.
```

## 진행 순서

1. 샘플 CSV 또는 비식별 문의를 붙여넣는다.
2. 문의 유형 분류와 답변 초안을 확인한다.
3. 환불/취소/외부 전송이 잠겨 있는지 확인한다.
4. 마음에 드는 초안과 마음에 들지 않는 초안을 표시한다.
5. 로컬 기록과 replay가 남는지 확인한다.

## 중단 조건

- 실제 고객 개인정보를 넣으려 한다.
- 고객 자동 발송이나 리뷰 자동 게시를 요구한다.
- 환불, 주문 취소, 결제 처리 자동화를 요구한다.
- 사장님이 초안과 실제 전송의 차이를 이해하지 못한다.

## CLI 확인 명령

```bash
node bin/gpao-t.js owner-ops sample-data-kit
node bin/gpao-t.js owner-ops first-owner-beta-guide
node bin/gpao-t.js owner-ops first-owner-beta-check
```

Gateway:

```text
GET /owner-ops/sample-data-kit
GET /owner-ops/first-owner-beta-guide
GET /owner-ops/first-owner-beta/verify
```

## 합격 신호

- 사장님이 무엇을 붙여넣어야 하는지 바로 이해한다.
- 초안 중 하나 이상을 실제 업무에 고쳐 쓸 수 있다고 말한다.
- 자동 전송이 되지 않는다는 점을 명확히 이해한다.
- 다음으로 본인 업종 템플릿이 필요하다는 구체적 요구가 나온다.

## 다음 단계

첫 사장님 beta 피드백을 업종별 템플릿 후보와 owner-facing UX copy에 반영한다. 기준을 넘기면 [OWNER-OPS-MARKET-READINESS-GATE-v0.1-ko.md](/Users/jyp/Documents/Playground%202/gpao-t/docs/04-skill-ecosystem/OWNER-OPS-MARKET-READINESS-GATE-v0.1-ko.md)에 따라 반복 beta와 업종별 template pack으로 확장한다.
