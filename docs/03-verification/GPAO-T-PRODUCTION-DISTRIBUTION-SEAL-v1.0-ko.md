# GPAO-T Production Distribution Seal v1.0

## 목적

GPAO-T 0.1.0 배포판이 현재 소스와 동일한 런타임에서 만들어졌고, 설치 후
사용자 경로까지 정상 작동하며, 제3자 호환 런타임의 업데이트나 제품 정체성에
종속되지 않음을 봉인한다.

## 고정 계약

- 제품: `nBeAI. GPAO-T`
- 버전: `0.1.0`
- 채널: `internal-production`
- 대상: `internal`
- 공개 배포: `false`
- 외부 배포 실행: `false`
- manifest: `gpao_t.distribution_manifest.v2`

## 생성

```bash
npm run package:production
```

기본 산출물:

```text
.gpao-t/releases/gpao-t-0.1.0/
.gpao-t/releases/gpao-t-0.1.0.zip
.gpao-t/releases/gpao-t-0.1.0.zip.sha256
```

## 독립 검증

```bash
node tools/verify-gpao-t-production-distribution.mjs \
  --archive .gpao-t/releases/gpao-t-0.1.0.zip
zip -T .gpao-t/releases/gpao-t-0.1.0.zip
npm run verify
npm run seal:final
```

검증기는 다음을 모두 거부해야 한다.

- prerelease 버전
- package, manifest, runtime identity 간 버전 불일치
- 현재 source build와 다른 runtime stage
- ZIP과 설치 디렉터리 manifest 불일치
- 외부로 탈출하는 symlink
- 호환 런타임의 백그라운드 업데이트 확인 또는 업데이트 실행
- GPAO-T 사용자 표면의 제3자 제품 정체성

## 사용자 경로

1. 설치 또는 현재 라이브 런타임 시작
2. `/health` 통과
3. 대시보드 전체 주요 메뉴 및 오류 상태 확인
4. 새 실제 채팅 응답
5. 기본 도구 실행과 결과 반영
6. 기억 검색, admission, replay, 성장 후보 경계 확인
7. 이전 대화 펼치기 확인
8. 실행 직후 로그 오류 확인

## 상태 언어

- `production_ready`: 모든 게이트 통과
- `blocked`: 필수 게이트 실패
- `standalone_rebuild_required`: 호환 런타임 격리가 아직 소스 빌드로 봉인되지 않음

`candidate`는 T-cell/기억 admission 수명주기에만 사용한다. 배포 성숙도에는
사용하지 않는다.
