import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  applyRuntimeWorkspaceWelcomeSettings,
  buildRuntimeWorkspaceWelcome,
  buildRuntimeWorkspaceWelcomeDraft,
  verifyRuntimeWorkspaceWelcome,
} from "../src/core/runtime-workspace-welcome.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-welcome-"));
}

async function seedWorkspace(root) {
  await mkdir(root, { recursive: true });
  for (const file of [
    "AGENTS.md",
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "TOOLS.md",
    "HEARTBEAT.md",
    "MEMORY.md",
    "WELCOME.md",
    "RUNTIME-MANIFEST.json",
  ]) {
    await writeFile(
      join(root, file),
      file === "WELCOME.md"
        ? "# WELCOME\n\n## Required Setup Questions\n"
        : "nBeAI. GPAO-T\nIndependent, local-first Growth Personal AI Operating System\nUser Name\n",
    );
  }
}

describe("runtime workspace welcome setup", () => {
  it("reports missing welcome workspace files", () => {
    const root = tempRoot();
    const welcome = buildRuntimeWorkspaceWelcome({ workspaceRoot: root });
    assert.equal(welcome.status, "blocked");
    assert.ok(welcome.missingFiles.includes("WELCOME.md"));
  });

  it("drafts and applies first-install persona settings behind an approval token", async () => {
    const root = tempRoot();
    await seedWorkspace(root);

    const answers = {
      userName: "윤",
      userAddress: "윤님",
      companionName: "Aigis",
      tone: "차분하고 세련된 존댓말",
      rememberAutomatically: ["GPAO-T를 개발 중이다"],
      neverRemember: ["비밀 토큰"],
      durableMemoryApproved: true,
      heartbeatEnabled: true,
      heartbeatApproved: true,
    };

    const draft = buildRuntimeWorkspaceWelcomeDraft({ workspaceRoot: root, answers });
    assert.equal(draft.status, "ready");
    assert.equal(draft.preview.memory, "durable_initial_memory");

    assert.throws(() => applyRuntimeWorkspaceWelcomeSettings({
      workspaceRoot: root,
      answers,
      approvalToken: "wrong",
    }), /welcome_apply_token_required/);

    const applied = applyRuntimeWorkspaceWelcomeSettings({
      workspaceRoot: root,
      answers,
      approvalToken: "apply-gpao-t-welcome-settings",
    });
    assert.equal(applied.status, "applied");
    assert.equal(existsSync(join(root, "WELCOME-STATE.json")), true);
    assert.match(readFileSync(join(root, "IDENTITY.md"), "utf8"), /Companion Persona Name/);
    assert.match(
      readFileSync(join(root, "IDENTITY.md"), "utf8"),
      /Independent, local-first Growth Personal AI Operating System/,
    );
    assert.match(
      readFileSync(join(root, "SOUL.md"), "utf8"),
      /independent, local-first Growth Personal AI Operating System/,
    );
    assert.match(readFileSync(join(root, "MEMORY.md"), "utf8"), /GPAO-T를 개발 중이다/);
    assert.equal(verifyRuntimeWorkspaceWelcome({ workspaceRoot: root }).status, "ready");
  });

  it("blocks a personalized workspace that drops the independent product contract", async () => {
    const root = tempRoot();
    await seedWorkspace(root);
    await writeFile(join(root, "IDENTITY.md"), "nBeAI. GPAO-T\n");

    const verified = verifyRuntimeWorkspaceWelcome({ workspaceRoot: root });

    assert.equal(verified.status, "blocked");
    assert.ok(verified.findings.includes("identity_independent_product_contract_missing"));
  });

  it("does not inject a private default companion before personalization", async () => {
    const root = tempRoot();
    await seedWorkspace(root);

    const draft = buildRuntimeWorkspaceWelcomeDraft({
      workspaceRoot: root,
      answers: {
        userName: "Tester",
        userAddress: "Tester",
        tone: "clear and calm",
      },
    });

    assert.equal(draft.status, "blocked");
    assert.ok(draft.findings.includes("companion_name_missing"));
    assert.equal(draft.preview.identity.companionName, null);
    assert.doesNotMatch(JSON.stringify(draft), /Aigis/);
  });
});
