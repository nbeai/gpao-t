import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

const SCRIPT = new URL("../tools/audit-live-gpao-t-tool-parity.mjs", import.meta.url).pathname;

function writeJson(dir, name, value) {
  const path = join(dir, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function runAudit({ plugins, status, doctor, config = { tools: { profile: "coding", alsoAllow: ["browser"] } } }) {
  const dir = mkdtempSync(join(tmpdir(), "gpao-t-tool-parity-"));
  const pluginsPath = writeJson(dir, "plugins.json", plugins);
  const statusPath = writeJson(dir, "status.json", status);
  const doctorPath = writeJson(dir, "doctor.json", doctor);
  const configPath = writeJson(dir, "config.json", config);
  const result = spawnSync("node", [
    SCRIPT,
    "--plugins-json",
    pluginsPath,
    "--status-json",
    statusPath,
    "--doctor-json",
    doctorPath,
    "--config-json",
    configPath,
  ], { encoding: "utf8" });
  assert.equal(result.stderr, "");
  assert.ok(result.stdout);
  return JSON.parse(result.stdout);
}

function runQuietAudit({ plugins, doctor, config }) {
  const dir = mkdtempSync(join(tmpdir(), "gpao-t-tool-parity-quiet-"));
  const pluginsPath = writeJson(dir, "plugins.json", plugins);
  const doctorPath = writeJson(dir, "doctor.json", doctor);
  const configPath = writeJson(dir, "config.json", config);
  const sessionsPath = writeJson(dir, "sessions.json", { main: {}, telegram: {} });
  const memoryIndexPath = writeJson(dir, "search-index.json", {
    status: "ready",
    engine: { mode: "local_hybrid_memory_search" },
    counts: { documents: 94 },
  });
  const healthPath = writeJson(dir, "health.json", { ok: true, status: "live" });
  const result = spawnSync("node", [
    SCRIPT,
    "--cli",
    join(dir, "must-not-be-called.mjs"),
    "--plugins-json",
    pluginsPath,
    "--doctor-json",
    doctorPath,
    "--config-json",
    configPath,
    "--sessions-json",
    sessionsPath,
    "--memory-index-json",
    memoryIndexPath,
    "--health-json",
    healthPath,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function plugin(id, enabled, extra = {}) {
  return {
    id,
    enabled,
    status: enabled ? "enabled" : "disabled",
    commands: [],
    contracts: {},
    dependencyStatus: {
      requiredInstalled: true,
      missing: [],
    },
    ...extra,
  };
}

test("tool parity audit blocks P0 when readability is present but disabled", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", false, { contracts: { webContentExtractors: ["readability"] } }),
      ],
    },
    status: {
      sessions: { count: 2 },
      gateway: { reachable: true },
      gatewayService: { installed: false },
      memory: {
        provider: "none",
        dirty: false,
        fts: { enabled: true, available: true },
        vector: { enabled: false },
        custom: { searchMode: "hybrid", indexIdentity: { status: "valid" } },
      },
    },
    doctor: {
      ok: false,
      findings: [
        { checkId: "core/doctor/security", severity: "warning", message: "plaintext" },
      ],
    },
  });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.summary.p0Blocked, ["web_readability"]);
  const readability = report.results.find((result) => result.id === "web_readability");
  assert.equal(readability.status, "blocked");
  assert.ok(readability.findings.includes("web-readability_disabled"));
  assert.ok(report.summary.p1Review.includes("launch_agent"));
  assert.ok(report.summary.p1Review.includes("secret_refs"));
});

test("tool parity audit catches a loaded browser blocked by the active tool profile", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
        plugin("browser", true, { commands: ["browser"], contracts: { tools: ["browser"] } }),
      ],
    },
    status: {
      sessions: { count: 1 },
      gateway: { reachable: true },
      gatewayService: { installed: true },
    },
    doctor: { ok: true, findings: [] },
    config: { tools: { profile: "coding" } },
  });

  const browser = report.results.find((result) => result.id === "browser_control");
  assert.equal(browser.status, "review");
  assert.ok(browser.findings.includes("browser_tool_profile_blocked"));
  assert.equal(browser.evidence.toolProfile.allowed, false);
});

test("tool parity audit separates local file work from paired-node transfer", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
        plugin("file-transfer", true, {
          commands: ["file_fetch", "dir_list", "dir_fetch", "file_write"],
          contracts: { tools: ["file_fetch", "dir_list", "dir_fetch", "file_write"] },
        }),
      ],
    },
    status: {
      sessions: { count: 1 },
      gateway: { reachable: true },
      gatewayService: { installed: true },
    },
    doctor: { ok: true, findings: [] },
    config: { tools: { profile: "coding", alsoAllow: ["browser"] } },
  });

  const localFiles = report.results.find((result) => result.id === "file_read_write");
  const pairedFiles = report.results.find((result) => result.id === "paired_node_file_transfer");
  assert.equal(localFiles.status, "ready");
  assert.equal(localFiles.evidence.coreTools.ready, true);
  assert.equal(localFiles.evidence.coreTools.liveProofRequired, true);
  assert.equal(pairedFiles.status, "approval_required");
  assert.ok(pairedFiles.findings.includes("paired_node_file_transfer_requires_explicit_tool_allow"));
});

test("tool parity audit distinguishes approval-required P1 tools from P0 failures", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
        plugin("browser", false, { commands: ["browser"], contracts: { tools: ["browser"] } }),
      ],
    },
    status: {
      sessions: { count: 1 },
      gateway: { reachable: true },
      gatewayService: { installed: true },
      memory: {
        provider: "none",
        dirty: false,
        fts: { enabled: true, available: true },
        vector: { enabled: false },
        custom: { searchMode: "hybrid", indexIdentity: { status: "valid" } },
      },
    },
    doctor: { ok: true, findings: [] },
  });

  assert.equal(report.status, "review");
  assert.deepEqual(report.summary.p0Blocked, []);
  const browser = report.results.find((result) => result.id === "browser_control");
  assert.equal(browser.status, "approval_required");
  assert.ok(report.summary.p1Review.includes("browser_control"));
});

test("tool parity audit accepts document extractors exposed as contracts", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
        plugin("document-extract", false, { contracts: { documentExtractors: ["pdf"] } }),
      ],
    },
    status: {
      sessions: { count: 1 },
      gateway: { reachable: true },
      gatewayService: { installed: true },
      memory: {
        provider: "none",
        dirty: false,
        fts: { enabled: true, available: true },
        vector: { enabled: false },
        custom: { searchMode: "hybrid", indexIdentity: { status: "valid" } },
      },
    },
    doctor: { ok: true, findings: [] },
  });

  const documentExtract = report.results.find((result) => result.id === "document_extract");
  assert.equal(documentExtract.status, "approval_required");
  assert.deepEqual(documentExtract.findings, []);
});

test("tool parity audit accepts current GPAO-T status schema and local hybrid memory baseline", () => {
  const report = runAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
      ],
    },
    status: {
      agents: { totalSessions: 11 },
      gateway: { reachable: true },
      gatewayService: { installed: false, loaded: false },
      memory: {
        provider: "none",
        requestedProvider: "none",
        dirty: false,
        fts: { enabled: true, available: true },
        vector: { enabled: false },
        custom: {
          searchMode: "hybrid",
          indexIdentity: { status: "valid" },
        },
      },
    },
    doctor: { ok: true, findings: [] },
  });

  assert.deepEqual(report.summary.p0Blocked, []);
  const chat = report.results.find((result) => result.id === "chat_session");
  assert.equal(chat.status, "ready");
  assert.equal(chat.evidence.statusPath.path, "agents.totalSessions");
  const memory = report.results.find((result) => result.id === "semantic_memory");
  assert.equal(memory.status, "ready");
  assert.equal(memory.evidence.memorySearchBaseline.externalQuotaRequired, false);
  assert.equal(memory.evidence.memorySearchBaseline.vectorEnabled, false);
});

test("tool parity audit builds live readiness without invoking the broad status command", () => {
  const report = runQuietAudit({
    plugins: {
      registry: { diagnostics: [] },
      plugins: [
        plugin("duckduckgo", true, { webSearchProviderIds: ["duckduckgo"] }),
        plugin("memory-core", true),
        plugin("web-readability", true, { contracts: { webContentExtractors: ["readability"] } }),
      ],
    },
    doctor: { ok: true, findings: [] },
    config: {
      tools: { profile: "coding", alsoAllow: ["browser"] },
      agents: { defaults: { memorySearch: { enabled: true, provider: "none" } } },
    },
  });

  assert.deepEqual(report.summary.p0Blocked, []);
  const chat = report.results.find((result) => result.id === "chat_session");
  const runtime = report.results.find((result) => result.id === "runtime_status");
  const memory = report.results.find((result) => result.id === "semantic_memory");
  assert.equal(chat.evidence.statusPath.value, 2);
  assert.equal(runtime.evidence.statusPath.value, true);
  assert.equal(memory.evidence.memorySearchBaseline.indexValid, true);
});
