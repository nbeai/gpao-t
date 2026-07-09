import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  applySessionWorkspaceAction,
  buildCoreWorkSurface,
  handleGatewayRequest,
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "../src/index.js";
import { sessionWorkspacePaths } from "../src/core/session-workspace.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-session-workspace-"));
}

describe("Interactive Session Behavior v1", () => {
  it("creates, renames, selects, archives, restores, and delete-pends sessions locally only", () => {
    const root = tempRoot();
    const initial = readSessionWorkspaceState({ root, now: "2026-07-09T10:00:00.000Z" });
    assert.equal(initial.schema, "gpao_t.session_workspace_state.v1");
    assert.equal(initial.sessions.some((session) => session.state === "active"), true);
    assert.equal(initial.boundaries.permanentDelete, "blocked");

    const created = applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "시장 자료 정리",
      request: "DART와 통계 자료를 모아줘",
      now: "2026-07-09T10:01:00.000Z",
    });
    assert.equal(created.status, "applied");
    assert.equal(created.state.sessions[0].title, "시장 자료 정리");
    assert.equal(created.state.sessions[0].state, "active");

    const sessionId = created.sessionId;
    const renamed = applySessionWorkspaceAction({
      root,
      action: "rename",
      sessionId,
      title: "시장 자료 정리 v1",
      now: "2026-07-09T10:02:00.000Z",
    });
    assert.equal(renamed.status, "applied");
    assert.equal(renamed.state.sessions.find((session) => session.id === sessionId).title, "시장 자료 정리 v1");

    const archived = applySessionWorkspaceAction({
      root,
      action: "archive",
      sessionId,
      now: "2026-07-09T10:03:00.000Z",
    });
    assert.equal(archived.status, "applied");
    assert.equal(archived.state.sessions.find((session) => session.id === sessionId).state, "archived");
    assert.equal(archived.state.sessions.some((session) => session.state === "active"), true);

    const selectArchived = applySessionWorkspaceAction({
      root,
      action: "select_session",
      sessionId,
      now: "2026-07-09T10:04:00.000Z",
    });
    assert.equal(selectArchived.status, "review");
    assert.equal(selectArchived.reason, "restore_before_select");

    const restored = applySessionWorkspaceAction({
      root,
      action: "restore",
      sessionId,
      now: "2026-07-09T10:05:00.000Z",
    });
    assert.equal(restored.status, "applied");
    assert.equal(restored.state.sessions.find((session) => session.id === sessionId).state, "draft");

    const selected = applySessionWorkspaceAction({
      root,
      action: "select_session",
      sessionId,
      now: "2026-07-09T10:06:00.000Z",
    });
    assert.equal(selected.status, "applied");
    assert.equal(selected.state.activeSessionId, sessionId);

    const deletePending = applySessionWorkspaceAction({
      root,
      action: "mark_delete_pending",
      sessionId,
      now: "2026-07-09T10:07:00.000Z",
    });
    assert.equal(deletePending.status, "applied");
    assert.equal(deletePending.state.sessions.find((session) => session.id === sessionId).state, "delete_pending");
    assert.equal(deletePending.state.boundaries.permanentDelete, "blocked");

    const canceled = applySessionWorkspaceAction({
      root,
      action: "cancel_delete_pending",
      sessionId,
      now: "2026-07-09T10:08:00.000Z",
    });
    assert.equal(canceled.status, "applied");
    assert.equal(canceled.state.sessions.find((session) => session.id === sessionId).state, "draft");

    const blocked = applySessionWorkspaceAction({
      root,
      action: "permanent_delete",
      sessionId,
      now: "2026-07-09T10:09:00.000Z",
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.reason, "unsupported_or_destructive_action");

    assert.equal(existsSync(sessionWorkspacePaths({ root }).sessionFile), true);
    assert.equal(verifySessionWorkspaceBehavior({ root }).status, "ready");
  });

  it("feeds local session state into Work Surface and exposes Gateway/CLI surfaces", () => {
    const root = tempRoot();
    const created = applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "인터랙티브 세션 테스트",
      request: "세션 동작을 확인해줘",
      now: "2026-07-09T10:10:00.000Z",
    });

    const surface = buildCoreWorkSurface({ root });
    assert.equal(surface.sessionWorkspace.behavior.status, "local_actions_enabled");
    assert.equal(surface.sessionWorkspace.behavior.activeSessionId, created.sessionId);
    assert.equal(surface.sessionWorkspace.activeWorkSession.title, "인터랙티브 세션 테스트");
    assert.equal(surface.sessionWorkspace.sessionRail.actions.find((action) => action.id === "new_session").enabled, true);
    assert.equal(surface.sessionWorkspace.sessionRail.permanentDelete.enabled, false);

    const gatewayState = handleGatewayRequest({ root, method: "GET", path: "/sessions" });
    assert.equal(gatewayState.status, 200);
    assert.equal(gatewayState.body.activeSessionId, created.sessionId);

    const gatewayAction = handleGatewayRequest({
      root,
      method: "POST",
      path: "/sessions/action",
      body: {
        action: "rename",
        sessionId: created.sessionId,
        title: "인터랙티브 세션 테스트 v2",
      },
    });
    assert.equal(gatewayAction.status, 200);
    assert.equal(gatewayAction.body.status, "applied");

    const gatewayVerify = handleGatewayRequest({ root, method: "GET", path: "/sessions/verify" });
    assert.equal(gatewayVerify.body.status, "ready");

    const cliState = JSON.parse(execFileSync(process.execPath, [CLI, "control", "sessions"], {
      encoding: "utf8",
    }));
    assert.equal(cliState.schema, "gpao_t.session_workspace_state.v1");

    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "sessions-check"], {
      encoding: "utf8",
    }));
    assert.equal(cliCheck.status, "ready");
  });
});
