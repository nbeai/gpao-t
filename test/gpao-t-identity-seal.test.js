import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { auditGpaoTIdentitySeal } from "../tools/audit-gpao-t-identity-seal.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

test("active GPAO-T identity surfaces pass the independent product contract", async () => {
  const audit = await auditGpaoTIdentitySeal({
    repoRoot: REPO_ROOT,
    includeLive: false,
    includeCompleteSeal: false,
    legacyScanTargets: [],
  });

  assert.equal(audit.status, "ready");
  assert.deepEqual(audit.activeSurfaceHits, []);
});

test("identity audit preserves memory, T-cell, review, and supervised execution candidates", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "gpao-t-identity-clean-"));
  await writeFile(
    join(repoRoot, "active.md"),
    [
      "GPAO-T is an independent, local-first Growth Personal AI Operating System.",
      "OpenClaw reference class: third-party comparison and compatibility only.",
      "OpenClaw is a separate third-party comparison product and compatibility reference.",
      "memory candidate; T-cell candidate; review candidate; supervised execution candidate",
    ].join("\n"),
  );

  const audit = await auditGpaoTIdentitySeal({
    repoRoot,
    activeTargets: ["active.md"],
    legacyScanTargets: [],
    includeLive: false,
    includeCompleteSeal: false,
  });

  assert.equal(audit.status, "ready");
  assert.deepEqual(audit.activeSurfaceHits, []);
});

test("identity audit blocks OpenClaw substrate and release-maturity regressions", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "gpao-t-identity-blocked-"));
  await writeFile(
    join(repoRoot, "active.md"),
    [
      "Status: active test-team release candidate",
      "GPAO-T is an independent, local-first Growth Personal AI Operating System.",
      "OpenClaw reference class: third-party comparison and compatibility only.",
      "OpenClaw is GPAO-T's runtime substrate.",
    ].join("\n"),
  );

  const audit = await auditGpaoTIdentitySeal({
    repoRoot,
    activeTargets: ["active.md"],
    legacyScanTargets: [],
    includeLive: false,
    includeCompleteSeal: false,
  });
  const rules = new Set(audit.activeSurfaceHits.map((hit) => hit.rule));

  assert.equal(audit.status, "blocked");
  assert.ok(rules.has("test_team_maturity"));
  assert.ok(rules.has("release_candidate_maturity"));
  assert.ok(rules.has("candidate_document_status"));
  assert.ok(rules.has("openclaw_body_substrate_origin_en"));
});

test("identity audit requires explicit third-party classification for OpenClaw references", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "gpao-t-identity-unclassified-"));
  await writeFile(
    join(repoRoot, "active.md"),
    [
      "GPAO-T is an independent, local-first Growth Personal AI Operating System.",
      "OpenClaw integration remains available.",
    ].join("\n"),
  );

  const audit = await auditGpaoTIdentitySeal({
    repoRoot,
    activeTargets: ["active.md"],
    legacyScanTargets: [],
    includeLive: false,
    includeCompleteSeal: false,
  });

  assert.equal(audit.status, "blocked");
  assert.ok(
    audit.activeSurfaceHits.some((hit) => hit.rule === "openclaw_reference_class_missing_or_invalid"),
  );
});
