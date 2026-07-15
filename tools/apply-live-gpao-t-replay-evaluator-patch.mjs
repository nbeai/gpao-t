#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_DIST = process.env.GPAO_T_LIVE_DIST
  || "/Users/jyp/.gpao-t/current/compatibility/gpao-t/dist";
const BACKUP_ROOT = process.env.GPAO_T_REPLAY_EVALUATOR_BACKUP_ROOT
  || "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-replay-evaluator-patch";
const APPLY_TOKEN = "apply-gpao-t-replay-evaluator-live";

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`);
  return source.replace(from, to);
}

export function patchReplayEvaluatorSource(source) {
  if (!source.includes("function buildBridgeAnswerReplayEvaluation(")) return source;
  let patched = source;
  patched = replaceRequired(
    patched,
    "\tconst targetScore = scoreSignals(answerText, replayTokens([targetSignal, stringParam(params.userExpectation)].join(\" \")));",
    [
      "\tconst targetText = [targetSignal, stringParam(params.userExpectation)].join(\" \");",
      "\tconst targetScore = scoreSignals(answerText, replayTokens(targetText));",
      "\tconst explicitMarkers = replayExplicitMarkers(targetText);",
      "\tconst explicitMarkerScore = scoreSignals(answerText, explicitMarkers);",
      "\tconst targetSignalPresent = targetScore > 0 || explicitMarkerScore > 0;",
    ].join("\n"),
    "target scoring",
  );
  patched = replaceRequired(
    patched,
    "\tif (answerText && targetSignal && targetScore <= 0) findings.push(\"active_target_signal_missing\");",
    "\tif (answerText && targetSignal && !targetSignalPresent) findings.push(\"active_target_signal_missing\");",
    "target finding",
  );
  patched = replaceRequired(
    patched,
    "\t\t\tanswerKeepsActiveTarget: answerText ? targetScore > 0 ? \"review_signal_present\" : \"review_signal_missing\" : \"blocked\",",
    "\t\t\tanswerKeepsActiveTarget: answerText ? targetSignalPresent ? \"review_signal_present\" : \"review_signal_missing\" : \"blocked\",",
    "target replay status",
  );
  patched = replaceRequired(
    patched,
    "\t\t\tactiveTargetSignalScore: targetScore,\n\t\t\tanswerChars: answerText.length",
    "\t\t\tactiveTargetSignalScore: targetScore,\n\t\t\texplicitMarkerSignalScore: explicitMarkerScore,\n\t\t\texplicitMarkers,\n\t\t\tanswerChars: answerText.length",
    "target measurements",
  );
  patched = replaceRequired(
    patched,
    "function scoreSignals(text, tokens) {",
    [
      "function replayExplicitMarkers(value) {",
      "\treturn [...new Set(value.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/gi) || [])].map((marker) => marker.toLowerCase()).slice(0, 12);",
      "}",
      "function scoreSignals(text, tokens) {",
    ].join("\n"),
    "explicit marker helper",
  );
  return patched;
}

export async function patchReplayEvaluatorFiles({
  distRoot,
  write = false,
  backupDir = "",
} = {}) {
  const results = [];
  const names = (await readdir(distRoot))
    .filter((name) => /^gpao-t-[A-Za-z0-9_-]+\.js$/.test(name))
    .sort();
  for (const name of names) {
    const path = join(distRoot, name);
    const before = await readFile(path, "utf8");
    const after = patchReplayEvaluatorSource(before);
    if (before === after) continue;
    if (write) {
      if (backupDir) {
        await mkdir(backupDir, { recursive: true });
        await copyFile(path, join(backupDir, basename(path)));
      }
      await writeFile(path, after);
    }
    results.push({
      file: path,
      beforeSha256: sha256(before),
      afterSha256: sha256(after),
    });
  }
  return results;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && arg("--token") !== APPLY_TOKEN) {
    throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
  }
  const backupDir = apply ? join(BACKUP_ROOT, stamp()) : "";
  const results = await patchReplayEvaluatorFiles({
    distRoot: LIVE_DIST,
    write: apply,
    backupDir,
  });
  const report = {
    schema: "gpao_t.live_replay_evaluator_patch.v0_1",
    status: apply ? "applied" : "dry_run",
    createdAt: new Date().toISOString(),
    liveDist: LIVE_DIST,
    changedFileCount: results.length,
    backupDir: apply ? backupDir : null,
    results,
  };
  await mkdir(BACKUP_ROOT, { recursive: true });
  await writeFile(
    join(BACKUP_ROOT, apply ? "apply-result.json" : "dry-run-result.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
