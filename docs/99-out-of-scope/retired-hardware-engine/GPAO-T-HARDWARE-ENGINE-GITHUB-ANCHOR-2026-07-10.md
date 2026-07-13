# GPAO-T Hardware Engine GitHub Anchor

Date: 2026-07-10  
Status: remote anchor confirmed  
Scope: `nbeai/gpao-t-hardware-engine` as the current GPAO-T OpenClaw / Hardware Engine work situation

## 1. User-Provided Source

User identified the current work situation as:

```text
https://github.com/nbeai/gpao-t-hardware-engine
```

This repository is the current source reference for the GPAO-T 2.0 Hardware Engine track.

## 2. Remote Repository Facts

GitHub API confirmed:

```text
full_name: nbeai/gpao-t-hardware-engine
visibility: private
default_branch: main
language: JavaScript
created_at: 2026-07-10T09:35:40Z
pushed_at: 2026-07-10T09:35:44Z
html_url: https://github.com/nbeai/gpao-t-hardware-engine
```

Main branch commit:

```text
sha: d454fd6c5df7b49ede31f789d592fff567be7129
message: Prepare GPAO-T private source repository boundary
date: 2026-07-10T09:34:50Z
verification: unsigned
```

Top-level remote contents include:

```text
.gitignore
AGENTS.md
README.md
bin/
docs/
package.json
skills/
src/
test/
tools/
workspace-notes/
```

## 3. Local Repository Facts

Local root:

```text
/Users/jyp/Documents/Playground 2/gpao-t-hardware-engine
```

Local remote:

```text
origin https://github.com/nbeai/gpao-t-hardware-engine.git
```

Local branch:

```text
main
```

Recent local commits:

```text
d454fd6 Prepare GPAO-T private source repository boundary
447ac10 Add OpenClaw shadow comparison replay
32e7b2b Record GPAO-T hardware engine closeout readiness
02441d6 Complete GPAO-T hardware engine local-safe baseline
```

Local status at check time:

```text
clean
```

## 4. Repository Role In GPAO-T

`gpao-t-hardware-engine` is not the main GPAO-T user interface.

It is the hardware/runtime substrate track for:

- model connection boundary
- local PC state
- CLI / MCP / tool bus
- local files
- external devices / connectors
- gateway / dashboard surfaces
- approval / audit / replay / rollback records
- OpenClaw substrate absorption

Correct product meaning:

```text
GPAO-T 본체의 OS 철학과 사용자 경험은 gpao-t가 소유한다.
gpao-t-hardware-engine은 GPAO-T가 OpenClaw급 로컬 실행 능력 위에 설 수 있게 하는 안정적인 하드웨어/런타임 엔진 레인이다.
```

## 5. Readiness Evidence

Commands run locally:

```text
npm run github:check
node bin/gpao-t-hardware-engine.js project readiness --json
node bin/gpao-t-hardware-engine.js closeout --json
```

Observed results:

```text
github readiness: ready_private_source_repo
project readiness: complete_local_safe
closeout: complete_local_safe
```

Important project readiness meaning:

```text
로컬 안전 엔진 단계는 검증되어 다음 GPAO-T 커널/어댑터 작업의 기반으로 사용할 수 있음
```

Important completion boundary:

```text
localEngineComplete: true
liveOpenClawReplacementReady: false
publicDistributionReady: false
externalActionReady: false
safeToExecuteLiveActions: false
```

## 6. What This Confirms

Confirmed:

- The GitHub repository exists and is private.
- Local `gpao-t-hardware-engine` is connected to the GitHub remote.
- The remote contains the expected source directories.
- The local repository is clean.
- The current local stage is `complete_local_safe`.
- GitHub readiness says the repository is suitable as a private source repository.

## 7. What This Does Not Confirm

Not confirmed or not opened:

- live OpenClaw replacement
- live tool / CLI / MCP execution
- connector activation
- credential access
- external send
- durable memory promotion
- self-growth apply
- public release / deployment
- final GPAO-T product UI completion

## 8. Next Safe Interpretation

This repository should be treated as:

```text
GPAO-T Runtime / Substrate Lab source-of-truth for the Hardware Engine lane.
```

It should not be treated as:

```text
the whole GPAO-T OS
the final user-facing GPAO-T app
an OpenClaw improvement project for its own sake
a public release-ready product
live OpenClaw replacement proof
```

## 9. Next Safe Action

Use this repository as the direct implementation target for the next Hardware Engine / OpenClaw substrate pass.

Current project readiness recommends:

```text
GPAO-T workspace/system prompt footprint narrowing Pass 010
```

Reason:

```text
Pass009로 도구/스킬 물리 축소가 닫혔으므로, 다음 병목은 workspace/system prompt 주입 예산이다.
```

Before Pass 010, Codex should keep asking:

```text
이 변경이 GPAO-T OS 완성도를 높이는가?
```

