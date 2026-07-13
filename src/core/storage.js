import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RUNTIME_DIR = ".gpao-t";
const STATE_FILE = "state/runtime.json";
const EVENT_FILE = "events/audit.jsonl";

export function runtimePaths({ root = PACKAGE_ROOT } = {}) {
  const runtimeRoot = resolve(root, RUNTIME_DIR);
  return {
    root,
    runtimeRoot,
    stateFile: resolve(runtimeRoot, STATE_FILE),
    eventFile: resolve(runtimeRoot, EVENT_FILE),
  };
}

export function initializeRuntimeState({ root = PACKAGE_ROOT, now = new Date().toISOString() } = {}) {
  const paths = runtimePaths({ root });
  mkdirSync(dirname(paths.stateFile), { recursive: true });
  mkdirSync(dirname(paths.eventFile), { recursive: true });

  if (!existsSync(paths.stateFile)) {
    writeRuntimeState(defaultRuntimeState({ root, now }), { root });
    appendAuditEvent({
      type: "runtime.initialized",
      summary: "GPAO-T local runtime state initialized.",
      payload: { runtimeRoot: paths.runtimeRoot },
    }, { root, now });
  }

  return readRuntimeState({ root });
}

export function readRuntimeState({ root = PACKAGE_ROOT } = {}) {
  const paths = runtimePaths({ root });
  if (!existsSync(paths.stateFile)) {
    return defaultRuntimeState({ root });
  }
  return JSON.parse(readFileSync(paths.stateFile, "utf8"));
}

export function writeRuntimeState(state, { root = PACKAGE_ROOT } = {}) {
  const paths = runtimePaths({ root });
  mkdirSync(dirname(paths.stateFile), { recursive: true });
  writeFileSync(paths.stateFile, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

export function appendAuditEvent(event, { root = PACKAGE_ROOT, now = new Date().toISOString() } = {}) {
  const paths = runtimePaths({ root });
  mkdirSync(dirname(paths.eventFile), { recursive: true });
  const record = {
    schema: "gpao_t.audit_event.v0_1",
    id: event.id || `evt.${Date.parse(now) || 0}.${event.type || "event"}`,
    type: event.type || "runtime.event",
    createdAt: now,
    authority: event.authority || "local_only",
    summary: event.summary || "",
    payload: event.payload || {},
  };
  writeFileSync(paths.eventFile, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

export function readAuditEvents({ root = PACKAGE_ROOT, limit = 50 } = {}) {
  const paths = runtimePaths({ root });
  return readJsonlTail(paths.eventFile, { limit });
}

export function readJsonlTail(filePath, { limit = 50, dedupeKey, tolerateInvalid = false } = {}) {
  if (!existsSync(filePath)) return [];
  const records = readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-Math.max(limit * 4, limit))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        if (tolerateInvalid) return null;
        throw error;
      }
    })
    .filter(Boolean);
  if (!dedupeKey) return records.slice(-limit);
  const seen = new Set();
  const deduped = [];
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    const key = typeof dedupeKey === "function" ? dedupeKey(record) : record?.[dedupeKey];
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(record);
    if (deduped.length >= limit) break;
  }
  return deduped.reverse();
}

function defaultRuntimeState({ root = PACKAGE_ROOT, now = new Date().toISOString() } = {}) {
  return {
    schema: "gpao_t.runtime_state.v0_1",
    runtimeId: "gpao-t-local",
    version: "0.1.0",
    installRoot: root,
    startedAt: now,
    updatedAt: now,
    activeFlow: null,
    counters: {
      turns: 0,
      approvalsNeeded: 0,
      events: 0,
    },
    boundaries: {
      externalActivation: "blocked",
      durableMemoryPromotion: "blocked",
      publicRelease: "blocked",
      localPreview: "allowed",
    },
  };
}
