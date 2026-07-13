# Owner Ops Marketplace / Upload Decision Lane v0.1

## Purpose

This lane records an owner decision about future marketplace/upload readiness without executing upload, public release, signing, credential access, install, update, or rollback.

It exists because a prepared upload approval gate is not the same as a recorded owner decision.

## Decision Values

Allowed decision values:

- `hold`
- `revise`
- `approve_local_distribution_only`
- `approve_marketplace_upload_later`

## Required Approval Token

Appending a local decision record requires:

```text
approve-owner-ops-marketplace-upload-local-record
```

The token only allows a local JSONL decision record.

It does not allow:

- marketplace upload
- network upload
- public release
- signing
- credential access
- install execution
- update execution
- rollback execution
- external distribution

## Storage

Records are stored locally:

```text
.gpao-t/owner-ops/marketplace-upload/decision-records.jsonl
.gpao-t/owner-ops/marketplace-upload/index.json
```

## CLI / Gateway

CLI:

```bash
node bin/gpao-t.js owner-ops marketplace-upload-decision-lane
node bin/gpao-t.js owner-ops marketplace-upload-decision-append approve_marketplace_upload_later approve-owner-ops-marketplace-upload-local-record
node bin/gpao-t.js owner-ops marketplace-upload-decision-records
node bin/gpao-t.js owner-ops marketplace-upload-decision-check
```

Gateway:

```text
GET  /owner-ops/marketplace-upload-decision-lane
POST /owner-ops/marketplace-upload-decision-append
GET  /owner-ops/marketplace-upload-decision-records
GET  /owner-ops/marketplace-upload-decision-lane/verify
```

## Interpretation

A written decision record is review evidence only.

Even `approve_marketplace_upload_later` does not upload anything and does not authorize public release by itself.

