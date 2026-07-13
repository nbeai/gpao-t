# Owner Ops Product Axis Readiness Matrix v0.1

이 문서는 한국 자영업자용 Owner Ops 자동화 도구가 다음 순서의 제품 축으로 어디까지 준비됐는지 한 번에 확인하기 위한 로컬 증거 표면이다.

```text
Skill Pack
-> MCP / Connector
-> Plugin / Market Package
-> Team Alpha / First Owner Beta
-> Pre-Public Distribution
-> Release Authority Readback
```

## 목적

Owner Ops는 단일 기능이 아니라 자영업자용 자동화 제품 축이다. 따라서 개별 명령이 `ready`인지와 별개로, 전체 제품 흐름이 다음 조건을 만족하는지 확인해야 한다.

- 사업자 언어 기반 skill pack이 준비됐는가
- Codex / OpenClaw / Claude Code에서 쓸 수 있는 MCP/connector 표면이 준비됐는가
- plugin/market package와 listing draft가 준비됐는가
- 팀원 alpha, first-owner beta, field-test ledger, field-test action queue, field-test repair completion, broader owner testing handoff, broader owner testing result ledger, broader owner testing repair queue, broader owner testing repair completion, next owner testing loop, 결과 리뷰, 피드백 action queue가 준비됐는가
- pre-public evidence와 repair evidence가 준비됐는가
- public release prerequisite, final local release candidate decision packet, final candidate owner decision lane, final candidate next action packet은 빠르게 읽히지만, release/upload authority는 닫혀 있는가

## 명령

```bash
node bin/gpao-t.js owner-ops product-axis-readiness
node bin/gpao-t.js owner-ops product-axis-readiness-check
```

## Gateway

```text
GET /owner-ops/product-axis-readiness
GET /owner-ops/product-axis-readiness/verify
```

## 판정 원칙

`ready`는 로컬 제품 축 증거가 일관되게 준비됐다는 뜻이다. 다음을 의미하지 않는다.

- public release 완료
- marketplace publish 완료
- package upload 실행
- signing 실행
- credential access
- install / update / rollback 실행
- 외부 배포 실행

## 출력 핵심

- `goalSequence`: `skill_pack -> mcp_connectors -> plugin_market_package`
- `phases`: 각 제품 축의 상태와 근거
- `field_validation`: 팀원 alpha, first-owner beta, field-test ledger, field-test action queue, field-test repair completion, broader owner testing handoff, broader owner testing result ledger, broader owner testing repair queue, broader owner testing repair completion, next owner testing loop, 결과/피드백 루프 상태
- `releasePrerequisiteReadback`: public release prerequisite readback 상태
- `final local release candidate decision packet`: local package, release readback, next owner testing loop, authority gate, decision record를 묶은 owner 검토 표면
- `final candidate owner decision lane`: owner가 local-only 결정을 남길 수 있는 token-gated 표면
- `final candidate next action packet`: owner decision 값을 다음 local operating surface로 연결하는 read-only 안내 표면
- `decisionRecords`: human / marketplace decision record 수
- `authorityBoundary`: release, upload, signing, install/update/rollback 차단 상태
- `completionBoundary`: 로컬 제품 축 readiness와 실제 field/public completion의 분리

## 사용 시점

이 매트릭스는 개별 기능 테스트보다 상위의 제품축 판단에 사용한다. 특히 다음 상황에서 사용한다.

- Owner Ops가 최종 완성 가능한 제품 흐름으로 정렬됐는지 확인할 때
- 팀원 alpha 또는 first-owner beta handoff 전에 현재 축별 상태를 볼 때
- public release/upload를 열기 전에 prerequisite evidence와 authority boundary를 분리 확인할 때
