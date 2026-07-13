#!/usr/bin/env node
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const REQUIRED_APPROVAL_TOKEN = "GPAO-T-LIVE-RUNTIME-ROLLBACK-2026-07-12";

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

function failBeforeMutation(findings) {
  console.error(JSON.stringify({
    schema: "gpao_t.live_runtime_repair_rollback_refusal.v0_1",
    status: "blocked_before_live_mutation",
    required: {
      applyFlag: "--apply",
      approvalToken: REQUIRED_APPROVAL_TOKEN,
      manifest: "--manifest /path/to/manifest.json",
    },
    findings,
    liveMutationExecuted: false,
  }, null, 2));
  process.exit(1);
}

async function copyIfExists(source, target) {
  if (!existsSync(source)) return false;
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  return true;
}

async function rollbackPackage({ manifest, packageName, backupDir }) {
  const liveOpenClawRoot = manifest.paths.liveOpenClawRoot;
  const packageDirName = packageName.replace("@openclaw/", "");
  const destination = join(liveOpenClawRoot, "node_modules/@openclaw", packageDirName);
  const backup = join(backupDir, "packages", packageDirName);
  const missingMarker = join(backupDir, "packages", `${packageDirName}.missing`);

  if (existsSync(backup)) {
    await rm(destination, { recursive: true, force: true });
    await cp(backup, destination, { recursive: true });
    return { name: packageName, action: "restored_from_backup" };
  }
  if (existsSync(missingMarker)) {
    await rm(destination, { recursive: true, force: true });
    return { name: packageName, action: "removed_because_missing_before_repair" };
  }
  return { name: packageName, action: "skipped_no_backup_or_missing_marker" };
}

async function main() {
  const manifestPath = readArg("--manifest");
  const apply = hasArg("--apply");
  const findings = [];

  if (!manifestPath || !existsSync(manifestPath)) findings.push("manifest_missing");
  if (!apply) findings.push("apply_flag_required");
  if (readArg("--approval-token") !== REQUIRED_APPROVAL_TOKEN) {
    findings.push("approval_token_missing_or_invalid");
  }
  if (findings.length) failBeforeMutation(findings);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schema !== "gpao_t.live_runtime_repair_manifest.v0_1") {
    failBeforeMutation(["unexpected_manifest_schema"]);
  }
  if (manifest.status !== "applied") {
    failBeforeMutation(["manifest_not_applied"]);
  }

  const backupDir = manifest.paths.backupDir;
  const receiptDir = join(backupDir, "rollback-receipts");
  await mkdir(receiptDir, { recursive: true });

  const restored = {
    entrypoints: [],
    stateFiles: [],
    packages: [],
  };

  for (const entry of manifest.applied?.backup?.entrypoints ?? []) {
    const source = join(backupDir, entry.backup);
    if (await copyIfExists(source, entry.source)) {
      restored.entrypoints.push(entry.source);
    }
  }

  for (const stateFile of manifest.applied?.backup?.stateFiles ?? []) {
    const source = join(backupDir, stateFile.backup);
    if (await copyIfExists(source, stateFile.source)) {
      restored.stateFiles.push(stateFile.source);
    }
  }

  const packageNames = [
    "@openclaw/normalization-core",
    "@openclaw/markdown-core",
    "@openclaw/llm-core",
    "@openclaw/ai",
  ];
  for (const packageName of packageNames) {
    restored.packages.push(await rollbackPackage({ manifest, packageName, backupDir }));
  }

  const receipt = {
    schema: "gpao_t.live_runtime_repair_rollback_receipt.v0_1",
    status: "rolled_back",
    createdAt: new Date().toISOString(),
    manifestPath,
    backupDir,
    restored,
    requiredNextStep: "restart_live_gateway_and_rerun_health_device_rpc_smoke",
    authority: {
      liveMutationExecuted: true,
      externalSend: "blocked",
      durableMemoryPromotion: "blocked",
      connectorWrite: "blocked",
    },
  };

  const receiptPath = join(
    receiptDir,
    `rollback-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ...receipt, receiptPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "gpao_t.live_runtime_repair_rollback_error.v0_1",
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    liveMutationMayHaveExecuted: hasArg("--apply"),
  }, null, 2));
  process.exit(1);
});
