# WP8-R Product Surface Contract

- Date: 2026-07-16
- Status: `closed_local_browser_and_release_qualified`
- Protocol: Response Document v1 / Surface Event v1 / OS Turn API v2
- State schema: SQLite v6

## 1. Purpose

WP8-R strengthens the completed WP8 work surface without reopening its original scope. It turns the
conversation UI into a durable operating surface whose presentation, event delivery, security, and
responsive behavior are explicit runtime contracts.

## 2. Canonical ownership

- A completed answer has one canonical `ResponseDocument` in `response_documents`.
- `text.complete` stores only `responseDocumentId`, canonical digest, and block count.
- Surface events are replayable projections in `surface_event_journal`; the hash-chained runtime event
  ledger remains the execution journal.
- Canonical digests use SHA-256 over domain-separated canonical JSON: sorted object keys, NFC strings,
  LF line endings, and rejection of non-finite numbers.
- Legacy synchronous `/v1/os-turns` remains available during migration. `/v2/os-turns` adds
  `202 Accepted`, status, cancellation, and durable SSE replay without breaking the v1 client.

## 3. Response presentation

Supported typed blocks are `markdown`, `code`, `table`, `source`, and `artifact`. The browser renders
Markdown through a locally bundled parser, neutralizes raw HTML at the token layer, and sanitizes the
result with a strict tag, attribute, and URL allowlist. Source blocks accept only HTTP(S) URLs.

## 4. Surface Event contract

Every event carries:

```text
eventId, turnId, sessionId, sequence, type
correlationId, causationId, parentEventId, attempt
visibility, sensitivity, sourceEventId, payload, terminal, digest
```

Only `visibility:user` projections can enter this journal. `sensitivity:secret`, secret-bearing field
names, payloads larger than 64 KiB, and text deltas larger than 16 KiB are rejected before persistence.

Implemented event families include turn, text, tool, memory, recovery, file, approval, update, and
stream reconnect lifecycle events. Current runtime sources actively project turn, text, tool, memory,
and recovery events; file, approval, and update events are reserved by the versioned contract for their
own authoritative runtime sources.

## 5. Delivery and recovery

- SSE replay uses a durable `turnId:sequence` cursor and pages beyond 256 events.
- Replay and live delivery are joined with a queue so events cannot disappear in the handoff gap.
- Browser reconnect prefers `Last-Event-ID`; duplicate event IDs are ignored in the UI.
- The same request ID and digest deduplicate across runtime restart. Reuse with different input fails.
- A turn interrupted by runtime restart becomes an explicit recoverable terminal failure.
- Streaming is negotiated only for providers that implement it. Other providers keep progress events
  and a final canonical response. Cancellation reaches the provider signal boundary.

## 6. Operating surface

- The center remains conversation-first and shows streaming answer text when available.
- The right panel receives actual tool, memory, recovery, and turn events and never reopens after the
  user closes it in the same session; a badge is used instead.
- Desktop uses a side panel. Mobile uses a conversation drawer and bottom-sheet/full-screen assistant
  panel with visual viewport and safe-area constraints.
- Internal schemas, raw receipts, stack traces, evidence labels, and WP language stay outside the basic
  user surface.

## 7. Qualification gate

The gate requires contract/unit regression, the complete existing runtime suite, XSS fixtures, long
Korean Markdown, code, table, link, real Surface Events, desktop/mobile/keyboard-constrained browser
screenshots, console inspection, and WP9 package lifecycle regression.

Evidence owner:

`/Users/jyp/Developer/gpao-t-native-runtime-research/engineering/evidence/wp8r-product-surface-2026-07-16/`

Final local qualification: contract/regression tests pass, 208 existing tests pass, browser surface
qualification passes with no console errors, and release `0.2.2-foundation-a25a2efea245` passes install,
service activation, migration, update, cross-schema rollback, and post-rollback turn verification.
