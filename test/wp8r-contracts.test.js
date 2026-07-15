import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalDigest, canonicalJson } from "../src/core/canonical-json.js";
import { createResponseDocument, verifyResponseDocument } from "../src/core/response-document.js";
import { createSurfaceEvent, createTextCompleteEvent } from "../src/core/surface-event.js";
import { StateStore } from "../src/core/store.js";

test("canonical JSON normalizes Korean text, line endings, and key order", () => {
  const composed = { z: "가\r\n나", a: "한" };
  const decomposed = { a: "한", z: "가\n나" };
  assert.equal(canonicalJson(composed), canonicalJson(decomposed));
  assert.equal(canonicalDigest("domain", composed), canonicalDigest("domain", decomposed));
  assert.throws(() => canonicalJson({ value: Number.NaN }), /non_finite/);
});

test("response document has one canonical digest and typed blocks", () => {
  const document = createResponseDocument({
    id: "response-1", turnId: "turn-1", sessionId: "session-1", createdAt: 10,
    blocks: [
      { id: "block-1", kind: "markdown", text: "# 제목\r\n\r\n본문" },
      { id: "block-2", kind: "code", language: "js", code: "const value = 1;" },
      { id: "block-3", kind: "table", columns: ["항목", "값"], rows: [["상태", "정상"]] }
    ]
  });
  assert.equal(document.blocks[0].text, "# 제목\n\n본문");
  assert.equal(verifyResponseDocument(document), true);
  assert.equal(verifyResponseDocument({ ...document, blocks: [{ ...document.blocks[0], text: "변조" }] }), false);
  assert.throws(() => createResponseDocument({ turnId:"t", sessionId:"s", blocks:[{ kind:"source", title:"위험", url:"javascript:alert(1)" }] }), /protocol is unsupported/);
});

test("surface events preserve causality and reject secret-bearing payloads", () => {
  const event = createSurfaceEvent({
    eventId: "event-1", turnId: "turn-1", sessionId: "session-1", sequence: 2,
    type: "tool.running", correlationId: "turn-1", causationId: "event-0", parentEventId: "event-root",
    attempt: 2, sourceEventId: "runtime-event-1", payload: { toolName: "웹 검색" }, createdAt: 20
  });
  assert.equal(event.visibility, "user");
  assert.equal(event.sensitivity, "private");
  assert.equal(event.causationId, "event-0");
  assert.equal(event.attempt, 2);
  assert.throws(() => createSurfaceEvent({ turnId: "t", sessionId: "s", sequence: 1, type: "turn.accepted", correlationId: "t", payload: { apiKey: "hidden" } }), error => error.code === "surface_event_secret_rejected");
  assert.throws(() => createSurfaceEvent({ turnId: "t", sessionId: "s", sequence: 1, type: "turn.accepted", correlationId: "t", sensitivity: "secret" }), error => error.code === "surface_event_secret_rejected");
  assert.throws(() => createSurfaceEvent({ turnId:"t", sessionId:"s", sequence:1, type:"text.delta", correlationId:"t", payload:{ text:"가".repeat(17 * 1024) } }), error => error.code === "surface_event_payload_too_large");
});

test("text.complete references the response document without duplicating its body", () => {
  const document = createResponseDocument({ turnId: "turn-1", sessionId: "session-1", blocks: [{ kind: "markdown", text: "긴 답변 본문" }] });
  const event = createTextCompleteEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 3, correlationId: "turn-1", responseDocument: document });
  assert.deepEqual(event.payload, { responseDocumentId: document.id, digest: document.digest, blockCount: 1 });
  assert.equal(JSON.stringify(event).includes("긴 답변 본문"), false);
});

test("durable journal replays projections and verifies response references after restart", () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-wp8r-"));
  const document = createResponseDocument({ id: "response-1", turnId: "turn-1", sessionId: "session-1", blocks: [{ kind: "markdown", text: "지속되는 답변" }] });
  const accepted = createSurfaceEvent({ eventId: "event-1", turnId: "turn-1", sessionId: "session-1", sequence: 1, type: "turn.accepted", correlationId: "turn-1", createdAt: 1 });
  const complete = createTextCompleteEvent({ eventId: "event-2", turnId: "turn-1", sessionId: "session-1", sequence: 2, correlationId: "turn-1", responseDocument: document, createdAt: 2 });
  let store = new StateStore(stateDir);
  store.transaction(() => {
    store.saveResponseDocument("owner:a", document);
    store.appendSurfaceEvent("owner:a", accepted);
    store.appendSurfaceEvent("owner:a", complete);
  });
  store.close();
  store = new StateStore(stateDir);
  try {
    const replay = store.replaySurfaceEvents("owner:a", "turn-1", 0);
    assert.deepEqual(replay.events.map(event => event.type), ["turn.accepted", "text.complete"]);
    assert.equal(replay.nextCursor, "turn-1:2");
    assert.equal(store.getResponseDocument("response-1", "owner:a").digest, document.digest);
    assert.equal(store.verifyIntegrity().surfaceJournal.events, 2);
  } finally {
    store.close();
  }
});
