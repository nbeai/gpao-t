import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  patchDashboardCacheBustHtml,
  runDashboardCacheBustHotfix,
} from "../tools/apply-live-dashboard-cache-bust-hotfix.mjs";
import {
  patchChatLayoutRecoveryHtml,
  runChatLayoutRecoveryHotfix,
} from "../tools/apply-live-chat-layout-recovery-hotfix.mjs";

const CACHE_TOOL = fileURLToPath(new URL("../tools/apply-live-dashboard-cache-bust-hotfix.mjs", import.meta.url));
const CHAT_TOOL = fileURLToPath(new URL("../tools/apply-live-chat-layout-recovery-hotfix.mjs", import.meta.url));

function fixtureRuntime(source) {
  const root = mkdtempSync(join(tmpdir(), "gpao-t-hotfix-"));
  const runtimeRoot = join(root, "compatibility", "gpao-t");
  const indexPath = join(runtimeRoot, "dist", "control-ui", "index.html");
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, source, "utf8");
  return {
    root,
    runtimeRoot,
    indexPath,
    evidenceRoot: join(root, "evidence"),
  };
}

it("gates the source-owned dashboard cache-bust hotfix with dry-run, token, backup, and receipt", async () => {
  const source = '<!doctype html><html><head><script type="module" crossorigin src="./assets/index-demo.js"></script></head></html>\n';
  const fixture = fixtureRuntime(source);
  const dryRun = await runDashboardCacheBustHotfix({
    runtimeRoot: fixture.runtimeRoot,
    evidenceRoot: fixture.evidenceRoot,
    now: new Date("2026-07-14T00:00:00.000Z"),
  });

  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.writesPerformed, false);
  assert.equal(readFileSync(fixture.indexPath, "utf8"), source);
  assert.equal(existsSync(fixture.evidenceRoot), false);
  await assert.rejects(
    runDashboardCacheBustHotfix({
      runtimeRoot: fixture.runtimeRoot,
      evidenceRoot: fixture.evidenceRoot,
      apply: true,
      approvalToken: "wrong",
    }),
    /apply requires --approval-token/,
  );

  const applied = await runDashboardCacheBustHotfix({
    runtimeRoot: fixture.runtimeRoot,
    evidenceRoot: fixture.evidenceRoot,
    apply: true,
    approvalToken: "apply-gpao-t-dashboard-cache-bust-hotfix",
    now: new Date("2026-07-14T00:01:00.000Z"),
  });
  const patched = readFileSync(fixture.indexPath, "utf8");

  assert.equal(applied.status, "applied");
  assert.equal(applied.writesPerformed, true);
  assert.match(patched, /index-demo\.js\?gpao_runtime_recovery=20260712T2135/);
  assert.equal(readFileSync(applied.backupPath, "utf8"), source);
  assert.equal(existsSync(applied.receiptPath), true);
  assert.equal(JSON.parse(readFileSync(applied.receiptPath, "utf8")).readbackSha256, applied.afterSha256);
  assert.equal(patchDashboardCacheBustHtml(patched), patched);
});

it("gates the source-owned chat layout hotfix with dry-run, token, backup, receipt, and idempotence", async () => {
  const source = "<!doctype html><html><head><title>GPAO-T</title></head><body></body></html>\n";
  const fixture = fixtureRuntime(source);
  const dryRun = await runChatLayoutRecoveryHotfix({
    runtimeRoot: fixture.runtimeRoot,
    evidenceRoot: fixture.evidenceRoot,
    now: new Date("2026-07-14T00:02:00.000Z"),
  });

  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.writesPerformed, false);
  assert.equal(readFileSync(fixture.indexPath, "utf8"), source);
  await assert.rejects(
    runChatLayoutRecoveryHotfix({
      runtimeRoot: fixture.runtimeRoot,
      evidenceRoot: fixture.evidenceRoot,
      apply: true,
      approvalToken: "wrong",
    }),
    /apply requires --approval-token/,
  );

  const applied = await runChatLayoutRecoveryHotfix({
    runtimeRoot: fixture.runtimeRoot,
    evidenceRoot: fixture.evidenceRoot,
    apply: true,
    approvalToken: "apply-gpao-t-chat-layout-recovery-hotfix",
    now: new Date("2026-07-14T00:03:00.000Z"),
  });
  const patched = readFileSync(fixture.indexPath, "utf8");

  assert.equal(applied.status, "applied");
  assert.equal(applied.writesPerformed, true);
  assert.match(patched, /data-gpao-t="gpao_t_chat_layout_recovery_v0_1"/);
  assert.equal(readFileSync(applied.backupPath, "utf8"), source);
  assert.equal(existsSync(applied.receiptPath), true);
  assert.equal(patchChatLayoutRecoveryHtml(patched), patched);
});

it("contains no globally installed OpenClaw default in either hotfix tool", () => {
  for (const source of [readFileSync(CACHE_TOOL, "utf8"), readFileSync(CHAT_TOOL, "utf8")]) {
    assert.doesNotMatch(source, /\.local\/node-[^\n]+node_modules\/openclaw/);
    assert.match(source, /\.gpao-t["'], "current", "compatibility", "gpao-t"/);
  }
});
