# Owner Ops Approved Signing Lane v0.1

## Purpose

이 문서는 `gpao-t-owner-ops` 패키지를 공개 배포하기 전에 필요한 signing 준비 경계를 정의한다.

이 단계는 서명 실행 단계가 아니다.
이 단계는 어떤 artifact를 어떤 조건에서 서명할 수 있는지, 어떤 증거가 필요한지, 어떤 권한이 아직 닫혀 있는지를 확인하는 로컬 proof gate다.

## Current State

```text
lane state: prepared_not_executed
signing approved: false
signing executed: false
certificate read: false
credential access: false
signed artifact written: false
public release: false
package upload: false
install/update/rollback: false
external distribution: false
```

## Required Before Signing Execution

- explicit human review decision record approving signing lane
- signing target selected
- certificate/identity source selected by human
- dry-run command preview
- rollback/rebuild reference
- post-sign verification plan

## Signing Targets

### local_zip_checksum_attestation

Local-only zip package evidence.

Required evidence:

- pre-sign archive sha256
- post-sign artifact sha256 or explicit no-sign local attestation
- signature verification output or local-only no-sign decision

### macos_tauri_app_signing

macOS desktop app bundle signing lane.

Required evidence:

- Apple Developer identity selected by human
- codesign command preview
- codesign verification output
- notarization output when distribution leaves local machine

### windows_installer_signing

Windows installer signing lane.

Required evidence:

- certificate source selected by human
- signtool command preview
- signature verification output

## CLI

```bash
node bin/gpao-t.js owner-ops approved-signing-lane
node bin/gpao-t.js owner-ops approved-signing-lane-check
```

## Gateway

```text
GET /owner-ops/approved-signing-lane
GET /owner-ops/approved-signing-lane/verify
```

## Boundary

`approved-signing-lane-check: ready` means the signing lane is correctly prepared and still closed.

It does not mean:

- signing has been approved
- certificate access is allowed
- a signed artifact exists
- notarization has happened
- upload or public release is allowed
- install/update/rollback is allowed

## Next Safe Action

Review the signing lane and choose a signing target.
Do not read certificates, sign, notarize, upload, install, update, rollback, or distribute until a separate explicit human approval exists.
