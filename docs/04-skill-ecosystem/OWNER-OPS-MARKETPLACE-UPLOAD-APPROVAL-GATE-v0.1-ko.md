# Owner Ops Marketplace / Upload Approval Gate v0.1

## Purpose

This gate separates a locally prepared Owner Ops package from any public upload, marketplace listing, download page, external distribution, or network publish action.

It exists because package readiness, signing readiness, marketplace upload, and public release are different authority levels.

## Current State

- Gate state: `prepared_not_approved`
- Marketplace upload allowed: `false`
- Public release allowed: `false`
- Network upload allowed: `false`
- Credential access allowed: `false`
- External distribution allowed: `false`
- Install/update/rollback execution allowed: `false`

## Marketplace Targets

The gate recognizes three target classes:

1. `local_team_handoff`
   - Local package transfer for review.
   - Does not require public upload.

2. `future_plugin_marketplace_listing`
   - Future plugin or marketplace listing.
   - Requires separate marketplace/upload approval.

3. `future_download_page_or_release_archive`
   - Future public download page or release archive.
   - Requires explicit public release approval.

## Required Before Upload Approval

Before any marketplace upload or public release can be considered, the owner must have inspectable evidence for:

- explicit human review decision record approving public release
- separate marketplace/upload approval decision
- signed artifact evidence or explicit local-only no-sign decision
- checksum readback for the exact upload artifact
- signature verification output when signing is used
- marketplace listing copy final review
- privacy and customer-data copy final review
- install/update/rollback proof against the exact upload artifact
- rollback/removal plan for a mistaken upload
- local marketplace/upload decision record

## Authority Boundary

This gate is local proof only.

It must not:

- upload a package
- publish a listing
- create a public release
- read credentials
- perform paid actions
- sign or notarize artifacts
- install, update, or rollback software
- include customer data in a package

## CLI / Gateway

CLI:

```bash
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate-check
node bin/gpao-t.js owner-ops marketplace-upload-decision-lane
node bin/gpao-t.js owner-ops marketplace-upload-decision-check
```

Gateway:

```text
GET /owner-ops/marketplace-upload-approval-gate
GET /owner-ops/marketplace-upload-approval-gate/verify
GET /owner-ops/marketplace-upload-decision-lane
GET /owner-ops/marketplace-upload-decision-lane/verify
```

## Interpretation

A `ready` check means the marketplace/upload approval gate is present, inspectable, and closed.

It does not mean upload is approved.

A marketplace/upload decision record is separate review evidence. It still does not execute upload.
