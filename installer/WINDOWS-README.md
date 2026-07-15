# nBeAI. GPAO-T Windows 설치 파일

이 폴더는 Windows에서 GPAO-T를 설치하는 일반 사용자용 패키지입니다.

## 설치

1. 압축을 풉니다.
2. `GPAO-T-Install.cmd`를 더블클릭합니다.
3. 설치가 끝나면 브라우저에서 GPAO-T 대시보드가 열립니다.

Node.js, Docker, Git을 따로 설치할 필요가 없습니다. 설치 파일에 GPAO-T가
사용할 `node.exe` 실행 환경이 포함되어 있습니다.

Windows 기본 압축 해제기의 긴 경로 제한을 피하기 위해, 바깥 설치 ZIP에는
긴 `node_modules` 파일들을 직접 넣지 않습니다. 대신 짧은 `payload` ZIP을
설치기가 검증한 뒤 `%USERPROFILE%\.gpao-t` 아래로 풀어 설치합니다.

## 중요한 원칙

- 사용자는 연결키를 입력하지 않습니다.
- 설치기가 로컬 연결 정보를 만들고, 인증된 대시보드 주소를 자동으로 엽니다.
- 첫 브라우저 장치 승인도 설치기가 자동으로 처리합니다.
- 설치 위치는 `%USERPROFILE%\.gpao-t`입니다.
- Windows 로그인 시 GPAO-T가 자동으로 시작되도록 작업 스케줄러에 등록합니다.
- GitHub Releases 업데이트 feed가 기본으로 저장됩니다.

## 설치 후 주소

```text
http://127.0.0.1:18799/chat?session=main
```

직접 주소를 입력했을 때 연결키 화면이 보이면 `GPAO-T-Start.cmd`를 실행해
자동 인증 대시보드를 다시 여세요.

## 복구 명령

- `GPAO-T-Start.cmd`: GPAO-T를 시작하고 대시보드를 엽니다.
- `GPAO-T-Stop.cmd`: GPAO-T 백그라운드 실행을 중지합니다.
- `GPAO-T-Repair.cmd`: 설치 파일을 기준으로 런타임을 복구합니다.
- `GPAO-T-Uninstall.cmd`: 자동 시작 작업을 제거합니다. 사용자 데이터는 기본 보존됩니다.

## 보안 안내

Windows Defender 또는 SmartScreen이 처음 실행 파일을 확인할 수 있습니다.
정식 배포에서는 설치 파일과 실행 파일에 코드 서명을 적용하는 것이 목표입니다.
서명이 없는 내부 검증본은 Windows가 경고를 띄울 수 있습니다.

## 문제 확인

로그 위치:

```text
%USERPROFILE%\.gpao-t\logs
```

설치 실패 후에는 같은 `GPAO-T-Install.cmd`를 다시 실행할 수 있습니다.
이미 설치된 사용자 데이터와 모델 연결 설정은 보존됩니다.
