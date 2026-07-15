#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_RUNTIME_ROOT = process.env.GPAO_T_RUNTIME_ROOT
  || join(homedir(), ".gpao-t", "current", "compatibility", "gpao-t");
const DEFAULT_EVIDENCE_ROOT = process.env.GPAO_T_HOTFIX_EVIDENCE_ROOT
  || join(REPO_ROOT, "docs", "03-verification", "evidence", "live-dashboard-cache-bust-hotfix");
const APPLY_TOKEN = "apply-gpao-t-dashboard-cache-bust-hotfix";
const MARKER = "gpao_runtime_recovery=20260712T2135";

export function patchDashboardCacheBustHtml(source, { marker = MARKER } = {}) {
  const pattern = /(<script type="module" crossorigin src="\.\/assets\/index-[^"?]+\.js)(?:\?[^\"]*)?("><\/script>)/g;
  const matches = [...String(source || "").matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`dashboard cache-bust expected one main module script, found ${matches.length}`);
  }
  return String(source).replace(pattern, `$1?${marker}$2`);
}

export async function runDashboardCacheBustHotfix({
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT,
  apply = false,
  approvalToken = "",
  now = new Date(),
} = {}) {
  if (apply && approvalToken !== APPLY_TOKEN) {
    throw new Error(`apply requires --approval-token ${APPLY_TOKEN}`);
  }
  const ownedRuntimeRoot = assertGpaoTRuntimeRoot(runtimeRoot);
  const indexPath = join(ownedRuntimeRoot, "dist", "control-ui", "index.html");
  const before = await readFile(indexPath, "utf8");
  const after = patchDashboardCacheBustHtml(before);
  const changed = before !== after;
  const baseReport = {
    schema: "gpao_t.live_dashboard_cache_bust_hotfix.v2",
    generatedAt: now.toISOString(),
    mode: apply ? "apply" : "dry-run",
    status: apply ? "pending_apply" : "review",
    sourceRoot: REPO_ROOT,
    runtimeRoot: ownedRuntimeRoot,
    indexPath,
    marker: MARKER,
    changed,
    beforeSha256: sha256(before),
    afterSha256: sha256(after),
    approvalGate: apply ? "verified" : "not_requested",
    writesPerformed: false,
  };
  if (!apply) return baseReport;

  const evidenceDir = join(resolve(evidenceRoot), stamp(now));
  const backupPath = changed ? join(evidenceDir, "index.html.before") : null;
  const receiptPath = join(evidenceDir, "receipt.json");
  await mkdir(evidenceDir, { recursive: true });
  if (changed) {
    await copyFile(indexPath, backupPath);
    await chmod(backupPath, 0o600);
  }

  try {
    if (changed) await writeFile(indexPath, after);
    const readback = await readFile(indexPath, "utf8");
    if (sha256(readback) !== baseReport.afterSha256) {
      throw new Error("dashboard cache-bust readback hash mismatch");
    }
    const receipt = {
      ...baseReport,
      status: changed ? "applied" : "already_applied",
      writesPerformed: changed,
      backupPath,
      backupSha256: backupPath ? sha256(await readFile(backupPath, "utf8")) : null,
      readbackSha256: sha256(readback),
      receiptPath,
      rollback: backupPath ? `restore ${backupPath} to ${indexPath}` : "not_required_no_change",
    };
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    return receipt;
  } catch (error) {
    if (changed && backupPath) await copyFile(backupPath, indexPath);
    throw error;
  }
}

function assertGpaoTRuntimeRoot(runtimeRoot) {
  const resolvedRoot = resolve(runtimeRoot || DEFAULT_RUNTIME_ROOT);
  if (basename(resolvedRoot) !== "gpao-t" || basename(dirname(resolvedRoot)) !== "compatibility") {
    throw new Error("runtime root must use the GPAO-T compatibility/gpao-t layout");
  }
  if (resolvedRoot.includes(`${join("node_modules", "openclaw")}`)) {
    throw new Error("globally installed OpenClaw runtime targets are forbidden");
  }
  return resolvedRoot;
}

function parseArgs(argv) {
  const args = {
    runtimeRoot: DEFAULT_RUNTIME_ROOT,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    apply: false,
    approvalToken: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--runtime-root") args.runtimeRoot = argv[++index] || "";
    else if (arg === "--evidence-root") args.evidenceRoot = argv[++index] || "";
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--approval-token") args.approvalToken = argv[++index] || "";
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const report = await runDashboardCacheBustHotfix(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
