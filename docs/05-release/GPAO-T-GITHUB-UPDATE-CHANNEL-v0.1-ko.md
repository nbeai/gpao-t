# GPAO-T GitHub Update Channel v0.1

## 목적

GPAO-T 정식 배포본은 설치 후에도 사용자의 `~/.gpao-t` 상태, 모델 연결 설정,
기억/맥락 데이터, 대화 기록, 장치 승인 정보를 보존하면서 GitHub Releases를
통해 새 버전을 받을 수 있어야 한다.

## 기본 원칙

- 버전명은 날짜형 릴리스 버전만 사용한다: `YYYY.MM.DD-rN`.
- 설치 파일은 `~/.gpao-t`에 런타임을 설치하고, 이후 업데이트도 같은 state
  home을 보존한다.
- OpenClaw 호환 런타임의 upstream 업데이트 경로는 사용하지 않는다.
- GPAO-T 업데이트 feed URL은 LaunchAgent의 `GPAO_T_UPDATE_FEED_URL` 환경변수로 관리한다.
- `~/.gpao-t/gpao-t.json`에는 호환 런타임 스키마가 허용하는 키만 저장한다.
- 호환 런타임 스키마와 충돌하지 않도록 `update.channel`은 `stable`, `extended-stable`, `beta`, `dev` 중 하나만 사용한다.
- 업데이트 적용 전 SHA-256 검증, snapshot, staged copy, current symlink 교체,
  restart, health, dashboard, fresh chat, 로그 확인을 거친다.

## GitHub Release 산출물

릴리스 태그 예:

```text
2026.07.15-r3
```

각 GitHub Release에는 최소 다음 파일을 올린다.

```text
gpao-t-2026.07.15-r3.zip
gpao-t-2026.07.15-r3.zip.sha256
gpao-t-2026.07.15-r3-macos-installer.zip
gpao-t-2026.07.15-r3-macos-installer.zip.sha256
gpao-t-update.json
```

Windows 설치 파일은 Windows `node.exe` payload가 검증된 경우에만 추가한다.

```text
gpao-t-2026.07.15-r3-windows-installer.zip
gpao-t-2026.07.15-r3-windows-installer.zip.sha256
```

`gpao-t-update.json`은 아래 명령으로 생성한다.

```bash
npm run package:production
npm run package:macos-installer
npm run package:github-update-feed
```

Windows asset을 포함하려면 Windows Node payload를 명시적으로 준비한 뒤 별도 빌드한다.

기본 feed URL:

```text
https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json
```

## 설치기 동작

macOS 설치기는 기본적으로 다음을 수행한다.

- `~/.gpao-t/gpao-t.json`에 호환 런타임용 `update.channel = stable` 저장
- `gpao-t.json`에는 `gpaoTUpdate` 같은 GPAO-T 전용 최상위 키를 저장하지 않음
- LaunchAgent 환경변수에 `GPAO_T_UPDATE_FEED_URL` 저장
- `OPENCLAW_NO_AUTO_UPDATE=1` 유지
- 기존 호환 런타임은 기본적으로 읽거나 변경하지 않음

Windows 설치기는 기본적으로 다음을 수행한다.

- `%USERPROFILE%\.gpao-t\gpao-t.json` 생성 또는 보강
- `%USERPROFILE%\.gpao-t\runtime\node.exe` 설치
- `%USERPROFILE%\.gpao-t\current`에 현재 런타임 복사
- Windows Task Scheduler `ONLOGON` 작업 등록
- 인증 대시보드 자동 열기
- 첫 브라우저 device pairing 자동 승인
- 사용자가 연결키를 직접 입력하지 않도록 처리

## 사용자 보존 범위

업데이트는 아래를 보존해야 한다.

- 모델 연결 설정과 OAuth/API key 저장소
- 장치 승인 상태
- 대화/세션 기록
- 메모리/맥락 색인과 후보 큐
- 작업공간과 사용자 산출물
- rollback snapshot과 설치 receipt

## 남은 구현 경계

현재 구조는 GitHub update feed, 설치기 영구 설정, `gpao-t update status`,
`gpao-t update apply --yes` 경로까지 포함한다. 업데이트 적용은 feed fetch,
asset SHA-256 검증, staged unzip, distribution manifest 확인, release 배치,
`current` symlink 전환, receipt 기록 순서로 진행한다.

대시보드의 업데이트 버튼은 이 전용 명령 경계에 연결되어야 하며, 적용 뒤에는
런타임 재시작과 `/health`, 대시보드, fresh chat 검증을 수행한다.

외부 공개 GitHub Release 생성과 업로드는 별도 권한 경계다.
