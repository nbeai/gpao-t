import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildReplayRecoveryView } from "./replay-recovery.js";
import { runtimePaths } from "./storage.js";

const RECOVERY_HISTORY_FILE = "recovery/history.jsonl";

export function recoveryHistoryPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, RECOVERY_HISTORY_FILE);
}

export function appendReplayRecoveryRecord({
  fixture,
  fixturePath,
  root,
  now = new Date().toISOString(),
} = {}) {
  const view = buildReplayRecoveryView({ fixture, fixturePath, root });
  const representativeAnchor =
    view.admitted
      .filter((cell) => cell.role === "anchor")
      .sort((a, b) => b.admissionScore - a.admissionScore)[0] || null;
  const record = {
    schema: "gpao_t.replay_recovery_record.v0_1",
    id: `recovery.${Date.parse(now) || 0}.${view.activeTarget.id || "unknown"}`,
    createdAt: now,
    fixturePath: fixturePath || "inline-fixture",
    status: view.recovery.status,
    activeTarget: view.activeTarget,
    representativeAnchor,
    admittedCount: view.admitted.length,
    rejectedCount: view.rejected.length,
    nextSafeAction: view.nextSafeAction,
    view,
  };
  const file = recoveryHistoryPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

export function readReplayRecoveryHistory({ root, limit = 50 } = {}) {
  const file = recoveryHistoryPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildRecoveryHistorySummary({ root, limit = 50 } = {}) {
  const records = readReplayRecoveryHistory({ root, limit });
  const byStatus = countBy(records, (record) => record.status);
  const byTarget = countBy(records, (record) => record.activeTarget?.id || "unknown");
  const repeatedTargets = Object.entries(byTarget)
    .filter(([, count]) => count > 1)
    .map(([target, count]) => ({ target, count }));
  const latest = records.at(-1) || null;

  return {
    schema: "gpao_t.recovery_history_summary.v0_1",
    status: records.length ? "ready" : "empty",
    totalRecords: records.length,
    byStatus,
    byTarget,
    repeatedTargets,
    latest: latest && {
      id: latest.id,
      status: latest.status,
      activeTarget: latest.activeTarget,
      representativeAnchor: latest.representativeAnchor?.id || null,
      nextSafeAction: latest.nextSafeAction,
    },
    nextSafeAction: records.length
      ? "Review repeated targets and promote only replay-proven improvements through explicit gates."
      : "Record a replay recovery view before looking for recovery patterns.",
  };
}

function countBy(records, selector) {
  return records.reduce((acc, record) => {
    const key = selector(record);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
