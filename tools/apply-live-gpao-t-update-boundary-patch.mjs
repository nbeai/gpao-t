#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_RUNTIME_ROOT =
  process.env.GPAO_T_RUNTIME_ROOT || "/Users/jyp/.gpao-t/current/compatibility/gpao-t";
const DEFAULT_LAUNCHER =
  process.env.GPAO_T_LAUNCHER || "/Users/jyp/.gpao-t/current/gpao-t.mjs";
const DEFAULT_EVIDENCE_ROOT =
  process.env.GPAO_T_UPDATE_BOUNDARY_EVIDENCE_ROOT ||
  join(REPO_ROOT, "docs", "03-verification", "evidence", "live-update-boundary");
const APPLY_TOKEN = "apply-gpao-t-update-boundary";

const STARTUP_MARKER = "gpao_t_update_boundary_startup_v0_1";
const HANDLERS_MARKER = "gpao_t_update_boundary_handlers_v0_1";
const LAUNCHER_MARKER = "gpao_t_update_boundary_launcher_v0_1";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function replaceExactlyOnce(source, needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`);
  return source.replace(needle, replacement);
}

export function patchCompatibilityUpdateStartupSource(source) {
  if (source.includes(STARTUP_MARKER)) return source;
  if (!source.includes("createDeferredGatewayUpdateCheck")) {
    throw new Error("update startup: deferred update check function not found");
  }
  return replaceExactlyOnce(
    source,
    "\tconst start = () => {\n\t\tif (started || stopped) return;",
    `\tconst start = () => {\n\t\tif (process.env.GPAO_T_RUNTIME === "1") return; // ${STARTUP_MARKER}\n\t\tif (started || stopped) return;`,
    "update startup",
  );
}

export function patchCompatibilityUpdateHandlersSource(source) {
  if (source.includes(HANDLERS_MARKER)) return source;
  let patched = replaceExactlyOnce(
    source,
    '\t\tif (!assertValidParams(params, validateUpdateStatusParams, "update.status", respond)) return;',
    `\t\tif (!assertValidParams(params, validateUpdateStatusParams, "update.status", respond)) return;\n\t\tif (process.env.GPAO_T_RUNTIME === "1") {\n\t\t\tconst feedConfigured = Boolean(process.env.GPAO_T_UPDATE_FEED_URL?.trim());\n\t\t\trespond(true, { sentinel: null, gpaoTUpdate: { schema: "gpao_t.update_boundary.v1", product: "GPAO-T", currentVersion: "0.1.0", mode: "gpao_t_managed", status: feedConfigured ? "configured_inactive" : "disabled", updateAvailable: null, compatibilityUpdaterAllowed: false, reason: feedConfigured ? "gpao_t_update_service_not_activated" : "gpao_t_update_feed_not_configured" } }, void 0); // ${HANDLERS_MARKER}\n\t\t\treturn;\n\t\t}`,
    "update.status handler",
  );
  patched = replaceExactlyOnce(
    patched,
    '\t\tif (!assertValidParams(params, validateUpdateRunParams, "update.run", respond)) return;',
    `\t\tif (!assertValidParams(params, validateUpdateRunParams, "update.run", respond)) return;\n\t\tif (process.env.GPAO_T_RUNTIME === "1") {\n\t\t\tconst feedConfigured = Boolean(process.env.GPAO_T_UPDATE_FEED_URL?.trim());\n\t\t\trespond(true, { ok: false, result: { status: "skipped", mode: "gpao_t_managed", reason: feedConfigured ? "gpao_t_update_service_not_activated" : "gpao_t_update_feed_not_configured", steps: [], durationMs: 0 }, restart: null, sentinel: { persisted: false, payload: null } }, void 0);\n\t\t\treturn;\n\t\t}`,
    "update.run handler",
  );
  return patched;
}

export function patchGpaoTLauncherSource(source) {
  if (source.includes(LAUNCHER_MARKER)) return source;
  const anchor = "const child = spawn(process.execPath";
  if (!source.includes(anchor)) throw new Error("GPAO-T launcher: child process anchor not found");
  const block = `// ${LAUNCHER_MARKER}\nif (process.argv[2] === "update") {\n  const feedConfigured = Boolean(process.env.GPAO_T_UPDATE_FEED_URL?.trim());\n  const statusOnly = process.argv[3] === "status" || process.argv.includes("--json");\n  const payload = { schema: "gpao_t.update_boundary.v1", product: "GPAO-T", currentVersion: "0.1.0", mode: "gpao_t_managed", status: feedConfigured ? "configured_inactive" : "disabled", updateAvailable: null, compatibilityUpdaterAllowed: false, reason: feedConfigured ? "gpao_t_update_service_not_activated" : "gpao_t_update_feed_not_configured" };\n  const output = JSON.stringify(payload, null, 2);\n  if (statusOnly) console.log(output);\n  else console.error(output);\n  process.exit(statusOnly ? 0 : 2);\n}\n`;
  return source.replace(anchor, `${block}${anchor}`);
}

async function findTargetFiles(runtimeRoot) {
  const distRoot = join(runtimeRoot, "dist");
  const names = await readdir(distRoot);
  let startupFile = null;
  let handlersFile = null;
  for (const name of names.filter((entry) => entry.endsWith(".js"))) {
    const path = join(distRoot, name);
    const source = await readFile(path, "utf8");
    if (source.includes("createDeferredGatewayUpdateCheck")) startupFile = path;
    if (source.includes('const updateHandlers = {') && source.includes('"update.run"')) {
      handlersFile = path;
    }
  }
  if (!startupFile || !handlersFile) {
    throw new Error(`update boundary targets missing: startup=${startupFile} handlers=${handlersFile}`);
  }
  return { startupFile, handlersFile };
}

export async function patchGpaoTUpdateBoundaryFiles({
  runtimeRoot,
  launcher = null,
  write = false,
} = {}) {
  const resolvedRuntimeRoot = resolve(runtimeRoot || DEFAULT_RUNTIME_ROOT);
  const targets = await findTargetFiles(resolvedRuntimeRoot);
  const jobs = [
    [targets.startupFile, patchCompatibilityUpdateStartupSource, "startup"],
    [targets.handlersFile, patchCompatibilityUpdateHandlersSource, "handlers"],
  ];
  if (launcher) jobs.push([resolve(launcher), patchGpaoTLauncherSource, "launcher"]);
  const results = [];
  for (const [path, patcher, kind] of jobs) {
    const before = await readFile(path, "utf8");
    const after = patcher(before);
    if (write && before !== after) await writeFile(path, after);
    results.push({ path, kind, changed: before !== after, before, after });
  }
  return results;
}

async function main() {
  const runtimeRoot = resolve(readArg("--runtime-root", DEFAULT_RUNTIME_ROOT));
  const launcher = resolve(readArg("--launcher", DEFAULT_LAUNCHER));
  const apply = hasArg("--apply");
  const approvalToken = readArg("--approval-token", "");
  if (apply && approvalToken !== APPLY_TOKEN) {
    throw new Error(`apply requires --approval-token ${APPLY_TOKEN}`);
  }
  const results = await patchGpaoTUpdateBoundaryFiles({ runtimeRoot, launcher, write: false });
  const report = {
    schema: "gpao_t.live_update_boundary_patch.v1",
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    runtimeRoot,
    launcher,
    status: apply ? "pending_apply" : "review",
    files: results.map(({ path, kind, changed }) => ({ path, kind, changed })),
  };
  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const evidenceDir = join(DEFAULT_EVIDENCE_ROOT, stamp());
  await mkdir(evidenceDir, { recursive: true });
  for (const result of results) {
    if (!result.changed) continue;
    const backupPath = join(evidenceDir, `${basename(result.path)}.before-update-boundary`);
    await copyFile(result.path, backupPath);
    await writeFile(result.path, result.after);
  }
  const finalReport = { ...report, status: "applied", evidenceDir };
  await writeFile(join(evidenceDir, "report.json"), `${JSON.stringify(finalReport, null, 2)}\n`);
  console.log(JSON.stringify(finalReport, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
