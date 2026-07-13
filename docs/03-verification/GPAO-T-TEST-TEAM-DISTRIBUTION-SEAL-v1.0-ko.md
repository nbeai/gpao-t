# GPAO-T Test-Team Distribution Seal v1.0

Status: local supervised distribution verification tool

## 목적

테스트팀 배포물은 현재 source build와 동일한 runtime stage에서만 생성한다. 생성기는 live OpenClaw, live Gateway, `~/.gpao-t`, 설치 경로를 변경하지 않는다.

## 봉인 계약

1. Source build의 실제 `npm pack --dry-run --json --ignore-scripts` 파일 집합과 그 파일에 대응하는 `dist/**/*.map` companion map 집합을 읽는다.
2. Source 파일마다 SHA-256을 계산하고 경로, 종류, 크기, 내용 해시를 묶은 tree hash를 만든다.
3. Runtime stage에서 `node_modules`만 dependency overlay로 제외하고 동일한 파일 집합과 tree hash를 계산한다.
4. 누락, 추가, 변경 파일 또는 tree hash 차이가 하나라도 있으면 output 삭제와 archive 생성을 시작하지 않는다.
5. Source의 `dist/.buildstamp`와 `dist/.runtime-postbuildstamp` 해시를 provenance에 기록한다.
6. 배포 디렉터리 manifest를 생성한 뒤 디스크에서 다시 읽어 모든 파일을 직접 대조한다.
7. ZIP archive와 `.sha256` sidecar를 생성한다.

Tree hash 알고리즘 ID는 `sha256-path-kind-size-content-v1`이다. mtime은 증거로 사용하지 않는다.

## 생성

기본 source build와 runtime stage를 사용할 때:

```bash
node tools/build-gpao-t-test-team-distribution.mjs \
  --output /tmp/gpao-t-0.1.0-test-team.1 \
  --archive /tmp/gpao-t-0.1.0-test-team.1.zip
```

명시적 경로를 사용할 때:

```bash
node tools/build-gpao-t-test-team-distribution.mjs \
  --source-build "/path/to/current/source-build" \
  --runtime-stage "/path/to/runtime-stage" \
  --output "/path/to/output/gpao-t-0.1.0-test-team.1" \
  --archive "/path/to/output/gpao-t-0.1.0-test-team.1.zip"
```

성공 산출물:

- 배포 디렉터리
- `GPAO-T-DISTRIBUTION-MANIFEST.json`
- ZIP archive
- `<archive>.sha256`

## 독립 readback 검증

```bash
node tools/verify-gpao-t-test-team-distribution.mjs \
  --archive /tmp/gpao-t-0.1.0-test-team.1.zip
```

Verifier는 다음을 순서대로 실행한다.

1. SHA-256 sidecar와 archive 내용 해시 대조
2. archive entry의 절대 경로, `..`, 비정상 경로 차단
3. 임시 디렉터리 추출과 root 밖 symlink 차단
4. manifest 파일 목록, 크기, SHA-256, symlink target 전수 대조
5. embedded runtime provenance와 추출 runtime tree hash 대조
6. 현재 source build와 추출 runtime 재대조
7. 격리 HOME/state/config에서 `gpao-t --help` 실행
8. 임의의 빈 loopback port에서 Gateway를 시작하고 `GET /health` 200 확인
9. Gateway 종료와 임시 디렉터리 삭제

Source checkout이 없는 테스트팀 환경에서는 archive 내부 provenance 검증만 수행할 수 있다.

```bash
node tools/verify-gpao-t-test-team-distribution.mjs \
  --archive /path/to/gpao-t-0.1.0-test-team.1.zip \
  --skip-source-build-check
```

이 옵션은 현재 source build와의 재대조만 생략한다. checksum, archive 경로 안전성, manifest 전수 검증, embedded runtime hash, help smoke, 격리 port health smoke는 생략하지 않는다.

## 권한 경계

- 허용: source read, runtime stage read, 지정 output/archive write, `/tmp` 격리 smoke
- 금지: live OpenClaw 파일 변경, live Gateway restart, `~/.gpao-t` write, installer 실행, package upload, public release, external send
- 이 봉인은 로컬 배포물의 무결성과 실행 smoke를 증명한다. 공개 배포 승인이나 실제 설치 승인으로 해석하지 않는다.
