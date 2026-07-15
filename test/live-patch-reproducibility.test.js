import test from "node:test";
import assert from "node:assert/strict";

import { auditLivePatchReproducibility } from "../tools/audit-live-patch-reproducibility.mjs";

test("live patch reproducibility audit tracks every known live mutation family", async () => {
  const report = await auditLivePatchReproducibility();
  const ids = report.families.map((family) => family.id).sort();

  assert.equal(report.schema, "gpao_t.live_patch_reproducibility_audit.v0_1");
  assert.deepEqual(ids, [
    "conversation_ux",
    "gpao_bridge",
    "plugin_allowlist",
    "replay_evaluator",
    "runtime_identity_prompt",
    "runtime_namespace",
    "runtime_repair",
    "runtime_workspace",
    "standalone_namespace_rebuild",
    "surface_seal",
    "test_session_cleanup",
    "user_screen_ux",
  ]);
  assert.ok(["ready", "review", "blocked"].includes(report.status));
  assert.equal(report.families.every((family) => family.tools.length > 0), true);
  assert.equal(report.families.every((family) => family.readback.length > 0), true);
});

test("namespace migration family is recognized as structured and gated", async () => {
  const report = await auditLivePatchReproducibility();
  const namespace = report.families.find((family) => family.id === "runtime_namespace");

  assert.ok(namespace);
  assert.notEqual(namespace.status, "blocked");
  assert.equal(namespace.tools.some((tool) => tool.hasTokenGate), true);
  assert.equal(namespace.tools.some((tool) => tool.hasBackup), true);
  assert.equal(namespace.tools.some((tool) => tool.hasDryRun), true);
  assert.equal(namespace.evidence.some((item) => item.manifestCount > 0), true);
});

test("standalone namespace rebuild family is recognized as structured and gated", async () => {
  const report = await auditLivePatchReproducibility();
  const standalone = report.families.find((family) => family.id === "standalone_namespace_rebuild");

  assert.ok(standalone);
  assert.notEqual(standalone.status, "blocked");
  assert.equal(standalone.tools.some((tool) => tool.hasTokenGate), true);
  assert.equal(standalone.tools.some((tool) => tool.hasBackup), true);
  assert.equal(standalone.tools.some((tool) => tool.hasDryRun), true);
  assert.equal(standalone.evidence.some((item) => item.manifestCount > 0), true);
});
