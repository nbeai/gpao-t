#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const workspace = "/Users/jyp/Developer";
const gpaoRoot = join(workspace, "gpao-t");
const liveDist = "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const stageDir = join(
  gpaoRoot,
  "docs/03-verification/evidence/live-patch-stage/openclaw-answer-replay-evaluation-inplace-2026-07-11",
);
const previousBackupDir = join(
  gpaoRoot,
  "docs/03-verification/evidence/live-backups/openclaw-live-gpao-bridge-2026-07-11-before-patch",
);
const evidenceDir = join(
  gpaoRoot,
  "docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11",
);
const snapshotDir = join(evidenceDir, "live-readback-snapshot");
const gpaoMethods = [
  "gpao.appliedReplayInspector.get",
  "gpao.chatPreflight.prepare",
  "gpao.chatPostAnswerReplay.record",
  "gpao.chatAnswerReplay.evaluate",
];
const liveGpaoBridgeSelection = await findGpaoBridgeName(liveDist, { allowMultiple: true });
const liveGpaoBridgeName = liveGpaoBridgeSelection.selected;
const stagedGpaoBridgeName = existsSync(stageDir)
  ? await findGpaoBridgeName(stageDir, { allowMultiple: true }).then((result) => result.selected).catch(() => liveGpaoBridgeName)
  : liveGpaoBridgeName;

const files = {
  serverMethods: {
    live: join(liveDist, "server-methods-B64pXQ-G.js"),
    staged: join(stageDir, "server-methods-B64pXQ-G.js"),
    previousBackup: join(previousBackupDir, "server-methods-B64pXQ-G.js"),
    requiredNeedles: [
      "const loadGpaoTHandlers = lazyHandlerModule",
      ...gpaoMethods.map((method) => `"${method}"`),
    ],
  },
  coreDescriptors: {
    live: join(liveDist, "core-descriptors-B2lASufG.js"),
    staged: join(stageDir, "core-descriptors-B2lASufG.js"),
    previousBackup: join(previousBackupDir, "core-descriptors-B2lASufG.js"),
    requiredNeedles: gpaoMethods.map((method) => `name: "${method}"`),
  },
  gpaoBridge: {
    live: join(liveDist, liveGpaoBridgeName),
    staged: join(stageDir, stagedGpaoBridgeName),
    previousBackup: null,
    requiredNeedles: ["gpaoTHandlers"],
  },
  controlUiIndex: {
    live: join(liveDist, "control-ui/index.html"),
    staged: null,
    previousBackup: join(previousBackupDir, "control-ui/index.html"),
    requiredNeedles: [],
  },
};

async function findGpaoBridgeName(dir, { allowMultiple = false } = {}) {
  const names = (await readdir(dir)).filter((name) => /^gpao-t-.*\.js$/.test(name)).sort();
  if (!allowMultiple && names.length !== 1) {
    throw new Error(`Expected exactly one gpao-t bridge chunk in ${dir}, found ${names.length}`);
  }
  if (!names.length) {
    throw new Error(`Expected at least one gpao-t bridge chunk in ${dir}, found 0`);
  }
  const scored = [];
  for (const name of names) {
    const text = await readFile(join(dir, name), "utf8");
    scored.push({
      name,
      score: [
        "gpaoTHandlers",
        "gpao.chatPreflight.prepare",
        "gpao.chatPostAnswerReplay.record",
        "gpao.chatAnswerReplay.evaluate",
      ].filter((needle) => text.includes(needle)).length,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    selected: scored[0].name,
    all: names,
    stale: names.filter((name) => name !== scored[0].name),
  };
}

async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

async function fileInfo(path) {
  if (!path || !existsSync(path)) {
    return {
      exists: false,
      path,
    };
  }
  const info = await stat(path);
  return {
    exists: true,
    path,
    bytes: info.size,
    mtime: info.mtime.toISOString(),
    sha256: await sha256(path),
  };
}

async function hasNeedles(path, needles) {
  if (!path || !existsSync(path)) return [];
  const text = await readFile(path, "utf8");
  return needles.map((needle) => ({
    needle,
    present: text.includes(needle),
  }));
}

async function lineDiffSummary(beforePath, afterPath, labels = {}) {
  if (!beforePath || !afterPath || !existsSync(beforePath) || !existsSync(afterPath)) {
    return {
      available: false,
      beforePath,
      afterPath,
      reason: "missing_before_or_after",
    };
  }
  const before = (await readFile(beforePath, "utf8")).split("\n");
  const after = (await readFile(afterPath, "utf8")).split("\n");
  const max = Math.max(before.length, after.length);
  const changed = [];
  for (let index = 0; index < max; index += 1) {
    if (before[index] !== after[index]) {
      changed.push({
        line: index + 1,
        before: before[index] ?? "",
        after: after[index] ?? "",
      });
    }
  }
  return {
    available: true,
    beforePath,
    afterPath,
    beforeLabel: labels.before || "previous backup",
    afterLabel: labels.after || "current live",
    changedLineCount: changed.length,
    sample: changed.slice(0, 12),
  };
}

async function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) count += await countFiles(full);
    if (entry.isFile()) count += 1;
  }
  return count;
}

async function main() {
  await mkdir(snapshotDir, { recursive: true });

  const fileReports = {};
  for (const [id, entry] of Object.entries(files)) {
    const liveInfo = await fileInfo(entry.live);
    const stagedInfo = await fileInfo(entry.staged);
    const previousBackupInfo = await fileInfo(entry.previousBackup);
    const snapshotPath = liveInfo.exists ? join(snapshotDir, basename(entry.live)) : null;
    if (snapshotPath) await cp(entry.live, snapshotPath);

    fileReports[id] = {
      live: liveInfo,
      staged: stagedInfo,
      previousBackup: previousBackupInfo,
      snapshot: snapshotPath ? await fileInfo(snapshotPath) : { exists: false, path: snapshotPath },
      requiredNeedles: await hasNeedles(entry.live, entry.requiredNeedles),
      previousBackupToCurrentLiveDiff: await lineDiffSummary(entry.previousBackup, entry.live, {
        before: "previous backup",
        after: "current live",
      }),
      stagedToCurrentLiveDiff: await lineDiffSummary(entry.staged, entry.live, {
        before: "staged patch",
        after: "current live",
      }),
    };
  }

  const controlUiDir = join(liveDist, "control-ui");
  const previousControlUiDir = join(previousBackupDir, "control-ui");
  const findings = [];
  for (const [id, report] of Object.entries(fileReports)) {
    if (!report.live.exists) findings.push(`${id}_live_missing`);
    for (const needle of report.requiredNeedles) {
      if (!needle.present) findings.push(`${id}_needle_missing:${needle.needle}`);
    }
  }
  if (!existsSync(previousBackupDir)) findings.push("previous_backup_dir_missing");
  for (const stale of liveGpaoBridgeSelection.stale) {
    findings.push(`stale_live_gpao_bridge_chunk:${stale}`);
  }

  const manifest = {
    schema: "gpao_t.openclaw_live_hook_preview_manifest.v0_1",
    status: findings.length
      ? "review"
      : "preview_ready_live_already_contains_gpao_bridge",
    generatedAt: new Date().toISOString(),
    phase: "Pre-Release Candidate Phase 3",
    purpose:
      "Read current live OpenClaw bridge state and prepare preview/rollback evidence without writing live files.",
    liveDist,
    stageDir,
    previousBackupDir,
    evidenceDir,
    snapshotDir,
    currentLiveBridgeDetected: findings.length === 0,
    liveGpaoBridgeSelection,
    liveMutationExecutedByThisRun: false,
    gatewayRestartExecutedByThisRun: false,
    telegramExternalSendExecutedByThisRun: false,
    fileReports,
    controlUi: {
      liveDir: controlUiDir,
      previousBackupDir: previousControlUiDir,
      liveFileCount: await countFiles(controlUiDir),
      previousBackupFileCount: await countFiles(previousControlUiDir),
      snapshotPolicy:
        "This preview snapshots touched JS files and control-ui index only. Full control-ui backup exists in previous backup dir and must be refreshed immediately before any future authorized apply.",
    },
    rollbackPlan: {
      mode: "not_executed_preview_only",
      restoreServerMethodsFrom: files.serverMethods.previousBackup,
      restoreCoreDescriptorsFrom: files.coreDescriptors.previousBackup,
      restoreControlUiFrom: previousControlUiDir,
      removeGpaoBridgeIfRollingBackBridge: files.gpaoBridge.live,
      requiredAfterRollback: [
        "verify OpenClaw Gateway health",
        "verify dashboard load",
        "verify gpao.appliedReplayInspector.get descriptor is absent when rolling back this bridge",
        "verify no duplicate Gateway process remains",
      ],
    },
    restartPlan: {
      status: "approval_required_not_executed",
      allowedNow: false,
      notes: [
        "Identify current Gateway process or LaunchAgent by readback before restart.",
        "Restart must reuse the same profile and state-dir.",
        "Do not restart during preview package generation.",
      ],
    },
    visualQaPlan: {
      status: "required_after_authorized_apply_or_readback_review",
      requiredEvidence: [
        "desktop Safari dashboard screenshot",
        "mobile/narrow dashboard screenshot",
        "Control Center live-turn lane screenshot",
        "browser console check with no new bridge errors",
      ],
    },
    smokePlan: {
      localOnlyBeforeLiveApply: [
        "node bin/gpao-t.js live-turn run-answer <message> ::: <answer>",
        "node bin/gpao-t.js live-turn verify",
        "node bin/gpao-t.js openclaw live-turn-hook-readiness-check",
      ],
      liveAfterSeparateApproval: [
        "one controlled OpenClaw web chat turn",
        "Telegram direct turn only if explicitly approved for real external path",
      ],
    },
    authorityBoundary: {
      liveOpenClawFileWrite: "not_executed_by_this_run",
      gatewayRestart: "not_executed_by_this_run",
      telegramExternalSend: "not_executed_by_this_run",
      providerBehaviorChange: "blocked",
      openClawMemoryWrite: "blocked",
      durableMemoryPromotion: "blocked",
      publicRelease: "blocked",
      destructiveRollback: "blocked",
    },
    findings,
    nextSafeAction: findings.length
      ? "Repair preview findings before any live apply decision."
      : "Review this preview package, then proceed to package/readback and visual QA planning without live mutation.",
  };

  await writeFile(join(evidenceDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(evidenceDir, "README.md"), renderMarkdown(manifest));
  console.log(JSON.stringify(manifest, null, 2));
}

function renderMarkdown(manifest) {
  const rows = Object.entries(manifest.fileReports)
    .map(([id, report]) =>
      `| ${id} | ${report.live.exists ? "present" : "missing"} | ${report.live.sha256 || "-"} | ${report.previousBackupToCurrentLiveDiff.changedLineCount ?? "-"} | ${report.stagedToCurrentLiveDiff.changedLineCount ?? "-"} |`,
    )
    .join("\n");

  return `# OpenClaw Live Hook Preview Manifest

Status: ${manifest.status}
Generated: ${manifest.generatedAt}

This is a preview/readback package only. It did not write live OpenClaw files, restart Gateway, send Telegram messages, promote durable memory, or publish anything.

## Files

| id | live | live sha256 | previous backup -> live changed lines | staged -> live changed lines |
| --- | --- | --- | --- | --- |
${rows}

## Authority Boundary

- Live OpenClaw file write: ${manifest.authorityBoundary.liveOpenClawFileWrite}
- Gateway restart: ${manifest.authorityBoundary.gatewayRestart}
- Telegram/external send: ${manifest.authorityBoundary.telegramExternalSend}
- OpenClaw memory write: ${manifest.authorityBoundary.openClawMemoryWrite}
- Durable memory promotion: ${manifest.authorityBoundary.durableMemoryPromotion}
- Public release: ${manifest.authorityBoundary.publicRelease}

## Next

${manifest.nextSafeAction}
`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
