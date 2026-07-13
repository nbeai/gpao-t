#!/usr/bin/env node
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const DEFAULT_SESSIONS_INDEX = "/Users/jyp/.gpao-t/agents/main/sessions/sessions.json";
const DEFAULT_EVIDENCE_ROOT =
  "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-test-session-cleanup";
const REQUIRED_TOKEN = "GPAO-T-LIVE-TEST-SESSION-CLEANUP-2026-07-12";
const DEFAULT_PATTERNS = [
  "gpao-t conversation qa",
  "gpao-t-live-conversation-qa",
  "gpao-t-conversation-qa",
  "gpao-t-runtime-smoke",
  "GPAO-T conversation QA",
  "대화-qa-",
];

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relatedFilesFor(entry) {
  const files = [];
  if (entry?.sessionFile) {
    files.push(entry.sessionFile);
    files.push(`${entry.sessionFile}.codex-app-server.json`);
    files.push(`${entry.sessionFile}.codex-app-server.json.migrated`);
    files.push(entry.sessionFile.replace(/\.jsonl$/, ".trajectory.jsonl"));
    files.push(entry.sessionFile.replace(/\.jsonl$/, ".trajectory-path.json"));
  }
  if (entry?.trajectoryFile) files.push(entry.trajectoryFile);
  if (entry?.trajectoryPathFile) files.push(entry.trajectoryPathFile);
  return unique(files);
}

function matchesPatterns(key, entry, patterns) {
  const haystack = `${key}\n${entry?.sessionKey || ""}\n${entry?.displayName || ""}\n${entry?.label || ""}`;
  return patterns.some((pattern) => haystack.includes(pattern));
}

async function copyIfExists(source, targetDir) {
  try {
    const target = join(targetDir, basename(source));
    await copyFile(source, target);
    return { source, target, copied: true };
  } catch (error) {
    if (error?.code === "ENOENT") return { source, copied: false, reason: "missing" };
    throw error;
  }
}

async function main() {
  const apply = hasArg("--apply");
  const token = readArg("--approval-token", "");
  const sessionsIndex = readArg("--sessions-index", DEFAULT_SESSIONS_INDEX);
  const evidenceRoot = readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT);
  const patterns = process.argv
    .filter((arg, index, args) => args[index - 1] === "--pattern")
    .concat(DEFAULT_PATTERNS);
  const cleanupId = `cleanup-${isoStamp()}`;
  const backupRoot = join(evidenceRoot, cleanupId);
  let raw = "";
  try {
    raw = await readFile(sessionsIndex, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const report = {
      schema: "gpao_t.live_test_session_cleanup.v0_1",
      status: "no_legacy_session_index",
      cleanupId,
      sessionsIndex,
      evidenceRoot: backupRoot,
      matchedCount: 0,
      patterns: unique(patterns),
      matched: [],
      applied: false,
      deletedEntries: [],
      archivedFiles: [],
      removedFiles: [],
      boundaries: {
        target: "legacy JSONL sessions index only; SQLite-backed sessions are not mutated by this cleanup tool",
        backupRequired: false,
        approvalTokenRequired: REQUIRED_TOKEN,
      },
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const sessions = JSON.parse(raw);
  const matched = Object.entries(sessions)
    .filter(([key, entry]) => matchesPatterns(key, entry, patterns))
    .map(([key, entry]) => ({
      key,
      sessionId: entry?.sessionId || null,
      sessionFile: entry?.sessionFile || null,
      status: entry?.status || null,
      relatedFiles: relatedFilesFor(entry),
    }));

  const report = {
    schema: "gpao_t.live_test_session_cleanup.v0_1",
    status: apply ? "planned" : "dry_run",
    cleanupId,
    sessionsIndex,
    evidenceRoot: backupRoot,
    matchedCount: matched.length,
    patterns: unique(patterns),
    matched,
    applied: false,
    deletedEntries: [],
    archivedFiles: [],
    removedFiles: [],
    boundaries: {
      target: "live GPAO-T OpenClaw session index and related QA transcripts only",
      backupRequired: true,
      approvalTokenRequired: REQUIRED_TOKEN,
    },
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (token !== REQUIRED_TOKEN) {
    console.error(JSON.stringify({
      ...report,
      status: "blocked",
      reason: "approval_token_required",
    }, null, 2));
    process.exit(1);
  }

  await mkdir(backupRoot, { recursive: true });
  await writeFile(join(backupRoot, "sessions.before.json"), raw);
  await writeFile(join(backupRoot, "cleanup-plan.json"), `${JSON.stringify(report, null, 2)}\n`);

  const nextSessions = { ...sessions };
  for (const item of matched) delete nextSessions[item.key];
  const nextRaw = `${JSON.stringify(nextSessions, null, 2)}\n`;
  const tempIndex = `${sessionsIndex}.${cleanupId}.tmp`;
  await writeFile(tempIndex, nextRaw);
  await rename(tempIndex, sessionsIndex);
  await writeFile(join(backupRoot, "sessions.after.json"), nextRaw);

  for (const item of matched) {
    report.deletedEntries.push(item.key);
    const fileBackupRoot = join(backupRoot, item.sessionId || item.key.replace(/[^0-9A-Za-z가-힣._-]+/g, "_"));
    await mkdir(fileBackupRoot, { recursive: true });
    for (const file of item.relatedFiles) {
      const archive = await copyIfExists(file, fileBackupRoot);
      report.archivedFiles.push(archive);
      if (archive.copied) {
        await rm(file, { force: true });
        report.removedFiles.push(file);
      }
    }
  }

  report.status = "applied";
  report.applied = true;
  await writeFile(join(backupRoot, "cleanup-result.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "gpao_t.live_test_session_cleanup_error.v0_1",
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
