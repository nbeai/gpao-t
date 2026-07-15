#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MANIFEST_NAME,
  RUNTIME_SOURCE_TOP_LEVEL,
  collectTree,
  createZipArchive,
  treeDigest,
  verifyDistributionManifest,
  verifyFreshRuntimeStage,
} from "./gpao-t-production-distribution-seal.mjs";
import {
  patchSurfaceFile,
} from "./apply-openclaw-live-gpao-t-surface-seal-patch.mjs";
import {
  patchChatPageSource,
  patchControlUiCssSource,
  patchControlUiIndexHtmlSource,
  patchNodesPageSource,
  stripControlUiInjectedScripts,
} from "./apply-openclaw-live-user-screen-ux-patch.mjs";
import {
  patchRuntimeIdentityPromptFiles,
} from "./apply-live-gpao-t-runtime-identity-prompt-patch.mjs";
import {
  patchReplayEvaluatorFiles,
} from "./apply-live-gpao-t-replay-evaluator-patch.mjs";
import {
  patchGpaoTUpdateBoundaryFiles,
} from "./apply-live-gpao-t-update-boundary-patch.mjs";
import {
  patchGpaoTOutboundBoundaryFiles,
} from "./apply-live-gpao-t-outbound-boundary-patch.mjs";
import {
  applyModelConnectionSettingsRoutePatch,
} from "./apply-live-model-connection-settings-route-patch.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_SOURCE_BUILD = resolve(
  process.env.GPAO_T_RUNTIME_SOURCE_BUILD ||
  join(homedir(), ".gpao-t", "current", "compatibility", "gpao-t"),
);
const VERSION = GPAO_T_RELEASE_CONTRACT.version;

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function copyStageEntry(sourceBuild, runtimeStage, entry) {
  await cp(join(sourceBuild, entry), join(runtimeStage, entry), {
    recursive: true,
    verbatimSymlinks: true,
  });
}

export async function prepareFreshRuntimeStage({ sourceBuild, runtimeStage }) {
  await rm(runtimeStage, { recursive: true, force: true });
  await mkdir(runtimeStage, { recursive: true });
  for (const entry of RUNTIME_SOURCE_TOP_LEVEL) {
    await copyStageEntry(sourceBuild, runtimeStage, entry);
  }
  await copyStageEntry(sourceBuild, runtimeStage, "node_modules");
  return runtimeStage;
}

function rootPackage(compatibilityPackage) {
  return {
    name: "gpao-t",
    version: VERSION,
    description: "nBeAI. GPAO-T self-growing personal AI operating system",
    type: "module",
    license: "MIT",
    author: "윤 (@aigis0927)",
    bin: { "gpao-t": "gpao-t.mjs" },
    engines: compatibilityPackage.engines ?? { node: ">=22.12.0" },
    scripts: {
      start: "node gpao-t.mjs gateway run",
      doctor: "node gpao-t.mjs doctor",
      status: "node gpao-t.mjs status",
    },
    gpaoT: {
      product: "nBeAI. GPAO-T",
      productId: GPAO_T_RELEASE_CONTRACT.productId,
      distributionChannel: GPAO_T_RELEASE_CONTRACT.distributionChannel,
      intendedAudience: GPAO_T_RELEASE_CONTRACT.intendedAudience,
      stateHome: "~/.gpao-t",
      configPath: "~/.gpao-t/gpao-t.json",
      compatibilitySubstrate: {
        engine: "isolated-runtime-compatibility-layer",
        version: compatibilityPackage.version,
        path: "compatibility/gpao-t",
      },
    },
  };
}

const wrapper = `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "${VERSION}";
const PRODUCT_ID = "${GPAO_T_RELEASE_CONTRACT.productId}";
const DEFAULT_UPDATE_FEED_URL = "https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json";

function gpaoOutput(value) {
  return value
    .replaceAll("https://docs.openclaw.ai/", "GPAO-T 로컬 도움말/")
    .replaceAll("ClawHub", "GPAO-T Hub")
    .replaceAll("OpenClaw", "GPAO-T")
    .replaceAll("OPENCLAW_", "GPAO_T_")
    .replaceAll("openclaw", "gpao-t");
}

const stateDir = process.env.GPAO_T_STATE_DIR?.trim() || join(homedir(), ".gpao-t");
const configPath = process.env.GPAO_T_CONFIG_PATH?.trim() || join(stateDir, "gpao-t.json");
process.env.GPAO_T_STATE_DIR = stateDir;
process.env.GPAO_T_CONFIG_PATH = configPath;
process.env.OPENCLAW_STATE_DIR ??= stateDir;
process.env.OPENCLAW_CONFIG_PATH ??= configPath;
if (process.env.GPAO_T_GATEWAY_TOKEN && !process.env.OPENCLAW_GATEWAY_TOKEN) {
  process.env.OPENCLAW_GATEWAY_TOKEN = process.env.GPAO_T_GATEWAY_TOKEN;
}
if (process.env.GPAO_T_GATEWAY_PASSWORD && !process.env.OPENCLAW_GATEWAY_PASSWORD) {
  process.env.OPENCLAW_GATEWAY_PASSWORD = process.env.GPAO_T_GATEWAY_PASSWORD;
}
process.env.GPAO_T_RUNTIME = "1";
const launcher = fileURLToPath(new URL("./compatibility/gpao-t/openclaw.mjs", import.meta.url));

async function pathExists(pathname) {
  try {
    await fs.stat(pathname);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(pathname, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(pathname, "utf8"));
  } catch {
    return fallback;
  }
}

function parseDateVersion(version) {
  const match = String(version || "").match(/^(\\d{4})\\.(\\d{2})\\.(\\d{2})-r(\\d+)$/u);
  return match ? match.slice(1).map((part) => Number(part)) : null;
}

function compareDateVersions(left, right) {
  const a = parseDateVersion(left);
  const b = parseDateVersion(right);
  if (!a || !b) throw new Error(\`Unsupported GPAO-T version comparison: \${left} vs \${right}\`);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function resolveFeedUrl(config) {
  const candidates = [
    process.env.GPAO_T_UPDATE_FEED_URL,
    process.env.GPAO_T_GITHUB_UPDATE_FEED_URL,
    config?.update?.feedUrl,
    DEFAULT_UPDATE_FEED_URL,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const url = new URL(candidate.trim());
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Try the next configured source.
    }
  }
  return null;
}

function fetchBuffer(url, { timeoutMs = 120_000, redirectLimit = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(parsed, { timeout: timeoutMs }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location && redirectLimit > 0) {
        response.resume();
        const next = new URL(location, parsed).toString();
        fetchBuffer(next, { timeoutMs, redirectLimit: redirectLimit - 1 }).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(\`HTTP \${status}\`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.once("end", () => resolve(Buffer.concat(chunks)));
    });
    request.once("timeout", () => request.destroy(new Error("request timed out")));
    request.once("error", reject);
  });
}

async function fetchJson(url) {
  try {
    return JSON.parse((await fetchBuffer(url, { timeoutMs: 30_000 })).toString("utf8"));
  } catch (error) {
    throw new Error(\`Update feed request failed: \${error.message}\`);
  }
}

function verifyUpdateFeed(feed) {
  const findings = [];
  if (!feed || typeof feed !== "object") findings.push("feed_not_object");
  if (feed?.schema !== "gpao_t.github_update_feed.v1") findings.push("schema_mismatch");
  if (feed?.productId !== PRODUCT_ID) findings.push("product_id_mismatch");
  if (!parseDateVersion(feed?.version)) findings.push("version_not_date_release");
  const assets = Array.isArray(feed?.assets) ? feed.assets.filter((asset) => {
    return asset
      && typeof asset.url === "string"
      && /^https?:\\/\\//u.test(asset.url)
      && typeof asset.sha256 === "string"
      && /^[a-f0-9]{64}$/u.test(asset.sha256)
      && typeof asset.name === "string"
      && typeof asset.kind === "string";
  }) : [];
  if (!assets.some((asset) => asset.kind === "production_distribution")) findings.push("missing_distribution_asset");
  if (!assets.some((asset) => asset.kind === "macos_installer")) findings.push("missing_macos_installer_asset");
  return { ok: findings.length === 0, findings, assets };
}

function selectUpdateCandidate(feed) {
  const verification = verifyUpdateFeed(feed);
  if (!verification.ok) {
    return { status: "invalid_feed", updateAvailable: false, reason: verification.findings[0], verification };
  }
  const comparison = compareDateVersions(feed.version, VERSION);
  if (comparison <= 0) {
    return {
      status: "current",
      updateAvailable: false,
      currentVersion: VERSION,
      latestVersion: feed.version,
      verification,
    };
  }
  return {
    status: "update_available",
    updateAvailable: true,
    currentVersion: VERSION,
    latestVersion: feed.version,
    releasePageUrl: feed.releasePageUrl || null,
    assets: verification.assets,
    verification,
  };
}

async function sha256File(pathname) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(pathname);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", resolve);
  });
  return hash.digest("hex");
}

async function downloadFile(url, destination) {
  await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  try {
    await fs.writeFile(destination, await fetchBuffer(url, { timeoutMs: 120_000 }), { mode: 0o600 });
  } catch (error) {
    throw new Error(\`Update asset download failed: \${error.message}\`);
  }
}

function runCommand(command, args, { timeoutMs = 300_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, code: 1, stdout, stderr: error.message });
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code: code ?? 1, stdout, stderr });
    });
  });
}

async function verifyDistributionRoot(releaseRoot, expectedVersion) {
  const manifest = await readJsonFile(join(releaseRoot, "GPAO-T-DISTRIBUTION-MANIFEST.json"));
  if (!manifest || manifest.schema !== "gpao_t.distribution_manifest.v2") {
    throw new Error("Downloaded release is missing a valid GPAO-T distribution manifest");
  }
  if (manifest.version !== expectedVersion) {
    throw new Error(\`Downloaded release version mismatch: expected \${expectedVersion}, got \${manifest.version}\`);
  }
  if (manifest.productId !== PRODUCT_ID) throw new Error("Downloaded release product id mismatch");
  if (!await pathExists(join(releaseRoot, "gpao-t.mjs"))) throw new Error("Downloaded release is missing gpao-t.mjs");
  return manifest;
}

async function acquireUpdateLock() {
  const lockPath = join(stateDir, ".update-lock");
  await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
  try {
    await fs.mkdir(lockPath, { mode: 0o700 });
    await fs.writeFile(
      join(lockPath, "owner.json"),
      JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2),
      { mode: 0o600 },
    );
    return lockPath;
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(\`Another GPAO-T update is already running: \${lockPath}\`);
    throw error;
  }
}

async function pointCurrent(releaseDest) {
  const currentLink = join(stateDir, "current");
  const temporary = \`\${currentLink}.\${process.pid}.\${randomBytes(4).toString("hex")}.tmp\`;
  await fs.rm(temporary, { recursive: true, force: true });
  await fs.symlink(releaseDest, temporary);
  await fs.rename(temporary, currentLink);
}

async function writeUpdateReceipt(receipt) {
  const receiptsRoot = join(stateDir, "receipts");
  await fs.mkdir(receiptsRoot, { recursive: true, mode: 0o700 });
  const receiptPath = join(receiptsRoot, \`\${receipt.id}.json\`);
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\\n", { mode: 0o600 });
  return receiptPath;
}

async function updateStatus({ json = false } = {}) {
  const config = await readJsonFile(configPath, {});
  const feedUrl = resolveFeedUrl(config);
  const boundary = {
    schema: "gpao_t.update_boundary.v1",
    product: "GPAO-T",
    currentVersion: VERSION,
    mode: "gpao_t_managed",
    enabled: Boolean(feedUrl),
    feedUrl,
    compatibilityUpdaterAllowed: false,
  };
  let result = { ...boundary, status: feedUrl ? "configured_ready" : "disabled", updateAvailable: null };
  if (feedUrl) {
    try {
      const feed = await fetchJson(feedUrl);
      result = { ...boundary, ...selectUpdateCandidate(feed) };
    } catch (error) {
      result = { ...boundary, status: "feed_unreachable", updateAvailable: null, reason: error.message };
    }
  }
  console.log(json ? JSON.stringify(result, null, 2) : gpaoOutput(JSON.stringify(result, null, 2)));
  return result;
}

async function applyUpdate() {
  const accepted = process.argv.includes("--yes") || process.argv.includes("--apply");
  if (!accepted) {
    throw new Error("GPAO-T update apply requires --yes after reviewing update status.");
  }
  const status = await updateStatus({ json: true });
  if (!status.updateAvailable) {
    const skipped = { status: "skipped", reason: status.reason || status.status, currentVersion: VERSION };
    console.log(JSON.stringify(skipped, null, 2));
    return skipped;
  }
  const asset = status.assets.find((item) => item.kind === "production_distribution");
  if (!asset) throw new Error("Update feed does not include a production distribution asset");
  const operationId = \`update-\${new Date().toISOString().replace(/[:.]/g, "-")}\`;
  const lockPath = await acquireUpdateLock();
  const stagingRoot = join(stateDir, "staging", operationId);
  const archivePath = join(stagingRoot, asset.name);
  const extractRoot = join(stagingRoot, "extract");
  let previousCurrent = null;
  try {
    await fs.mkdir(extractRoot, { recursive: true, mode: 0o700 });
    try {
      previousCurrent = await fs.readlink(join(stateDir, "current"));
    } catch {
      previousCurrent = null;
    }
    await downloadFile(asset.url, archivePath);
    const actualSha256 = await sha256File(archivePath);
    if (actualSha256 !== asset.sha256) {
      throw new Error(\`Downloaded asset SHA-256 mismatch: expected \${asset.sha256}, got \${actualSha256}\`);
    }
    const unzip = await runCommand("unzip", ["-q", archivePath, "-d", extractRoot]);
    if (!unzip.ok) throw new Error(\`Unable to extract update asset: \${unzip.stderr || unzip.stdout}\`);
    const expectedReleaseName = \`gpao-t-\${status.latestVersion}\`;
    const extractedRelease = join(extractRoot, expectedReleaseName);
    await verifyDistributionRoot(extractedRelease, status.latestVersion);
    const releasesRoot = join(stateDir, "releases");
    const releaseDest = join(releasesRoot, expectedReleaseName);
    await fs.mkdir(releasesRoot, { recursive: true, mode: 0o700 });
    await fs.rm(releaseDest, { recursive: true, force: true });
    await fs.rename(extractedRelease, releaseDest);
    await pointCurrent(releaseDest);
    const receipt = {
      schema: "gpao_t.github_update_receipt.v1",
      id: operationId,
      updatedAt: new Date().toISOString(),
      fromVersion: VERSION,
      toVersion: status.latestVersion,
      feedUrl: status.feedUrl,
      asset: { name: asset.name, url: asset.url, sha256: asset.sha256, bytes: asset.bytes ?? null },
      previousCurrent,
      current: releaseDest,
      preservesStateHome: true,
      restartRequired: true,
    };
    const receiptPath = await writeUpdateReceipt(receipt);
    if (process.argv.includes("--restart")) {
      const kickstart = await runCommand("launchctl", ["kickstart", "-k", \`gui/\${process.getuid()}/ai.nbeai.gpao-t\`], { timeoutMs: 30_000 });
      receipt.restart = { attempted: true, ok: kickstart.ok, stderr: kickstart.stderr, stdout: kickstart.stdout };
    }
    console.log(JSON.stringify({ status: "updated", receiptPath, receipt }, null, 2));
    return receipt;
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
    await fs.rm(lockPath, { recursive: true, force: true }).catch(() => {});
  }
}

// gpao_t_update_boundary_launcher_v0_1
if (process.argv[2] === "update") {
  try {
    const action = process.argv[3] || "status";
    if (action === "apply" || action === "install" || action === "run") await applyUpdate();
    else await updateStatus({ json: process.argv.includes("--json") || action === "status" });
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      schema: "gpao_t.update_boundary.v1.error",
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exit(1);
  }
}
const child = spawn(process.execPath, [...process.execArgv, launcher, ...process.argv.slice(2)], {
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});
child.stdout.on("data", (chunk) => process.stdout.write(gpaoOutput(String(chunk))));
child.stderr.on("data", (chunk) => process.stderr.write(gpaoOutput(String(chunk))));
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}
const result = await new Promise((resolve) => {
  child.once("exit", (code, signal) => resolve({ code, signal }));
  child.once("error", (error) => resolve({ code: 1, error }));
});
if (result.error) {
  console.error(\`GPAO-T 런타임을 시작하지 못했습니다: \${result.error.message}\`);
}
process.exitCode = result.signal ? 1 : (result.code ?? 1);
`;

const readme = `# nBeAI. GPAO-T ${VERSION}

GPAO-T is a local-first, self-growing personal AI operating system.

- Primary command: \`gpao-t\`
- State: \`~/.gpao-t\`
- Configuration: \`~/.gpao-t/gpao-t.json\`
- User surface: nBeAI. GPAO-T Workspace
- Compatibility substrate: isolated under \`compatibility/gpao-t\`

Run \`node gpao-t.mjs --help\` to verify the package before installation.
`;

export function patchDistributionIndexHtmlSource(source, path = "index.html") {
  const withoutInjectedScripts = stripControlUiInjectedScripts(source);
  const sealedStaticHtml = patchSurfaceFile({ path, source: withoutInjectedScripts }).source;
  return patchControlUiIndexHtmlSource(sealedStaticHtml);
}

async function patchDistributionUserSurface(output) {
  const runtimeDistDir = join(output, "compatibility", "gpao-t", "dist");
  const assetsDir = join(output, "compatibility", "gpao-t", "dist", "control-ui", "assets");
  const indexHtml = join(output, "compatibility", "gpao-t", "dist", "control-ui", "index.html");
  const assets = await readdir(assetsDir);
  const patched = [];
  const patchers = [
    {
      kind: "chat-page",
      files: assets.filter((name) => /^chat-page-.*\.js$/.test(name)),
      patch: patchChatPageSource,
    },
    {
      kind: "control-ui-css",
      files: assets.filter((name) => /^index-.*\.css$/.test(name)),
      patch: patchControlUiCssSource,
    },
    {
      kind: "nodes-page",
      files: assets.filter((name) => /^nodes-page-.*\.js$/.test(name)),
      patch: patchNodesPageSource,
    },
  ];

  for (const patcher of patchers) {
    for (const fileName of patcher.files) {
      const filePath = join(assetsDir, fileName);
      const before = await readFile(filePath, "utf8");
      let after;
      try {
        after = patcher.patch(before);
      } catch (error) {
        if (patcher.kind !== "chat-page") throw error;
        patched.push({
          kind: patcher.kind,
          file: fileName,
          changed: false,
          skipped: true,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (before !== after) {
        await writeFile(filePath, after);
        patched.push({ kind: patcher.kind, file: fileName, changed: true });
      } else {
        patched.push({ kind: patcher.kind, file: fileName, changed: false });
      }
    }
  }

  for (const fileName of assets.filter((name) => name.endsWith(".js"))) {
    const filePath = join(assetsDir, fileName);
    const before = await readFile(filePath, "utf8");
    const result = patchSurfaceFile({ path: filePath, source: before });
    if (before === result.source) continue;
    await writeFile(filePath, result.source);
    patched.push({
      kind: "surface-seal-js",
      file: fileName,
      changed: true,
      replacementCount: result.replacements.reduce((sum, item) => sum + item.count, 0),
    });
  }

  {
    const before = await readFile(indexHtml, "utf8");
    const after = patchDistributionIndexHtmlSource(before, indexHtml);
    if (before !== after) {
      await writeFile(indexHtml, after);
      patched.push({ kind: "control-ui-index", file: "index.html", changed: true });
    } else {
      patched.push({ kind: "control-ui-index", file: "index.html", changed: false });
    }
  }

  const modelConnectionRoute = await applyModelConnectionSettingsRoutePatch({
    controlUiRoot: join(output, "compatibility", "gpao-t", "dist", "control-ui"),
    write: true,
  });
  for (const file of modelConnectionRoute.files) {
    patched.push({
      kind: "model-connection-settings-route",
      file: file.path.slice(runtimeDistDir.length + 1),
      changed: file.replacements.some((replacement) => replacement.changed),
    });
  }

  const runtimeIdentityPatches = await patchRuntimeIdentityPromptFiles({
    distRoot: runtimeDistDir,
    write: true,
  });
  for (const result of runtimeIdentityPatches) {
    patched.push({
      kind: "runtime-identity-prompt",
      file: result.file.slice(runtimeDistDir.length + 1),
      changed: true,
      replacementCount: result.replacements.reduce((sum, item) => sum + item.count, 0),
    });
  }

  const replayEvaluatorPatches = await patchReplayEvaluatorFiles({
    distRoot: runtimeDistDir,
    write: true,
  });
  for (const result of replayEvaluatorPatches) {
    patched.push({
      kind: "replay-evaluator",
      file: result.file.slice(runtimeDistDir.length + 1),
      changed: true,
    });
  }

  const updateBoundaryPatches = await patchGpaoTUpdateBoundaryFiles({
    runtimeRoot: join(output, "compatibility", "gpao-t"),
    write: true,
  });
  for (const result of updateBoundaryPatches) {
    patched.push({
      kind: `update-boundary-${result.kind}`,
      file: result.path.slice(runtimeDistDir.length + 1),
      changed: result.changed,
    });
  }

  const outboundBoundary = await patchGpaoTOutboundBoundaryFiles({
    runtimeRoot: join(output, "compatibility", "gpao-t"),
    write: true,
    stagedDistribution: true,
  });
  for (const result of outboundBoundary.files) {
    patched.push({
      kind: `outbound-boundary-${result.kind}`,
      file: result.path,
      changed: result.changed,
    });
  }

  const runtimeIdentityPath = join(output, "compatibility", "gpao-t", "GPAO-T-RUNTIME.json");
  const runtimeIdentity = JSON.parse(await readFile(runtimeIdentityPath, "utf8"));
  runtimeIdentity.productVersion = VERSION;
  runtimeIdentity.upstream = {
    role: "isolated compatibility and attribution boundary",
    attribution: "THIRD_PARTY_NOTICES.md",
  };
  runtimeIdentity.completionBoundary = {
    userVisibleIdentity: "GPAO-T only",
    productOwnedNamespace: "gpao-t",
    thirdPartyNames: "legal attribution and explicit compatibility identifiers only",
  };
  await writeFile(runtimeIdentityPath, `${JSON.stringify(runtimeIdentity, null, 2)}\n`);
  patched.push({ kind: "runtime-release-identity", file: "GPAO-T-RUNTIME.json", changed: true });

  return patched;
}

export async function buildDistribution({ sourceBuild, runtimeStage, output, archive }) {
  // Seal before deleting any prior output so a stale stage cannot replace a known artifact.
  const runtimeProvenance = await verifyFreshRuntimeStage({ sourceBuild, runtimeStage });
  const compatibilityPackage = JSON.parse(
    await readFile(join(runtimeStage, "package.json"), "utf8"),
  );
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "compatibility"), { recursive: true });
  await cp(runtimeStage, join(output, "compatibility", "gpao-t"), {
    recursive: true,
    verbatimSymlinks: true,
  });
  const userSurfacePatches = await patchDistributionUserSurface(output);
  const distributionRuntimeRecords = await collectTree(join(output, "compatibility", "gpao-t"), {
    ignoreTopLevel: runtimeProvenance.ignoredStageTopLevel,
  });
  const distributionRuntimeProvenance = {
    ...runtimeProvenance,
    distributionRuntimeTreeSha256: treeDigest(distributionRuntimeRecords),
    distributionRuntimeFileCount: distributionRuntimeRecords.length,
    distributionRuntimeBytes: distributionRuntimeRecords.reduce(
      (sum, record) => sum + (record.size ?? 0),
      0,
    ),
  };
  await writeFile(join(output, "package.json"), `${JSON.stringify(rootPackage(compatibilityPackage), null, 2)}\n`);
  await writeFile(join(output, "gpao-t.mjs"), wrapper, { mode: 0o755 });
  await writeFile(join(output, "README.md"), readme);
  await cp(join(PROJECT_ROOT, "LICENSE"), join(output, "LICENSE"));
  await cp(join(PROJECT_ROOT, "THIRD_PARTY_NOTICES.md"), join(output, "THIRD_PARTY_NOTICES.md"));
  const files = await collectTree(output, { skipManifest: true });
  const manifest = {
    schema: "gpao_t.distribution_manifest.v2",
    productId: GPAO_T_RELEASE_CONTRACT.productId,
    product: "nBeAI. GPAO-T",
    version: VERSION,
    distributionChannel: GPAO_T_RELEASE_CONTRACT.distributionChannel,
    intendedAudience: GPAO_T_RELEASE_CONTRACT.intendedAudience,
    publicRelease: GPAO_T_RELEASE_CONTRACT.publicRelease,
    externalDistributionExecuted: GPAO_T_RELEASE_CONTRACT.externalDistributionExecuted,
    generatedAt: new Date().toISOString(),
    stateHome: "~/.gpao-t",
    entrypoint: "gpao-t.mjs",
    runtimeProvenance: distributionRuntimeProvenance,
    userSurfacePatches,
    fileCount: files.length,
    totalBytes: files.reduce((sum, item) => sum + (item.size ?? 0), 0),
    files,
  };
  await writeFile(
    join(output, MANIFEST_NAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await verifyDistributionManifest(output);
  const archiveRecord = await createZipArchive(output, archive);
  const checksumPath = `${archive}.sha256`;
  await writeFile(checksumPath, `${archiveRecord.sha256}  ${archive.slice(archive.lastIndexOf("/") + 1)}\n`);
  return { manifest, archive: archiveRecord.path, archiveSha256: archiveRecord.sha256, checksum: checksumPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sourceBuild = resolve(arg("--source-build", DEFAULT_SOURCE_BUILD));
  const runtimeStage = resolve(arg("--runtime-stage", "/tmp/gpao-t-runtime-stage"));
  const output = resolve(
    arg("--output", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${VERSION}`)),
  );
  const archive = resolve(arg("--archive", `${output}.zip`));
  if (!process.argv.includes("--runtime-stage") || process.argv.includes("--prepare-runtime-stage")) {
    await prepareFreshRuntimeStage({ sourceBuild, runtimeStage });
  }
  await mkdir(dirname(output), { recursive: true });
  const report = await buildDistribution({ sourceBuild, runtimeStage, output, archive });
  console.log(
    JSON.stringify(
      {
        status: "sealed",
        sourceBuild,
        runtimeStage,
        output,
        archive: report.archive,
        archiveSha256: report.archiveSha256,
        checksum: report.checksum,
        manifest: {
          schema: report.manifest.schema,
          version: report.manifest.version,
          fileCount: report.manifest.fileCount,
          totalBytes: report.manifest.totalBytes,
          runtimeProvenance: report.manifest.runtimeProvenance,
        },
      },
      null,
      2,
    ),
  );
}
