import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditGpaoTCompleteSeal } from "../tools/audit-gpao-t-complete-seal.mjs";
import { auditGpaoTRuntimeNamespace } from "../tools/audit-gpao-t-runtime-namespace.mjs";

test("complete seal blocks a missing live control UI instead of reporting ready", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "gpao-t-audit-repo-"));
  const liveRoot = join(repoRoot, "missing-live-ui");

  const audit = await auditGpaoTCompleteSeal({ repoRoot, liveRoot });

  assert.equal(audit.status, "blocked");
  assert.equal(audit.liveRootReadable, false);
  assert.deepEqual(audit.auditErrors.map((error) => error.id), ["live_control_ui_missing"]);
});

test("complete seal distinguishes internal work-order provenance from a live identity leak", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "gpao-t-audit-repo-"));
  const liveRoot = await mkdtemp(join(tmpdir(), "gpao-t-audit-live-"));
  const releaseDir = join(repoRoot, "docs", "05-release");
  const assetsDir = join(liveRoot, "assets");
  await mkdir(releaseDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await writeFile(
    join(releaseDir, "GPAO-T-NEXT-CHAT-WORK-ORDER-2026-07-14.md"),
    "OpenClaw references must not appear on the normal user surface.\n",
  );
  await writeFile(join(assetsDir, "about-page.js"), "const title = 'Official OpenClaw dashboard';\n");
  await writeFile(
    join(assetsDir, "runtime.js"),
    "const source = 'clawhub'; const storage = 'openclaw.control.assistant.v1';\n",
  );

  const audit = await auditGpaoTCompleteSeal({ repoRoot, liveRoot });

  assert.equal(audit.status, "blocked");
  assert.equal(audit.userVisibleHits.length, 1);
  assert.equal(audit.userVisibleHits[0].target, "live-control-ui");
});

test("runtime namespace audit blocks an empty target", async () => {
  const liveRoot = await mkdtemp(join(tmpdir(), "gpao-t-empty-live-"));

  const audit = await auditGpaoTRuntimeNamespace({ liveRoot });

  assert.equal(audit.status, "audit_target_missing");
  assert.equal(audit.liveRootReadable, false);
  assert.equal(audit.scannedFileCount, 0);
});

test("runtime namespace audit accepts explicit GPAO-T mirrors for legacy keys", async () => {
  const liveRoot = await mkdtemp(join(tmpdir(), "gpao-t-mirrored-live-"));
  const assetsDir = join(liveRoot, "assets");
  await mkdir(assetsDir, { recursive: true });
  await writeFile(
    join(assetsDir, "chat.js"),
    "const current='gpao-t.control.assistant.v1'; const legacy='openclaw.control.assistant.v1';\n",
  );
  await writeFile(
    join(liveRoot, "index.html"),
    ".filter((key) => /^gpao-t-control-|^openclaw-control-/.test(key));\n",
  );

  const audit = await auditGpaoTRuntimeNamespace({ liveRoot });

  assert.equal(audit.status, "ready");
  assert.equal(audit.hitCount, 0);
  assert.equal(audit.preservedAliasCount, 2);
});
