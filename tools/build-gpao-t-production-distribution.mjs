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
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
// gpao_t_update_boundary_launcher_v0_1
if (process.argv[2] === "update") {
  const feedConfigured = Boolean(process.env.GPAO_T_UPDATE_FEED_URL?.trim());
  const statusOnly = process.argv[3] === "status" || process.argv.includes("--json");
  const payload = {
    schema: "gpao_t.update_boundary.v1",
    product: "GPAO-T",
    currentVersion: "${VERSION}",
    mode: "gpao_t_managed",
    status: feedConfigured ? "configured_inactive" : "disabled",
    updateAvailable: null,
    compatibilityUpdaterAllowed: false,
    reason: feedConfigured
      ? "gpao_t_update_service_not_activated"
      : "gpao_t_update_feed_not_configured",
  };
  const output = JSON.stringify(payload, null, 2);
  if (statusOnly) console.log(output);
  else console.error(output);
  process.exit(statusOnly ? 0 : 2);
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
