#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

const FAMILIES = [
  {
    id: "gpao_bridge",
    label: "GPAO-T live bridge",
    tools: [
      "tools/apply-openclaw-live-gpao-bridge-patch.mjs",
      "tools/preview-openclaw-live-gpao-bridge-patch.mjs",
    ],
    evidenceDirs: [
      "docs/03-verification/evidence/live-backups",
      "docs/03-verification/evidence/live-hook-preview",
      "docs/03-verification/evidence/live-patch-stage",
    ],
    readback: ["node bin/gpao-t.js openclaw live-turn-hook-readiness-check"],
    rollback: "backup_manifest_restore",
  },
  {
    id: "surface_seal",
    label: "GPAO-T surface seal",
    tools: ["tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-surface-seal-patch"],
    readback: ["npm run seal:routes", "npm run check"],
    rollback: "backup_manifest_restore",
  },
  {
    id: "user_screen_ux",
    label: "GPAO-T user-screen UX",
    tools: ["tools/apply-openclaw-live-user-screen-ux-patch.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-user-screen-ux-patch"],
    readback: ["Safari DOM readback", "npm run seal:routes", "npm run check"],
    rollback: "backup_folder_restore",
  },
  {
    id: "conversation_ux",
    label: "GPAO-T conversation UX",
    tools: ["tools/apply-openclaw-live-conversation-ux-patch.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-conversation-ux-patch"],
    readback: ["npm run qa:conversation-ux", "npm run qa:conversation"],
    rollback: "backup_folder_restore",
  },
  {
    id: "runtime_workspace",
    label: "GPAO-T runtime workspace pack",
    tools: ["tools/apply-gpao-t-runtime-workspace-pack.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/runtime-workspace-absorption-2026-07-12"],
    readback: ["node tools/apply-gpao-t-runtime-workspace-pack.mjs"],
    rollback: "backup_folder_restore",
  },
  {
    id: "runtime_identity_prompt",
    label: "GPAO-T runtime identity prompt",
    tools: ["tools/apply-live-gpao-t-runtime-identity-prompt-patch.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-runtime-identity-prompt-patch"],
    readback: ["fresh live chat trajectory prompt identity", "npm run seal:identity"],
    rollback: "backup_folder_restore",
  },
  {
    id: "replay_evaluator",
    label: "GPAO-T replay evaluator",
    tools: ["tools/apply-live-gpao-t-replay-evaluator-patch.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-replay-evaluator-patch"],
    readback: ["fresh live replay evaluation explicit marker signal", "npm test"],
    rollback: "backup_folder_restore",
  },
  {
    id: "runtime_repair",
    label: "GPAO-T live runtime repair",
    tools: [
      "tools/repair-live-gpao-t-runtime.mjs",
      "tools/rollback-live-gpao-t-runtime-repair.mjs",
    ],
    evidenceDirs: ["docs/03-verification/evidence/live-runtime-repair-overlays"],
    readback: ["node tools/repair-live-gpao-t-runtime.mjs"],
    rollback: "tokened_rollback_tool",
  },
  {
    id: "plugin_allowlist",
    label: "GPAO-T plugin allowlist",
    tools: ["tools/fix-live-gpao-t-plugin-allowlist.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-plugin-allowlist"],
    readback: ["openclaw gateway call health --json", "npm run qa:conversation"],
    rollback: "config_backup_restore",
  },
  {
    id: "test_session_cleanup",
    label: "GPAO-T live test-session cleanup",
    tools: ["tools/cleanup-live-gpao-t-test-sessions.mjs"],
    evidenceDirs: ["docs/03-verification/evidence/live-test-session-cleanup"],
    readback: ["node tools/cleanup-live-gpao-t-test-sessions.mjs"],
    rollback: "session_index_backup_restore",
  },
  {
    id: "runtime_namespace",
    label: "GPAO-T runtime namespace stage-one",
    tools: [
      "tools/migrate-gpao-t-runtime-namespace.mjs",
      "tools/audit-gpao-t-runtime-namespace.mjs",
    ],
    evidenceDirs: ["docs/03-verification/evidence/live-namespace-migration"],
    readback: ["npm run seal:namespace"],
    rollback: "backup_manifest_restore",
  },
  {
    id: "standalone_namespace_rebuild",
    label: "GPAO-T standalone namespace rebuild",
    tools: [
      "tools/rebuild-gpao-t-standalone-namespace.mjs",
      "tools/audit-gpao-t-runtime-namespace.mjs",
    ],
    evidenceDirs: ["docs/03-verification/evidence/live-standalone-namespace-rebuild"],
    readback: ["npm run seal:namespace", "npm run seal:routes", "npm run seal:final"],
    rollback: "backup_manifest_restore",
  },
];

const OUTBOUND_BOUNDARY = {
  id: "outbound_boundary",
  label: "GPAO-T inherited outbound boundary",
  tools: ["tools/apply-live-gpao-t-outbound-boundary-patch.mjs"],
  evidenceDirs: ["docs/03-verification/evidence/live-outbound-boundary"],
  readback: ["npm run check:outbound-boundary"],
  rollback: "content_addressed_backup_restore",
};

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

async function inspectTool(repoRoot, relPath) {
  const path = join(repoRoot, relPath);
  const source = await readFile(path, "utf8").catch(() => "");
  return {
    path: relPath,
    exists: Boolean(source),
    hasApplyGate: /--apply|apply\b/.test(source),
    hasTokenGate: /APPLY_TOKEN|REQUIRED_TOKEN|REQUIRED_APPROVAL_TOKEN|approval-token|--token/.test(source),
    hasBackup: /backup|copyFile|cp\(/.test(source),
    hasManifestWrite: /manifest\.json|writeFile\(join\([^)]*manifest/i.test(source),
    hasDryRun: /dry_run|dry-run|--no-write|apply \?/.test(source),
  };
}

async function inspectEvidence(repoRoot, relDir) {
  const path = join(repoRoot, relDir);
  const exists = existsSync(path);
  const files = exists ? await listFiles(path) : [];
  const manifestCount = files.filter((file) => file.endsWith("manifest.json")).length;
  const summaryCount = files.filter((file) => /\.(md|json)$/.test(file)).length;
  const structuredReceiptCount = files.filter((file) => /(?:manifest|receipt|result|plan|summary|audit).*\.json$/.test(file)).length;
  return {
    path: relDir,
    exists,
    fileCount: files.length,
    manifestCount,
    summaryCount,
    structuredReceiptCount,
  };
}

function familyStatus({ tools, evidence }) {
  const missingTools = tools.filter((tool) => !tool.exists);
  if (missingTools.length) return "blocked";

  const hasTokenGate = tools.some((tool) => tool.hasTokenGate);
  const hasBackup = tools.some((tool) => tool.hasBackup);
  const hasDryRun = tools.some((tool) => tool.hasDryRun);
  const hasStructuredReceipt =
    tools.some((tool) => tool.hasManifestWrite)
    || evidence.some((item) => item.manifestCount > 0 || item.structuredReceiptCount > 0);
  const hasEvidence = evidence.some((item) => item.exists && item.fileCount > 0);

  if (hasTokenGate && hasBackup && hasDryRun && hasStructuredReceipt && hasEvidence) return "ready";
  if (hasTokenGate && hasBackup && hasEvidence) return "review";
  return "blocked";
}

function familyFindings({ status, tools, evidence }) {
  const findings = [];
  for (const tool of tools) {
    if (!tool.exists) findings.push(`missing_tool:${tool.path}`);
  }
  if (!tools.some((tool) => tool.hasTokenGate)) findings.push("token_gate_not_detected");
  if (!tools.some((tool) => tool.hasBackup)) findings.push("backup_path_not_detected");
  if (!tools.some((tool) => tool.hasDryRun)) findings.push("dry_run_path_not_detected");
  if (
    !tools.some((tool) => tool.hasManifestWrite)
    && !evidence.some((item) => item.manifestCount > 0 || item.structuredReceiptCount > 0)
  ) {
    findings.push("manifest_or_structured_receipt_missing");
  }
  if (!evidence.some((item) => item.exists && item.fileCount > 0)) findings.push("evidence_payload_missing");
  if (status === "review" && findings.length === 0) findings.push("manual_review_required");
  return findings;
}

export async function auditLivePatchReproducibility({ repoRoot = REPO_ROOT } = {}) {
  const families = [];
  for (const family of FAMILIES) {
    const tools = [];
    for (const tool of family.tools) tools.push(await inspectTool(repoRoot, tool));
    const evidence = [];
    for (const dir of family.evidenceDirs) evidence.push(await inspectEvidence(repoRoot, dir));
    const status = familyStatus({ tools, evidence });
    families.push({
      id: family.id,
      label: family.label,
      status,
      tools,
      evidence,
      readback: family.readback,
      rollback: family.rollback,
      findings: familyFindings({ status, tools, evidence }),
    });
  }

  const counts = families.reduce((acc, family) => {
    acc[family.status] = (acc[family.status] || 0) + 1;
    return acc;
  }, {});
  const blocked = families.filter((family) => family.status === "blocked");
  const review = families.filter((family) => family.status === "review");
  const outboundTools = [];
  for (const tool of OUTBOUND_BOUNDARY.tools) outboundTools.push(await inspectTool(repoRoot, tool));
  const outboundEvidence = [];
  for (const dir of OUTBOUND_BOUNDARY.evidenceDirs) outboundEvidence.push(await inspectEvidence(repoRoot, dir));
  const outboundStatus = familyStatus({ tools: outboundTools, evidence: outboundEvidence });
  const outboundBoundary = {
    ...OUTBOUND_BOUNDARY,
    status: outboundStatus,
    tools: outboundTools,
    evidence: outboundEvidence,
    findings: familyFindings({ status: outboundStatus, tools: outboundTools, evidence: outboundEvidence }),
  };
  return {
    schema: "gpao_t.live_patch_reproducibility_audit.v0_1",
    generatedAt: new Date().toISOString(),
    repoRoot,
    status: blocked.length ? "blocked" : review.length ? "review" : "ready",
    counts,
    families,
    outboundBoundary,
    completionRule:
      "ready requires every live mutation family to have a source tool, token/dry-run gate, backup or rollback evidence, structured manifest or receipt, and readback command.",
  };
}

async function main() {
  const repoRoot = readArg("--repo-root", REPO_ROOT);
  const out = readArg("--out", "");
  const report = await auditLivePatchReproducibility({ repoRoot });
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
