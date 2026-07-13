#!/usr/bin/env node
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

const REQUIRED_APPROVAL_TOKEN = "GPAO-T-LIVE-OPENCLAW-APPLY-2026-07-11";
const workspace = "/Users/jyp/Developer";
const labDist = join(workspace, "gpao-t-lab/gpao-t-openclaw-dashboard-lab/dist");
const liveDist = "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const evidenceRoot = join(workspace, "gpao-t/docs/03-verification/evidence/live-backups");
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(evidenceRoot, `openclaw-live-gpao-bridge-${runStamp}-before-patch`);
const preApplyDir = join(evidenceRoot, `openclaw-live-gpao-bridge-${runStamp}-pre-apply`);
const gpaoMethods = [
  "gpao.appliedReplayInspector.get",
  "gpao.chatPreflight.prepare",
  "gpao.chatPostAnswerReplay.record",
  "gpao.chatAnswerReplay.evaluate",
];
const labGpaoBridgeName = await findGpaoBridgeName(labDist);

const files = {
  liveServerMethods: join(liveDist, "server-methods-B64pXQ-G.js"),
  liveCoreDescriptors: join(liveDist, "core-descriptors-B2lASufG.js"),
  liveGpaoBridge: join(liveDist, labGpaoBridgeName),
  labGpaoBridge: join(labDist, labGpaoBridgeName),
  labControlUi: join(labDist, "control-ui"),
  liveControlUi: join(liveDist, "control-ui"),
};

async function findGpaoBridgeName(distDir) {
  const names = (await readdir(distDir)).filter((name) => /^gpao-t-.*\.js$/.test(name)).sort();
  if (names.length !== 1) {
    throw new Error(`Expected exactly one gpao-t bridge chunk in ${distDir}, found ${names.length}`);
  }
  return names[0];
}

async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

async function buildPreApplyManifest({ status, applyFlag, approvalTokenMatched, expectedHashesMatched }) {
  const currentHashes = {
    serverMethods: await sha256(files.liveServerMethods),
    coreDescriptors: await sha256(files.liveCoreDescriptors),
    controlUiIndex: await sha256(join(files.liveControlUi, "index.html")),
  };
  return {
    schema: "gpao_t.openclaw_live_gpao_bridge_pre_apply_manifest.v0_1",
    status,
    createdAt: new Date().toISOString(),
    liveDist,
    labDist,
    evidenceRoot,
    plannedBackupDir: backupDir,
    approval: {
      applyFlag,
      approvalTokenMatched,
      expectedHashesMatched,
      requiredApprovalToken: REQUIRED_APPROVAL_TOKEN,
    },
    currentHashes,
    applyCommandPreview: [
      "node tools/apply-openclaw-live-gpao-bridge-patch.mjs",
      "--apply",
      `--approval-token ${REQUIRED_APPROVAL_TOKEN}`,
      `--expected-server-methods-sha ${currentHashes.serverMethods}`,
      `--expected-core-descriptors-sha ${currentHashes.coreDescriptors}`,
      `--expected-control-ui-index-sha ${currentHashes.controlUiIndex}`,
    ].join(" "),
    plannedOperations: [
      "backup live server-methods, core-descriptors, and control-ui",
      "copy staged GPAO bridge into live OpenClaw dist",
      "register GPAO bridge methods and descriptors",
      "copy staged control-ui into live OpenClaw dist when available",
      "backup and remove stale GPAO bridge chunks",
      "write post-apply readback manifest with hashes",
    ],
    liveMutationExecutedByManifestCreation: false,
    nextMutation: applyFlag
      ? "backup_live_files_then_apply_gpao_bridge_patch"
      : "review manifest, then rerun with --apply and exact expected hashes if authorized",
  };
}

function failBeforeMutation(findings) {
  console.error(JSON.stringify({
    schema: "gpao_t.openclaw_live_gpao_bridge_apply_refusal.v0_1",
    status: "blocked_before_live_mutation",
    required: {
      applyFlag: "--apply",
      approvalToken: REQUIRED_APPROVAL_TOKEN,
      expectedHashes: [
        "--expected-server-methods-sha",
        "--expected-core-descriptors-sha",
        "--expected-control-ui-index-sha",
      ],
    },
    findings,
    liveMutationExecuted: false,
  }, null, 2));
  process.exit(1);
}

async function assertCurrentHash({ label, path, expected }) {
  if (!expected) {
    return `${label}_expected_hash_missing`;
  }
  const actual = await sha256(path);
  if (actual !== expected) {
    return `${label}_current_hash_mismatch:${actual}`;
  }
  return null;
}

async function patchTextFile(path, replacements) {
  let content = await readFile(path, "utf8");
  for (const replacement of replacements) {
    if (content.includes(replacement.guard)) {
      continue;
    }
    if (replacement.pattern) {
      if (!replacement.pattern.test(content)) {
        throw new Error(`Patch pattern not found in ${path}: ${replacement.label}`);
      }
      content = content.replace(replacement.pattern, replacement.replace);
      continue;
    }
    if (!content.includes(replacement.search)) {
      throw new Error(`Patch search string not found in ${path}: ${replacement.label}`);
    }
    content = content.replace(replacement.search, replacement.replace);
  }
  await writeFile(path, content);
}

if (!hasArg("--apply")) {
  await mkdir(preApplyDir, { recursive: true });
  const dryRunManifest = await buildPreApplyManifest({
    status: "dry_run_manifest_ready_live_not_mutated",
    applyFlag: false,
    approvalTokenMatched: false,
    expectedHashesMatched: false,
  });
  await writeFile(join(preApplyDir, "pre-apply-manifest.json"), `${JSON.stringify(dryRunManifest, null, 2)}\n`);
  console.log(JSON.stringify(dryRunManifest, null, 2));
  process.exit(0);
}

const initialFindings = [];
if (readArg("--approval-token") !== REQUIRED_APPROVAL_TOKEN) {
  initialFindings.push("approval_token_missing_or_invalid");
}
if (initialFindings.length) failBeforeMutation(initialFindings);

const hashFindings = (
  await Promise.all([
    assertCurrentHash({
      label: "server_methods",
      path: files.liveServerMethods,
      expected: readArg("--expected-server-methods-sha"),
    }),
    assertCurrentHash({
      label: "core_descriptors",
      path: files.liveCoreDescriptors,
      expected: readArg("--expected-core-descriptors-sha"),
    }),
    assertCurrentHash({
      label: "control_ui_index",
      path: join(files.liveControlUi, "index.html"),
      expected: readArg("--expected-control-ui-index-sha"),
    }),
  ])
).filter(Boolean);
if (hashFindings.length) failBeforeMutation(hashFindings);

await mkdir(preApplyDir, { recursive: true });
await writeFile(join(preApplyDir, "pre-apply-manifest.json"), `${JSON.stringify(await buildPreApplyManifest({
  status: "authorized_hash_locked_ready_to_mutate",
  applyFlag: true,
  approvalTokenMatched: true,
  expectedHashesMatched: true,
}), null, 2)}\n`);

await mkdir(backupDir, { recursive: true });
await cp(files.liveServerMethods, join(backupDir, "server-methods-B64pXQ-G.js"));
await cp(files.liveCoreDescriptors, join(backupDir, "core-descriptors-B2lASufG.js"));
await cp(files.liveControlUi, join(backupDir, "control-ui"), { recursive: true });

await cp(files.labGpaoBridge, files.liveGpaoBridge);

await patchTextFile(files.liveServerMethods, [
  {
    label: "update gpao bridge handler chunk",
    guard: `import("./${labGpaoBridgeName}")`,
    pattern:
      /const loadGpaoTHandlers = lazyHandlerModule\(\(\) => import\("\.\/gpao-t-[^"]+\.js"\), \(module\) => module\.gpaoTHandlers\);/,
    replace:
      `const loadGpaoTHandlers = lazyHandlerModule(() => import("./${labGpaoBridgeName}"), (module) => module.gpaoTHandlers);`,
  },
  {
    label: "load gpao bridge handlers",
    guard: "const loadGpaoTHandlers = lazyHandlerModule",
    search:
      'const loadHealthHandlers = lazyHandlerModule(() => import("./health-K2JG4miy.js"), (module) => module.healthHandlers);\nconst loadLogsHandlers = lazyHandlerModule',
    replace:
      `const loadHealthHandlers = lazyHandlerModule(() => import("./health-K2JG4miy.js"), (module) => module.healthHandlers);\nconst loadGpaoTHandlers = lazyHandlerModule(() => import("./${labGpaoBridgeName}"), (module) => module.gpaoTHandlers);\nconst loadLogsHandlers = lazyHandlerModule`,
  },
  {
    label: "expand existing gpao bridge handler methods",
    guard: '"gpao.chatPreflight.prepare"',
    pattern:
      /\t\.\.\.createLazyCoreHandlers\(\{\n\t\tmethods: \[[^\]]*"gpao\.appliedReplayInspector\.get"[^\]]*\],\n\t\tloadHandlers: loadGpaoTHandlers\n\t\}\),/,
    replace:
      `\t...createLazyCoreHandlers({\n\t\tmethods: ${JSON.stringify(gpaoMethods)},\n\t\tloadHandlers: loadGpaoTHandlers\n\t}),`,
  },
  {
    label: "register gpao bridge handler",
    guard: '"gpao.chatPreflight.prepare"',
    search:
      '\t...createLazyCoreHandlers({\n\t\tmethods: ["health", "status"],\n\t\tloadHandlers: loadHealthHandlers\n\t}),\n\t...createLazyCoreHandlers({\n\t\tmethods: [\n\t\t\t"channels.status",',
    replace:
      `\t...createLazyCoreHandlers({\n\t\tmethods: ["health", "status"],\n\t\tloadHandlers: loadHealthHandlers\n\t}),\n\t...createLazyCoreHandlers({\n\t\tmethods: ${JSON.stringify(gpaoMethods)},\n\t\tloadHandlers: loadGpaoTHandlers\n\t}),\n\t...createLazyCoreHandlers({\n\t\tmethods: [\n\t\t\t"channels.status",`,
  },
]);

await patchTextFile(files.liveCoreDescriptors, [
  {
    label: "expand existing gpao bridge descriptors",
    guard: 'name: "gpao.chatPreflight.prepare"',
    pattern:
      /\t\{\n\t\tname: "gpao\.appliedReplayInspector\.get",\n\t\tscope: "operator\.read"\n\t\},\n(?:\t\{\n\t\tname: "gpao\.chatAnswerReplay\.evaluate",\n\t\tscope: "operator\.read"\n\t\},\n)?/,
    replace:
      `${gpaoMethods.map((method) => `\t{\n\t\tname: "${method}",\n\t\tscope: "operator.read"\n\t}`).join(",\n")},\n`,
  },
  {
    label: "register gpao bridge descriptor",
    guard: 'name: "gpao.chatPreflight.prepare"',
    search:
      '\t{\n\t\tname: "status",\n\t\tscope: "operator.read"\n\t},\n\t{\n\t\tname: "usage.status",',
    replace:
      `\t{\n\t\tname: "status",\n\t\tscope: "operator.read"\n\t},\n${gpaoMethods.map((method) => `\t{\n\t\tname: "${method}",\n\t\tscope: "operator.read"\n\t}`).join(",\n")},\n\t{\n\t\tname: "usage.status",`,
  },
]);

let controlUiCopyStatus = "skipped_lab_control_ui_missing";
if (existsSync(files.labControlUi)) {
  await cp(files.labControlUi, files.liveControlUi, { recursive: true });
  controlUiCopyStatus = "copied";
}

const staleBridgeChunks = (await readdir(liveDist))
  .filter((name) => /^gpao-t-.*\.js$/.test(name) && name !== labGpaoBridgeName)
  .sort();
if (staleBridgeChunks.length) {
  const staleBackupDir = join(backupDir, "stale-gpao-bridge-chunks");
  await mkdir(staleBackupDir, { recursive: true });
  for (const name of staleBridgeChunks) {
    await cp(join(liveDist, name), join(staleBackupDir, name));
    await rm(join(liveDist, name));
  }
}

const manifest = {
  schema: "gpao_t.openclaw_live_gpao_bridge_patch_manifest.v0_1",
  status: "applied",
  createdAt: new Date().toISOString(),
  liveDist,
  labDist,
  backupDir,
  patchedFiles: {
    serverMethods: files.liveServerMethods,
    coreDescriptors: files.liveCoreDescriptors,
    gpaoBridge: files.liveGpaoBridge,
    controlUi: files.liveControlUi,
  },
  hashes: {
    serverMethods: await sha256(files.liveServerMethods),
    coreDescriptors: await sha256(files.liveCoreDescriptors),
    gpaoBridge: await sha256(files.liveGpaoBridge),
    controlUiIndex: await sha256(join(files.liveControlUi, "index.html")),
  },
  controlUiCopyStatus,
  staleBridgeChunksRemoved: staleBridgeChunks,
  readback: {
    status: "applied_readback_recorded",
    requiredNeedles: {
      serverMethods: [
        "const loadGpaoTHandlers = lazyHandlerModule",
        ...gpaoMethods.map((method) => `"${method}"`),
      ],
      coreDescriptors: gpaoMethods.map((method) => `name: "${method}"`),
      gpaoBridge: ["gpaoTHandlers"],
    },
  },
  rollback: {
    restoreServerMethodsFrom: join(backupDir, "server-methods-B64pXQ-G.js"),
    restoreCoreDescriptorsFrom: join(backupDir, "core-descriptors-B2lASufG.js"),
    restoreControlUiFrom: join(backupDir, "control-ui"),
    removeGpaoBridge: files.liveGpaoBridge,
  },
  authority: {
    durableMemoryPromotion: "blocked",
    openClawMemoryWrite: "blocked",
    sessionMetaWrite: "blocked",
    externalSend: "blocked",
    automaticAdmission: "blocked",
  },
};

await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
