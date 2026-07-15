#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_RUNTIME_ROOT = process.env.GPAO_T_RUNTIME_ROOT || "/Users/jyp/.gpao-t/current/compatibility/gpao-t";
const DEFAULT_EVIDENCE_ROOT = process.env.GPAO_T_OUTBOUND_BOUNDARY_EVIDENCE_ROOT || join(REPO_ROOT, "docs", "03-verification", "evidence", "live-outbound-boundary");
export const OUTBOUND_BOUNDARY_APPLY_TOKEN = "apply-gpao-t-outbound-boundary-v1";

const MARKERS = {
  attribution: "gpao_t_outbound_provider_attribution_v1",
  clawhub: "gpao_t_outbound_clawhub_v1",
  clawrouter: "gpao_t_outbound_clawrouter_v1",
  apns: "gpao_t_outbound_apns_v1",
  push: "gpao_t_outbound_web_push_v1",
  docs: "gpao_t_outbound_docs_v1",
};
const UPDATE_MARKERS = ["gpao_t_update_boundary_startup_v0_1", "gpao_t_update_boundary_handlers_v0_1"];
const PROTECTED_FILES = ["package.json", "LICENSE", "THIRD_PARTY_NOTICES.md", "openclaw.mjs"];

function replaceOnce(source, needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`);
  return source.replace(needle, replacement);
}

export function patchProviderAttributionSource(source) {
  if (source.includes(MARKERS.attribution)) return source;
  let patched = replaceOnce(
    source,
    "\tconst attributionHeaders = attributionPolicy?.enabledByDefault ? attributionPolicy.headers : void 0;",
    `\tconst gpaoTAttributionBlocked = env.GPAO_T_RUNTIME === "1"; // ${MARKERS.attribution}\n\tconst attributionHeaders = gpaoTAttributionBlocked ? void 0 : attributionPolicy?.enabledByDefault ? attributionPolicy.headers : void 0;`,
    "provider attribution",
  );
  patched = replaceOnce(patched, "\t\tpolicy: attributionPolicy ?? policy,", "\t\tpolicy: gpaoTAttributionBlocked ? void 0 : attributionPolicy ?? policy,", "provider attribution policy");
  patched = replaceOnce(patched, "\t\tattributionProvider,", "\t\tattributionProvider: gpaoTAttributionBlocked ? void 0 : attributionProvider,", "provider attribution identity");
  patched = replaceOnce(patched, "\t\tallowsHiddenAttribution: attributionProvider !== void 0 && attributionPolicy?.verification === \"vendor-hidden-api-spec\",", "\t\tallowsHiddenAttribution: !gpaoTAttributionBlocked && attributionProvider !== void 0 && attributionPolicy?.verification === \"vendor-hidden-api-spec\",", "hidden attribution");
  return patched;
}

export function patchClawHubOutboundSource(source) {
  if (source.includes(MARKERS.clawhub)) return source;
  return replaceOnce(source, "async function clawhubRequest(params) {", `async function clawhubRequest(params) {\n\tif (process.env.GPAO_T_RUNTIME === "1") throw new Error("GPAO-T inherited extension-hub outbound is disabled"); // ${MARKERS.clawhub}`, "ClawHub request");
}

export function patchClawRouterOutboundSource(source) {
  if (source.includes(MARKERS.clawrouter)) return source;
  return replaceOnce(source, "\tregister(api) {", `\tregister(api) {\n\t\tif (process.env.GPAO_T_RUNTIME === "1") return; // ${MARKERS.clawrouter}`, "ClawRouter registration");
}

export function patchApnsOutboundSource(source) {
  if (source.includes(MARKERS.apns)) return source;
  let patched = replaceOnce(source, "async function sendApnsRelayRequest(params) {", `async function sendApnsRelayRequest(params) {\n\tif (process.env.GPAO_T_RUNTIME === "1") throw new Error("GPAO-T inherited APNs relay outbound is disabled"); // ${MARKERS.apns}`, "APNs relay");
  patched = replaceOnce(patched, "async function sendApnsRequest(params) {", "async function sendApnsRequest(params) {\n\tif (process.env.GPAO_T_RUNTIME === \"1\") throw new Error(\"GPAO-T inherited APNs outbound is disabled\");", "APNs direct");
  return patched;
}

export function patchPushOutboundSource(source) {
  if (source.includes(MARKERS.push)) return source;
  let patched = replaceOnce(source, "async function sendPreparedWebPushNotification(webPush, subscription, payload) {", `async function sendPreparedWebPushNotification(webPush, subscription, payload) {\n\tif (process.env.GPAO_T_RUNTIME === "1") throw new Error("GPAO-T inherited web-push outbound is disabled"); // ${MARKERS.push}`, "web push send");
  patched = replaceOnce(patched, "const pushHandlers = {", "const inheritedPushHandlers = {", "push handlers");
  patched = replaceOnce(patched, "//#endregion\nexport { pushHandlers };", "//#endregion\nconst pushHandlers = process.env.GPAO_T_RUNTIME === \"1\" ? {} : inheritedPushHandlers;\nexport { pushHandlers };", "push handler export");
  return patched;
}

export function patchDocsOutboundSource(source) {
  if (source.includes(MARKERS.docs)) return source;
  return replaceOnce(source, "async function docsSearchCommand(queryParts, runtime) {", `async function docsSearchCommand(queryParts, runtime) {\n\tif (process.env.GPAO_T_RUNTIME === "1") {\n\t\tconst query = queryParts.join(" ").trim();\n\t\truntime.log(query ? "GPAO-T hosted docs search is disabled; use bundled docs/." : "GPAO-T local help: bundled docs/."); // ${MARKERS.docs}\n\t\tif (query) runtime.exit(2);\n\t\treturn;\n\t}`, "docs command");
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function readTopLevelJs(distRoot) {
  const names = (await readdir(distRoot)).filter((name) => name.endsWith(".js")).sort();
  return await Promise.all(names.map(async (name) => ({ path: join(distRoot, name), source: await readFile(join(distRoot, name), "utf8") })));
}

function uniqueFile(files, predicate, label) {
  const matches = files.filter(({ source }) => predicate(source));
  if (matches.length !== 1) throw new Error(`${label}: expected one current-live-shape target, found ${matches.length}`);
  return matches[0];
}

export async function planGpaoTOutboundBoundary({ runtimeRoot = DEFAULT_RUNTIME_ROOT } = {}) {
  const root = resolve(runtimeRoot);
  const distRoot = join(root, "dist");
  const files = await readTopLevelJs(distRoot);
  for (const marker of UPDATE_MARKERS) uniqueFile(files, (source) => source.includes(marker), `existing updater boundary ${marker}`);

  const clawrouterPath = join(distRoot, "extensions", "clawrouter", "index.js");
  const targets = [
    ["provider-attribution", uniqueFile(files, (s) => s.includes("function listProviderAttributionPolicies") && s.includes("OPENCLAW_ATTRIBUTION_PRODUCT"), "provider attribution"), patchProviderAttributionSource],
    ["clawhub", uniqueFile(files, (s) => s.includes('const DEFAULT_CLAWHUB_URL = "https://clawhub.ai"') && s.includes("async function clawhubRequest(params)"), "ClawHub"), patchClawHubOutboundSource],
    ["apns", uniqueFile(files, (s) => s.includes("DEFAULT_APNS_RELAY_BASE_URL") && s.includes("async function sendApnsRequest(params)"), "APNs"), patchApnsOutboundSource],
    ["push", uniqueFile(files, (s) => s.includes("DEFAULT_VAPID_SUBJECT") && s.includes("const pushHandlers = {") || s.includes(MARKERS.push), "web push"), patchPushOutboundSource],
    ["docs", uniqueFile(files, (s) => s.includes('const SEARCH_API = "https://docs.openclaw.ai/api/search"') && s.includes("async function docsSearchCommand"), "docs"), patchDocsOutboundSource],
    ["clawrouter", { path: clawrouterPath, source: await readFile(clawrouterPath, "utf8") }, patchClawRouterOutboundSource],
  ];
  const protectedFiles = [];
  for (const relPath of PROTECTED_FILES) {
    const path = join(root, relPath);
    const source = await readFile(path);
    protectedFiles.push({ path, relativePath: relPath, sha256: sha256(source) });
  }
  const changes = targets.map(([kind, target, patcher]) => {
    const after = patcher(target.source);
    return { kind, path: target.path, relativePath: relative(root, target.path), before: target.source, after, changed: target.source !== after, beforeSha256: sha256(target.source), afterSha256: sha256(after) };
  }).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const patchId = sha256(changes.map((item) => `${item.relativePath}:${item.afterSha256}`).join("\n")).slice(0, 20);
  return { schema: "gpao_t.outbound_boundary_plan.v1", runtimeRoot: root, patchId, changes, protectedFiles };
}

async function atomicWrite(path, source) {
  const mode = (await stat(path)).mode & 0o777;
  const temporary = `${path}.gpao-t-outbound-boundary.tmp`;
  await writeFile(temporary, source, { mode });
  await rename(temporary, path);
}

export async function patchGpaoTOutboundBoundaryFiles({ runtimeRoot = DEFAULT_RUNTIME_ROOT, write = false, stagedDistribution = false, approvalToken = "", evidenceRoot = DEFAULT_EVIDENCE_ROOT } = {}) {
  if (write && !stagedDistribution && approvalToken !== OUTBOUND_BOUNDARY_APPLY_TOKEN) throw new Error(`apply requires --approval-token ${OUTBOUND_BOUNDARY_APPLY_TOKEN}`);
  const plan = await planGpaoTOutboundBoundary({ runtimeRoot });
  const changed = plan.changes.filter((item) => item.changed);
  const summary = { schema: "gpao_t.live_outbound_boundary_patch.v1", mode: write ? stagedDistribution ? "staged-apply" : "apply" : "dry-run", status: write ? changed.length ? "pending" : "already_applied" : "review", runtimeRoot: plan.runtimeRoot, patchId: plan.patchId, files: plan.changes.map(({ kind, relativePath, changed, beforeSha256, afterSha256 }) => ({ kind, path: relativePath, changed, beforeSha256, afterSha256 })), protectedFiles: plan.protectedFiles.map(({ relativePath, sha256: digest }) => ({ path: relativePath, sha256: digest, unchanged: true })) };
  if (!write || changed.length === 0) return summary;

  let evidenceDir = null;
  if (!stagedDistribution) {
    evidenceDir = join(resolve(evidenceRoot), `outbound-boundary-${plan.patchId}`);
    await mkdir(join(evidenceDir, "backups"), { recursive: true });
    for (const item of changed) {
      const backup = join(evidenceDir, "backups", item.relativePath);
      await mkdir(dirname(backup), { recursive: true });
      await copyFile(item.path, backup);
    }
    await writeFile(join(evidenceDir, "plan.json"), `${JSON.stringify({ ...summary, status: "prepared", evidenceDir }, null, 2)}\n`);
  }

  const written = [];
  try {
    for (const item of changed) {
      await atomicWrite(item.path, item.after);
      written.push(item);
    }
    for (const item of plan.protectedFiles) {
      if (sha256(await readFile(item.path)) !== item.sha256) throw new Error(`protected identifier changed: ${item.relativePath}`);
    }
  } catch (error) {
    for (const item of written.reverse()) await atomicWrite(item.path, item.before);
    throw error;
  }
  const report = { ...summary, status: stagedDistribution ? "staged_applied" : "applied", evidenceDir };
  if (evidenceDir) await writeFile(join(evidenceDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apply = process.argv.includes("--apply");
  patchGpaoTOutboundBoundaryFiles({ runtimeRoot: arg("--runtime-root", DEFAULT_RUNTIME_ROOT), write: apply, approvalToken: arg("--approval-token"), evidenceRoot: arg("--evidence-root", DEFAULT_EVIDENCE_ROOT) })
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exitCode = 1; });
}
