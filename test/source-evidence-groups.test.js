import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSourceEvidenceGroupAudit,
  classifyPath,
} from "../tools/audit-source-evidence-groups.mjs";

test("source evidence group classifier assigns product lanes", () => {
  assert.equal(classifyPath("src/core/gateway.js"), "runtime_kernel");
  assert.equal(classifyPath("tools/audit-live-patch-reproducibility.mjs"), "cli_tools_gateway");
  assert.equal(classifyPath("test/live-patch-reproducibility.test.js"), "tests");
  assert.equal(classifyPath("runtime-workspace/gpao-t/AGENTS.md"), "runtime_workspace_seed");
  assert.equal(classifyPath("docs/03-verification/evidence/CURRENT-GPAO-T-STATE-2026-07-12.md"), "curated_evidence");
  assert.equal(classifyPath("docs/03-verification/evidence/live-backups/example/manifest.json"), "generated_evidence");
});

test("source evidence group audit reports ready when every status entry is classified", () => {
  const report = buildSourceEvidenceGroupAudit({
    porcelain: [
      " M src/core/gateway.js",
      "?? tools/audit-source-evidence-groups.mjs",
      "?? docs/03-verification/evidence/GPAO-T-LIVE-CONVERSATION-QA-2026-07-12.md",
      "?? docs/03-verification/evidence/live-backups/example/manifest.json",
    ].join("\n"),
    repoRoot: "/tmp/gpao-t",
  });

  assert.equal(report.status, "ready");
  assert.equal(report.groupCounts.runtime_kernel, 1);
  assert.equal(report.groupCounts.cli_tools_gateway, 1);
  assert.equal(report.groupCounts.curated_evidence, 1);
  assert.equal(report.groupCounts.generated_evidence, 1);
});
