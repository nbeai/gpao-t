import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  handleGatewayRequest,
  initializeRuntimeState,
  readAuditEvents,
  readRuntimeState,
  runRuntimeTurn,
  runtimePaths,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-runtime-"));
}

describe("GPAO-T local runtime persistence", () => {
  it("initializes .gpao-t state and local audit log without external activation", () => {
    const root = tempRoot();
    const state = initializeRuntimeState({ root, now: "2026-07-08T00:00:00.000Z" });
    const paths = runtimePaths({ root });
    const events = readAuditEvents({ root });

    assert.equal(state.schema, "gpao_t.runtime_state.v0_1");
    assert.equal(state.boundaries.externalActivation, "blocked");
    assert.equal(events[0].type, "runtime.initialized");
    assert.match(readFileSync(paths.stateFile, "utf8"), /gpao_t.runtime_state/);
    assert.match(readFileSync(paths.eventFile, "utf8"), /runtime.initialized/);
  });

  it("persists active flow and audit event after a turn", () => {
    const root = tempRoot();
    const result = runRuntimeTurn({
      root,
      now: "2026-07-08T00:01:00.000Z",
      input: { text: "그럼 배포파일은?" },
    });
    const state = readRuntimeState({ root });
    const events = readAuditEvents({ root });

    assert.equal(result.persistence.state, "written");
    assert.equal(state.activeFlow.activeTargetId, "release-file");
    assert.equal(state.counters.turns, 1);
    assert.equal(events.at(-1).type, "turn.authority_needed");
    assert.equal(events.at(-1).payload.modelRoute, "fast_context_recovery");
  });
});

describe("GPAO-T local gateway skeleton", () => {
  it("serves health, state, events, and turn requests through one local API contract", () => {
    const root = tempRoot();

    assert.equal(handleGatewayRequest({ root, method: "GET", path: "/health" }).status, 200);
    assert.equal(handleGatewayRequest({ root, method: "POST", path: "/init" }).status, 200);

    const turn = handleGatewayRequest({
      root,
      method: "POST",
      path: "/turn",
      body: { input: { text: "그럼 배포파일은?" } },
    });
    const state = handleGatewayRequest({ root, method: "GET", path: "/state" });
    const events = handleGatewayRequest({ root, method: "GET", path: "/events" });
    const missing = handleGatewayRequest({ root, method: "GET", path: "/missing" });

    assert.equal(turn.status, 200);
    assert.equal(turn.body.sessionOverlay.activeTargetId, "release-file");
    assert.equal(state.body.activeFlow.activeTargetId, "release-file");
    assert.equal(events.body.at(-1).payload.activeTargetId, "release-file");
    assert.equal(missing.status, 404);
    assert.match(missing.body.nextSafeAction, /GET \/health/);
  });
});
