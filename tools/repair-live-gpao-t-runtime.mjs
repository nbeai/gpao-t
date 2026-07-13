#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

const REQUIRED_APPROVAL_TOKEN = "GPAO-T-LIVE-RUNTIME-REPAIR-2026-07-12";
const DEFAULT_WORKSPACE = "/Users/jyp/Documents/Playground 2";
const DEFAULT_LIVE_OPENCLAW_ROOT =
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw";
const DEFAULT_PURE_OPENCLAW_ROOT = join(
  DEFAULT_WORKSPACE,
  "openclaw-clean-lab/github-openclaw-source",
);
const DEFAULT_EVIDENCE_ROOT = join(
  DEFAULT_WORKSPACE,
  "gpao-t/docs/03-verification/evidence/live-runtime-repair-overlays",
);
const DEFAULT_STATE_HOME = process.env.GPAO_T_STATE_DIR?.trim() || "/Users/jyp/.gpao-t";
const DEFAULT_STATE_DB = join(DEFAULT_STATE_HOME, "state", "openclaw.sqlite");
const DEFAULT_AFFECTED_DEVICE_ID = "";
const OLD_RUN_COMMAND = "run-command-CuXu0kg-.js";
const NEW_RUN_COMMAND = "run-command-BviuP6MM.js";
const SESSION_STORE_RUNTIME_ALIAS = "session-store.runtime.js";
const OLD_SESSION_STORE_RUNTIME_CHUNK = "session-store.runtime-B3wkNT36.js";
const NEW_SESSION_STORE_RUNTIME_CHUNK = "session-store.runtime-bko8HNru.js";
const INTERNAL_PACKAGES = [
  "normalization-core",
  "markdown-core",
  "llm-core",
  "ai",
];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

function readCsvArg(name) {
  const value = readArg(name, "");
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

async function maybeSha256(path) {
  return existsSync(path) ? sha256(path) : null;
}

async function listFilesRecursive(dir) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const itemStat = await stat(full);
    if (itemStat.isDirectory()) {
      entries.push(...await listFilesRecursive(full));
    } else if (itemStat.isFile()) {
      entries.push(full);
    }
  }
  return entries.sort();
}

async function directorySha256(dir) {
  if (!existsSync(dir)) return null;
  const hash = createHash("sha256");
  for (const file of await listFilesRecursive(dir)) {
    hash.update(relative(dir, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function listTsFiles(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const itemStat = await stat(full);
    if (itemStat.isDirectory()) {
      out.push(...await listTsFiles(full));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

async function findRegisterFiles(liveDist) {
  const names = await readdir(liveDist);
  return names
    .filter((name) => /^register\.subclis-core-.*\.js$/.test(name))
    .sort()
    .map((name) => join(liveDist, name));
}

async function findLiveTargets(liveOpenClawRoot) {
  const liveDist = join(liveOpenClawRoot, "dist");
  const runMain = join(liveDist, "cli/run-main.js");
  const sessionStoreRuntimeAlias = join(liveDist, SESSION_STORE_RUNTIME_ALIAS);
  const registerCandidates = await findRegisterFiles(liveDist);
  const registerFiles = [];
  for (const file of registerCandidates) {
    const content = await readFile(file, "utf8");
    if (content.includes(OLD_RUN_COMMAND) || content.includes(NEW_RUN_COMMAND)) {
      registerFiles.push(file);
    }
  }
  return { liveDist, runMain, registerFiles, sessionStoreRuntimeAlias };
}

function rewritePackageJson(packageJson) {
  const copy = JSON.parse(JSON.stringify(packageJson));
  function visit(value) {
    if (typeof value === "string") {
      return value.replace(/\.d\.mts/g, ".d.ts").replace(/\.mjs/g, ".js");
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      for (const key of Object.keys(value)) value[key] = visit(value[key]);
    }
    return value;
  }
  visit(copy);
  return copy;
}

function resolveTypeScript(liveOpenClawRoot) {
  const candidates = [
    join(liveOpenClawRoot, "node_modules/typescript/lib/typescript.js"),
    "typescript",
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("typescript_runtime_not_found");
}

async function transpileInternalPackage({ ts, sourcePackageDir, destinationPackageDir }) {
  const sourceSrc = join(sourcePackageDir, "src");
  const destinationDist = join(destinationPackageDir, "dist");
  await mkdir(destinationDist, { recursive: true });

  const packageJson = JSON.parse(await readFile(join(sourcePackageDir, "package.json"), "utf8"));
  await writeFile(
    join(destinationPackageDir, "package.json"),
    `${JSON.stringify(rewritePackageJson(packageJson), null, 2)}\n`,
  );

  for (const file of ["LICENSE", "README.md", "npm-shrinkwrap.json"]) {
    const source = join(sourcePackageDir, file);
    if (existsSync(source)) await cp(source, join(destinationPackageDir, file));
  }

  for (const file of await listTsFiles(sourceSrc)) {
    const target = join(destinationDist, relative(sourceSrc, file).replace(/\.ts$/, ".js"));
    await mkdir(dirname(target), { recursive: true });
    const output = ts.transpileModule(await readFile(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true,
        skipLibCheck: true,
        verbatimModuleSyntax: true,
      },
    });
    await writeFile(target, output.outputText);
  }
}

async function restoreInternalPackages({ liveOpenClawRoot, pureOpenClawRoot }) {
  const ts = resolveTypeScript(liveOpenClawRoot);
  const restored = [];
  for (const packageName of INTERNAL_PACKAGES) {
    const sourcePackageDir = join(pureOpenClawRoot, "packages", packageName);
    const destinationPackageDir = join(liveOpenClawRoot, "node_modules/@openclaw", packageName);
    if (!existsSync(sourcePackageDir)) {
      throw new Error(`missing_source_package:${sourcePackageDir}`);
    }
    await transpileInternalPackage({ ts, sourcePackageDir, destinationPackageDir });
    restored.push(`@openclaw/${packageName}`);
  }

  const aiDist = join(liveOpenClawRoot, "node_modules/@openclaw/ai/dist");
  await writeFile(join(aiDist, "event-stream.js"), 'export * from "./utils/event-stream.js";\n');
  await writeFile(join(aiDist, "diagnostics.js"), 'export * from "./utils/diagnostics.js";\n');

  return restored;
}

async function patchEntrypoints({ runMain, registerFiles }) {
  const patched = [];
  const patchFile = async (file, search, replace) => {
    let content = await readFile(file, "utf8");
    if (!content.includes(search)) return false;
    content = content.replaceAll(search, replace);
    await writeFile(file, content);
    patched.push(file);
    return true;
  };
  await patchFile(runMain, `../${OLD_RUN_COMMAND}`, `../${NEW_RUN_COMMAND}`);
  for (const registerFile of registerFiles) {
    await patchFile(registerFile, `./${OLD_RUN_COMMAND}`, `./${NEW_RUN_COMMAND}`);
  }
  return patched;
}

async function patchSessionStoreRuntimeAlias({ sessionStoreRuntimeAlias }) {
  const expectedOld = `export * from "./${OLD_SESSION_STORE_RUNTIME_CHUNK}";\n`;
  const expectedNew = `export * from "./${NEW_SESSION_STORE_RUNTIME_CHUNK}";\n`;
  const content = await readFile(sessionStoreRuntimeAlias, "utf8");
  if (content === expectedNew) return { patched: false, alreadyCurrent: true };
  if (content !== expectedOld) {
    throw new Error(`unexpected_session_store_runtime_alias:${sessionStoreRuntimeAlias}`);
  }
  await writeFile(sessionStoreRuntimeAlias, expectedNew);
  return { patched: true, alreadyCurrent: false };
}

function runSqlite(stateDb, sql) {
  const result = spawnSync("sqlite3", [stateDb, sql], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`sqlite_failed:${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout;
}

async function repairDeviceMetadataLoop({ stateDb, affectedDeviceId }) {
  if (!existsSync(stateDb)) return { status: "skipped_state_db_missing", pendingCount: null };
  const escapedDeviceId = affectedDeviceId.replaceAll("'", "''");
  const before = runSqlite(
    stateDb,
    `select count(*) from device_pairing_pending where device_id = '${escapedDeviceId}';`,
  ).trim();
  runSqlite(
    stateDb,
    [
      "begin immediate;",
      `update device_pairing_paired set platform = NULL where device_id = '${escapedDeviceId}';`,
      `delete from device_pairing_pending where device_id = '${escapedDeviceId}';`,
      "commit;",
    ].join(" "),
  );
  const integrity = runSqlite(stateDb, "pragma integrity_check;").trim();
  if (integrity !== "ok") throw new Error(`sqlite_integrity_check_failed:${integrity}`);
  const pendingCount = runSqlite(
    stateDb,
    "select count(*) from device_pairing_pending;",
  ).trim();
  const after = runSqlite(
    stateDb,
    `select count(*) from device_pairing_pending where device_id = '${escapedDeviceId}';`,
  ).trim();
  return {
    status: "device_metadata_loop_repaired",
    scopedPendingBefore: Number(before),
    scopedPendingAfter: Number(after),
    pendingCount: Number(pendingCount),
    integrity,
  };
}

async function backupIfExists(source, target) {
  if (!existsSync(source)) return false;
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  return true;
}

async function backupTouchedTargets({ liveOpenClawRoot, stateDb, targets, backupDir }) {
  const backup = {
    entrypoints: [],
    stateFiles: [],
    packages: [],
    packageMissingMarkers: [],
  };

  await cp(targets.runMain, join(backupDir, "entrypoints/run-main.js.before"));
  backup.entrypoints.push({ source: targets.runMain, backup: "entrypoints/run-main.js.before" });

  await cp(
    targets.sessionStoreRuntimeAlias,
    join(backupDir, `entrypoints/${SESSION_STORE_RUNTIME_ALIAS}.before`),
  );
  backup.entrypoints.push({
    source: targets.sessionStoreRuntimeAlias,
    backup: `entrypoints/${SESSION_STORE_RUNTIME_ALIAS}.before`,
  });

  for (const file of targets.registerFiles) {
    const backupName = `entrypoints/${file.split("/").at(-1)}.before`;
    await cp(file, join(backupDir, backupName));
    backup.entrypoints.push({ source: file, backup: backupName });
  }

  for (const stateFile of [stateDb, `${stateDb}-wal`, `${stateDb}-shm`]) {
    if (await backupIfExists(stateFile, join(backupDir, "state", stateFile.split("/").at(-1)))) {
      backup.stateFiles.push({ source: stateFile, backup: `state/${stateFile.split("/").at(-1)}` });
    }
  }

  for (const packageName of INTERNAL_PACKAGES) {
    const source = join(liveOpenClawRoot, "node_modules/@openclaw", packageName);
    const backupPath = join(backupDir, "packages", packageName);
    if (existsSync(source)) {
      await cp(source, backupPath, { recursive: true });
      backup.packages.push({
        name: `@openclaw/${packageName}`,
        source,
        backup: `packages/${packageName}`,
        sha256: await directorySha256(source),
      });
    } else {
      const marker = join(backupDir, "packages", `${packageName}.missing`);
      await mkdir(dirname(marker), { recursive: true });
      await writeFile(marker, "missing_before_repair\n");
      backup.packageMissingMarkers.push({
        name: `@openclaw/${packageName}`,
        source,
        marker: `packages/${packageName}.missing`,
      });
    }
  }

  return backup;
}

async function buildManifest({
  status,
  liveOpenClawRoot,
  pureOpenClawRoot,
  evidenceRoot,
  stateDb,
  affectedDeviceId,
  targets,
  backupDir,
  apply,
  findings = [],
}) {
  const registerHashes = {};
  for (const file of targets.registerFiles) {
    registerHashes[file] = await maybeSha256(file);
  }
  return {
    schema: "gpao_t.live_runtime_repair_manifest.v0_1",
    status,
    createdAt: new Date().toISOString(),
    authority: {
      dryRunDefault: true,
      applyFlagRequired: true,
      approvalTokenRequired: true,
      hashGuardRequired: true,
      liveMutationExecuted: apply,
      requiredApprovalToken: REQUIRED_APPROVAL_TOKEN,
    },
    paths: {
      liveOpenClawRoot,
      pureOpenClawRoot,
      evidenceRoot,
      stateDb,
      backupDir,
      affectedDeviceId,
    },
    detected: {
      runMain: targets.runMain,
      sessionStoreRuntimeAlias: targets.sessionStoreRuntimeAlias,
      registerFiles: targets.registerFiles,
      runMainSha256: await maybeSha256(targets.runMain),
      sessionStoreRuntimeAliasSha256: await maybeSha256(targets.sessionStoreRuntimeAlias),
      registerSha256: registerHashes,
      packageSha256: Object.fromEntries(
        await Promise.all(INTERNAL_PACKAGES.map(async (name) => [
          `@openclaw/${name}`,
          await directorySha256(join(liveOpenClawRoot, "node_modules/@openclaw", name)),
        ])),
      ),
      stateDbSha256: await maybeSha256(stateDb),
    },
    plannedOperations: [
      "backup live entrypoint files, OpenClaw internal package overlays, and SQLite device store",
      "restore missing @openclaw internal runtime packages from pure source",
      `route Gateway entrypoints from ${OLD_RUN_COMMAND} to ${NEW_RUN_COMMAND}`,
      `route session store runtime alias from ${OLD_SESSION_STORE_RUNTIME_CHUNK} to ${NEW_SESSION_STORE_RUNTIME_CHUNK}`,
      "clear local platform pin for the affected paired device",
      "delete stale metadata-upgrade pending rows for that device",
      "verify imports, health, device pending state, and RPC drift after restart",
    ],
    findings,
  };
}

function failBeforeMutation(findings) {
  console.error(JSON.stringify({
    schema: "gpao_t.live_runtime_repair_refusal.v0_1",
    status: "blocked_before_live_mutation",
    required: {
      applyFlag: "--apply",
      approvalToken: REQUIRED_APPROVAL_TOKEN,
      hashGuards: ["--expected-run-main-sha", "--expected-register-sha-list"],
      optionalHashGuards: ["--expected-session-store-runtime-sha"],
    },
    findings,
    liveMutationExecuted: false,
  }, null, 2));
  process.exit(1);
}

async function main() {
  const liveOpenClawRoot = readArg("--live-openclaw-root", DEFAULT_LIVE_OPENCLAW_ROOT);
  const pureOpenClawRoot = readArg("--pure-openclaw-root", DEFAULT_PURE_OPENCLAW_ROOT);
  const evidenceRoot = readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT);
  const stateDb = readArg("--state-db", DEFAULT_STATE_DB);
  const affectedDeviceId = readArg("--affected-device-id", DEFAULT_AFFECTED_DEVICE_ID);
  const apply = hasArg("--apply");
  const noWrite = hasArg("--no-write");
  const targets = await findLiveTargets(liveOpenClawRoot);
  const backupDir = join(evidenceRoot, `live-runtime-repair-${isoStamp()}`);

  if (!apply) {
    const manifest = await buildManifest({
      status: "dry_run_ready_live_not_mutated",
      liveOpenClawRoot,
      pureOpenClawRoot,
      evidenceRoot,
      stateDb,
      affectedDeviceId,
      targets,
      backupDir,
      apply: false,
    });
    manifest.authority.noWriteDryRun = noWrite;
    if (!noWrite) {
      await mkdir(backupDir, { recursive: true });
      await writeFile(join(backupDir, "dry-run-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const findings = [];
  if (readArg("--approval-token") !== REQUIRED_APPROVAL_TOKEN) {
    findings.push("approval_token_missing_or_invalid");
  }
  if (!affectedDeviceId) {
    findings.push("affected_device_id_required");
  }
  const expectedRunMainSha = readArg("--expected-run-main-sha");
  const expectedRegisterShaList = readCsvArg("--expected-register-sha-list");
  const expectedSessionStoreRuntimeSha = readArg("--expected-session-store-runtime-sha");
  const currentRunMainSha = await maybeSha256(targets.runMain);
  const currentSessionStoreRuntimeSha = await maybeSha256(targets.sessionStoreRuntimeAlias);
  const currentRegisterShaList = await Promise.all(
    targets.registerFiles.map(async (file) => await maybeSha256(file)),
  );
  if (!expectedRunMainSha || currentRunMainSha !== expectedRunMainSha) {
    findings.push(`run_main_hash_guard_failed:${currentRunMainSha ?? "missing"}`);
  }
  if (
    expectedSessionStoreRuntimeSha
    && currentSessionStoreRuntimeSha !== expectedSessionStoreRuntimeSha
  ) {
    findings.push(`session_store_runtime_hash_guard_failed:${currentSessionStoreRuntimeSha ?? "missing"}`);
  }
  if (expectedRegisterShaList.length !== currentRegisterShaList.length) {
    findings.push(
      `register_hash_guard_count_failed:expected_${expectedRegisterShaList.length}_actual_${currentRegisterShaList.length}`,
    );
  } else {
    for (let index = 0; index < currentRegisterShaList.length; index += 1) {
      if (currentRegisterShaList[index] !== expectedRegisterShaList[index]) {
        findings.push(`register_hash_guard_failed:${targets.registerFiles[index]}`);
      }
    }
  }
  if (findings.length) failBeforeMutation(findings);

  await mkdir(backupDir, { recursive: true });
  const backup = await backupTouchedTargets({ liveOpenClawRoot, stateDb, targets, backupDir });

  const restoredPackages = await restoreInternalPackages({ liveOpenClawRoot, pureOpenClawRoot });
  const patchedEntrypoints = await patchEntrypoints(targets);
  const patchedSessionStoreRuntimeAlias = await patchSessionStoreRuntimeAlias(targets);
  const deviceRepair = await repairDeviceMetadataLoop({ stateDb, affectedDeviceId });

  const manifest = await buildManifest({
    status: "applied",
    liveOpenClawRoot,
    pureOpenClawRoot,
    evidenceRoot,
    stateDb,
    affectedDeviceId,
    targets,
    backupDir,
    apply: true,
  });
  manifest.applied = {
    backup,
    restoredPackages,
    patchedEntrypoints,
    patchedSessionStoreRuntimeAlias,
    deviceRepair,
    postApplyPackageSha256: Object.fromEntries(
      await Promise.all(INTERNAL_PACKAGES.map(async (name) => [
        `@openclaw/${name}`,
        await directorySha256(join(liveOpenClawRoot, "node_modules/@openclaw", name)),
      ])),
    ),
  };
  manifest.rollback = {
    restoreFrom: backupDir,
    restartGatewayAfterRestore: true,
  };
  await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "gpao_t.live_runtime_repair_error.v0_1",
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    liveMutationMayHaveExecuted: hasArg("--apply"),
  }, null, 2));
  process.exit(1);
});
