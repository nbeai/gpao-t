# GPAO-T Runtime And iCloud Boundary - 2026-07-13

## Canon Decision

GPAO-T is a local-first personal AI operating system. Its core runtime, source of truth, install path, and test-team distribution must not depend on iCloud availability, iCloud file materialization, or Apple file-provider timing.

## Fixed Rules

1. Development repositories must live outside iCloud-synchronized paths.
2. GPAO-T default runtime is fixed at `~/.gpao-t`.
3. iCloud documents are optional backup/sync inputs only.
4. Test-team distributions must work without iCloud.
5. iCloud integration is excluded from Phase 2 core completion criteria.

## Plain-Language Meaning

GPAO-T can read useful documents from iCloud if the user chooses that later, but GPAO-T itself must not need iCloud to start, remember, search, install, recover, or pass tests.

## Why This Became P0

During local semantic memory work, several source files and Context Mesh files appeared with file metadata but no local file body. Node imports and tests could hang or fail with `ECANCELED` while reading those files.

This means iCloud/file-provider behavior can make a healthy codebase look broken. GPAO-T must treat that as an environmental boundary, not as a memory-engine foundation.

## Product Consequence

Core GPAO-T lanes must assume:

- runtime state: `~/.gpao-t`
- release package: self-contained and iCloud-independent
- memory/search index: local runtime-owned index
- iCloud content: explicit optional connector/input lane
- test-team smoke: no iCloud requirement

## Phase 2 Boundary

iCloud document sync is not a Phase 2 completion blocker. It may become a later connector feature after:

- local runtime stability,
- Docker/distribution reproducibility,
- memory/T-cell kernel,
- UI/UX OS feel,
- OpenClaw comparison/optimization

are solid.

## Local Latest-Only Retention Rule

- GPAO-T local development source is /Users/jyp/Developer/gpao-t.
- GPAO-T live runtime is /Users/jyp/.gpao-t.
- Local release folders keep only the latest usable distribution by default.
- Old local clones, labs, generated evidence outside the project, package caches, and duplicate releases are delete-candidates after they are captured in a manifest.
- GitHub is the source-history archive. Local folders are working copies, not long-term storage.
- iCloud is not a development or runtime dependency. It may be used only as optional document backup/sync outside the Phase 2 core.
