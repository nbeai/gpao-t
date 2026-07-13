import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const CLEANUP = fileURLToPath(new URL("../tools/cleanup-live-gpao-t-test-sessions.mjs", import.meta.url));
const TOKEN = "GPAO-T-LIVE-TEST-SESSION-CLEANUP-2026-07-12";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-cleanup-test-"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function parseJson(stdout) {
  return JSON.parse(String(stdout || "{}"));
}

describe("live test session cleanup tool", () => {
  it("defaults to the independent GPAO-T state root", () => {
    const source = readFileSync(CLEANUP, "utf8");
    assert.match(source, /\/Users\/jyp\/\.gpao-t\/agents\/main\/sessions\/sessions\.json/);
    assert.doesNotMatch(source, /DEFAULT_SESSIONS_INDEX = "\/Users\/jyp\/\.openclaw/);
  });

  it("does not fail or mutate when the legacy JSONL session index is absent", () => {
    const root = tempRoot();
    const missingIndex = join(root, "missing", "sessions.json");
    const evidenceRoot = join(root, "evidence");
    const result = parseJson(execFileSync(process.execPath, [
      CLEANUP,
      "--sessions-index",
      missingIndex,
      "--evidence-root",
      evidenceRoot,
      "--apply",
      "--approval-token",
      TOKEN,
    ], { encoding: "utf8" }));

    assert.equal(result.status, "no_legacy_session_index");
    assert.equal(result.matchedCount, 0);
    assert.equal(result.applied, false);
    assert.match(result.boundaries.target, /SQLite-backed sessions are not mutated/);
  });

  it("dry-runs, requires a token, backs up, removes QA entries, and preserves normal sessions", () => {
    const root = tempRoot();
    const sessionsDir = join(root, "sessions");
    const sessionsIndex = join(sessionsDir, "sessions.json");
    const evidenceRoot = join(root, "evidence");
    const qaFile = join(sessionsDir, "qa.jsonl");
    const normalFile = join(sessionsDir, "main.jsonl");
    writeText(qaFile, "{\"role\":\"user\",\"content\":\"qa\"}\n");
    writeText(`${qaFile}.codex-app-server.json`, "{}\n");
    writeText(qaFile.replace(/\.jsonl$/, ".trajectory.jsonl"), "{}\n");
    writeText(qaFile.replace(/\.jsonl$/, ".trajectory-path.json"), "{}\n");
    writeText(normalFile, "{\"role\":\"user\",\"content\":\"main\"}\n");
    writeJson(sessionsIndex, {
      "agent:main:gpao-t-live-conversation-qa-temp:baseline": {
        sessionId: "qa",
        sessionFile: qaFile,
        status: "done",
      },
      "agent:main:main": {
        sessionId: "main",
        sessionFile: normalFile,
        status: "done",
      },
    });

    const dryRun = parseJson(execFileSync(process.execPath, [
      CLEANUP,
      "--sessions-index",
      sessionsIndex,
      "--evidence-root",
      evidenceRoot,
    ], { encoding: "utf8" }));
    assert.equal(dryRun.status, "dry_run");
    assert.equal(dryRun.matchedCount, 1);
    assert.equal(existsSync(qaFile), true);

    const blocked = spawnSync(process.execPath, [
      CLEANUP,
      "--sessions-index",
      sessionsIndex,
      "--evidence-root",
      evidenceRoot,
      "--apply",
      "--approval-token",
      "wrong",
    ], { encoding: "utf8" });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /approval_token_required/);

    const applied = parseJson(execFileSync(process.execPath, [
      CLEANUP,
      "--sessions-index",
      sessionsIndex,
      "--evidence-root",
      evidenceRoot,
      "--apply",
      "--approval-token",
      TOKEN,
    ], { encoding: "utf8" }));
    const after = JSON.parse(readFileSync(sessionsIndex, "utf8"));

    assert.equal(applied.status, "applied");
    assert.equal(applied.deletedEntries.length, 1);
    assert.equal(after["agent:main:gpao-t-live-conversation-qa-temp:baseline"], undefined);
    assert.ok(after["agent:main:main"]);
    assert.equal(existsSync(qaFile), false);
    assert.equal(existsSync(normalFile), true);
    assert.equal(existsSync(join(applied.evidenceRoot, "sessions.before.json")), true);
    assert.equal(existsSync(join(applied.evidenceRoot, "cleanup-result.json")), true);
  });
});
