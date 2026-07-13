import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  applySessionWorkspaceAction,
  buildCodexStyleMultiChatWorkspace,
  buildCoreWorkSurface,
  handleGatewayRequest,
  readSessionWorkspaceState,
  verifyCodexStyleMultiChatWorkspace,
  verifyCoreWorkSurface,
  verifySessionWorkspaceBehavior,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-multi-chat-workspace-"));
}

describe("GPAO-T Codex-style Multi Chat Workspace v1", () => {
  it("upgrades local sessions into thread/session/context/memory/authority units", () => {
    const root = tempRoot();
    const created = applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "코덱스식 멀티 대화창",
      request: "세션별 맥락과 통합 기억을 분리해줘",
      now: "2026-07-11T05:00:00.000Z",
    });
    assert.equal(created.status, "applied");

    const state = readSessionWorkspaceState({ root, now: "2026-07-11T05:01:00.000Z" });
    assert.equal(state.workspace.title, "nBeAI. GPAO-T");
    const active = state.sessions.find((session) => session.id === created.sessionId);
    assert.equal(active.threadId.startsWith("thread."), true);
    assert.equal(active.contextPacket.scope, "thread");
    assert.equal(active.memoryScope.durablePromotion, "blocked");
    assert.equal(active.memoryScope.compatibilityMemoryWrite, "blocked");
    assert.equal(active.authorityGate.permanentDelete, "blocked");
    assert.equal(active.replayState.requiredBeforeAdmission, true);
    assert.equal(verifySessionWorkspaceBehavior({ root }).status, "ready");
  });

  it("keeps rename, archive, restore, delete-pending, and permanent delete boundaries explicit", () => {
    const root = tempRoot();
    const created = applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "테스트 세션",
      now: "2026-07-11T05:10:00.000Z",
    });
    const sessionId = created.sessionId;

    const renamed = applySessionWorkspaceAction({
      root,
      action: "rename",
      sessionId,
      title: "테스트 세션 v2",
      now: "2026-07-11T05:11:00.000Z",
    });
    assert.equal(renamed.state.sessions.find((session) => session.id === sessionId).title, "테스트 세션 v2");

    const archived = applySessionWorkspaceAction({ root, action: "archive", sessionId, now: "2026-07-11T05:12:00.000Z" });
    assert.equal(archived.state.sessions.find((session) => session.id === sessionId).state, "archived");

    const restored = applySessionWorkspaceAction({ root, action: "restore", sessionId, now: "2026-07-11T05:13:00.000Z" });
    assert.equal(restored.state.sessions.find((session) => session.id === sessionId).state, "draft");

    const deletePending = applySessionWorkspaceAction({
      root,
      action: "mark_delete_pending",
      sessionId,
      now: "2026-07-11T05:14:00.000Z",
    });
    assert.equal(deletePending.state.sessions.find((session) => session.id === sessionId).state, "delete_pending");

    const permanentDelete = applySessionWorkspaceAction({
      root,
      action: "permanent_delete",
      sessionId,
      now: "2026-07-11T05:15:00.000Z",
    });
    assert.equal(permanentDelete.status, "blocked");
    assert.equal(permanentDelete.reason, "unsupported_or_destructive_action");
  });

  it("exposes the multi-chat contract through Gateway, CLI, and work surface", () => {
    const root = tempRoot();
    applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "메모리/맥락 격리",
      request: "다른 세션과 섞지 마",
      now: "2026-07-11T05:20:00.000Z",
    });

    const workspace = buildCodexStyleMultiChatWorkspace({ root, now: "2026-07-11T05:21:00.000Z" });
    const verification = verifyCodexStyleMultiChatWorkspace({ workspace });
    assert.equal(workspace.schema, "gpao_t.codex_style_multi_chat_workspace.v1");
    assert.equal(verification.status, "ready");
    assert.equal(workspace.memoryContextContract.durablePromotion, "blocked");
    assert.equal(workspace.authorityContract.compatibilityMemoryWrite, "blocked");
    assert.equal(workspace.layoutContract.tabCloseEndsSession, false);
    assert.equal(workspace.threads.some((thread) => thread.memoryScope.thread), true);

    const gateway = handleGatewayRequest({ root, method: "GET", path: "/multi-chat-workspace" });
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, "gpao_t.codex_style_multi_chat_workspace.v1");

    const gatewayCheck = handleGatewayRequest({ root, method: "GET", path: "/multi-chat-workspace/verify" });
    assert.equal(gatewayCheck.body.status, "ready");

    const surface = buildCoreWorkSurface({ root });
    const surfaceCheck = verifyCoreWorkSurface({ surface });
    assert.equal(surface.sessionWorkspace.behavior.codexStyleWorkspace.threadCount > 0, true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "memory"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "replay"), true);
    assert.equal(surfaceCheck.status, "ready");

    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "multi-chat-workspace-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    assert.equal(cliCheck.status, "ready");
  });
});
