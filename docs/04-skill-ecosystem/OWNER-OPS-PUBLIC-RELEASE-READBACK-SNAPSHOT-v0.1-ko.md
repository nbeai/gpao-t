# Owner Ops Public Release Readback Snapshot v0.1

## Purpose

This snapshot checks public-release prerequisites by reading already generated local evidence files.

It is a fast readback checker, not a release executor.

## Read Surfaces

The snapshot reads:

- `.gpao-t/packages/OWNER-OPS-RELEASE-READINESS-EVIDENCE.json`
- `.gpao-t/packages/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.json`
- `.gpao-t/packages/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.json`
- `.gpao-t/packages/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json`
- `.gpao-t/packages/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.json`
- `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.*`
- local human review decision records
- local marketplace/upload decision records

## Authority Boundary

The snapshot must not:

- upload a package
- publish a release
- sign an artifact
- read credentials
- install, update, or rollback software
- perform network upload

## CLI / Gateway

CLI:

```bash
node bin/gpao-t.js owner-ops public-release-readback
node bin/gpao-t.js owner-ops public-release-readback-check
```

Gateway:

```text
GET /owner-ops/public-release-readback
GET /owner-ops/public-release-readback/verify
```

## Interpretation

A `ready` readback check means the local evidence files are present, ready, and authority boundaries are still closed.

It does not mean public release is authorized.

