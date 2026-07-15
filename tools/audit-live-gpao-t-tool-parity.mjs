#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_CLI = "/Users/jyp/.gpao-t/current/gpao-t.mjs";
const DEFAULT_CONFIG = "/Users/jyp/.gpao-t/gpao-t.json";
const DEFAULT_EVIDENCE_ROOT = "docs/03-verification/evidence/tool-parity-audit";

const TOOL_CLASSES = [
  {
    id: "web_search",
    tier: "P0",
    userMeaning: "최신 정보 검색",
    pluginIds: ["duckduckgo"],
    providerFields: ["webSearchProviderIds"],
    commandNames: [],
    requireEnabled: true,
  },
  {
    id: "web_readability",
    tier: "P0",
    userMeaning: "웹페이지 본문 읽기와 기사 추출",
    pluginIds: ["web-readability"],
    providerFields: [],
    contractFields: ["webContentExtractors"],
    requireEnabled: true,
  },
  {
    id: "memory_search",
    tier: "P0",
    userMeaning: "로컬 기억/맥락 텍스트 검색",
    pluginIds: ["memory-core"],
    providerFields: [],
    commandNames: [],
    requireEnabled: true,
  },
  {
    id: "chat_session",
    tier: "P0",
    userMeaning: "대화 생성, 전환, 세션 유지",
    statusPaths: ["sessions.count", "agents.totalSessions"],
    requireStatusTruthy: true,
  },
  {
    id: "runtime_status",
    tier: "P0",
    userMeaning: "현재 상태 진단과 복구 안내",
    statusPaths: ["gateway.reachable"],
    requireStatusTruthy: true,
  },
  {
    id: "browser_control",
    tier: "P1",
    userMeaning: "브라우저 읽기/클릭/화면 제어",
    pluginIds: ["browser"],
    commandNames: ["browser"],
    requiredToolAllow: "browser",
    requireEnabled: false,
  },
  {
    id: "file_read_write",
    tier: "P1",
    userMeaning: "로컬 파일 생성, 수정, 읽기, 검증",
    coreToolProfiles: ["coding", "full"],
    coreToolMeaning: ["read", "write", "edit", "apply_patch", "exec"],
    requireEnabled: false,
  },
  {
    id: "paired_node_file_transfer",
    tier: "P2",
    userMeaning: "승인된 연결 기기의 파일 조회와 전송",
    pluginIds: ["file-transfer"],
    commandNames: ["file_fetch", "dir_list", "dir_fetch", "file_write"],
    requiredToolAllows: ["file_fetch", "dir_list", "dir_fetch", "file_write"],
    approvalBound: true,
    requireEnabled: false,
  },
  {
    id: "document_extract",
    tier: "P1",
    userMeaning: "PDF/문서 내용 추출",
    pluginIds: ["document-extract"],
    contractFields: ["documentExtractors"],
    requireEnabled: false,
  },
  {
    id: "launch_agent",
    tier: "P1",
    userMeaning: "재부팅 후 자동 실행과 서비스 복구",
    statusPaths: ["gatewayService.installed", "gatewayService.loaded"],
    launchAgentLabels: ["ai.nbeai.gpao-t"],
    requireStatusTruthy: true,
  },
  {
    id: "secret_refs",
    tier: "P1",
    userMeaning: "토큰/키를 평문 설정 밖으로 분리",
    doctorCheckIds: ["core/doctor/security"],
    requireNoDoctorFindings: true,
  },
  {
    id: "codex_runtime_route",
    tier: "P1",
    userMeaning: "Codex 런타임 경로와 플러그인 설정 정합성",
    doctorCheckIds: ["core/doctor/codex-session-routes"],
    requireNoDoctorFindings: true,
  },
  {
    id: "plugin_registry",
    tier: "P1",
    userMeaning: "플러그인 레지스트리와 현재 설정 일치",
    registryDiagnosticCodes: ["persisted-registry-stale-policy"],
    requireNoRegistryDiagnostics: true,
  },
  {
    id: "semantic_memory",
    tier: "P2",
    userMeaning: "외부 쿼터 없이 작동하는 로컬 하이브리드 기억 검색",
    memorySearchBaseline: true,
    requireStatusTruthy: true,
  },
];

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function runJson(cliPath, args, fallbackStatus) {
  const result = spawnSync("node", [cliPath, ...args], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const text = result.stdout || result.stderr || "";
  if (result.status !== 0 && !text.trim().startsWith("{")) {
    return {
      status: fallbackStatus,
      command: ["node", cliPath, ...args],
      exitCode: result.status,
      error: text.trim(),
    };
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      status: fallbackStatus,
      command: ["node", cliPath, ...args],
      exitCode: result.status,
      error: error instanceof Error ? error.message : String(error),
      output: text.slice(0, 4000),
    };
  }
}

function readJsonFile(path) {
  if (!path) return null;
  const resolved = resolve(path);
  if (!existsSync(resolved)) throw new Error(`json_file_missing:${resolved}`);
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function readJsonFileIfPresent(path) {
  if (!path) return null;
  const resolved = resolve(path);
  if (!existsSync(resolved)) return null;
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    return null;
  }
}

function collectionCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function collectQuietLocalStatus({
  config,
  sessions,
  memoryIndex,
  health,
  healthUrl = "http://127.0.0.1:18799/health",
} = {}) {
  const localHealth = health || (() => {
    const result = spawnSync("curl", ["-fsS", healthUrl], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0) return null;
    try {
      return JSON.parse(result.stdout || "{}");
    } catch {
      return null;
    }
  })();
  const memoryConfig = config?.memory || config?.agents?.defaults?.memorySearch || {};
  const indexReady = memoryIndex?.status === "ready";
  const hybridReady = memoryIndex?.engine?.mode === "local_hybrid_memory_search";
  const sessionCount = collectionCount(sessions);

  return {
    schema: "gpao_t.quiet_local_status.v0_1",
    sessions: { count: sessionCount },
    agents: { totalSessions: sessionCount },
    gateway: { reachable: localHealth?.ok === true || localHealth?.status === "live" },
    gatewayService: { installed: false, loaded: false },
    memory: {
      provider: memoryConfig?.provider || "none",
      requestedProvider: memoryConfig?.provider || "none",
      dirty: !indexReady,
      fts: {
        enabled: memoryConfig?.enabled !== false,
        available: indexReady,
      },
      vector: { enabled: false },
      custom: {
        searchMode: hybridReady ? "hybrid" : null,
        indexIdentity: { status: indexReady ? "valid" : "invalid" },
        documentCount: memoryIndex?.counts?.documents || collectionCount(memoryIndex?.documents),
      },
    },
  };
}

function getPath(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, object);
}

function firstReadyPath(object, dottedPaths = []) {
  for (const dottedPath of dottedPaths) {
    const value = getPath(object, dottedPath);
    if (value) return { path: dottedPath, value };
  }
  const firstPath = dottedPaths[0] || "";
  return { path: firstPath, value: firstPath ? getPath(object, firstPath) : undefined };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function inspectLaunchAgent(label) {
  if (!label || process.platform !== "darwin") return { label, status: "unsupported_platform" };
  const plistPath = join(homedir(), "Library", "LaunchAgents", `${label}.plist`);
  const print = spawnSync("launchctl", ["print", `gui/${process.getuid()}/${label}`], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  const output = `${print.stdout || ""}\n${print.stderr || ""}`;
  return {
    label,
    plistPath,
    plistExists: existsSync(plistPath),
    printExitCode: print.status,
    loaded: print.status === 0,
    running: /\bstate = running\b/.test(output),
  };
}

function pluginById(plugins, id) {
  return plugins.find((plugin) => plugin.id === id) || null;
}

function pluginHasContract(plugin, field, expectedAny = true) {
  const values = asArray(plugin?.contracts?.[field]);
  return expectedAny ? values.length > 0 : false;
}

function pluginHasCommand(plugin, command) {
  return asArray(plugin?.commands).includes(command) || asArray(plugin?.contracts?.tools).includes(command);
}

function pluginHasProvider(plugin, field) {
  return asArray(plugin?.[field]).length > 0 || asArray(plugin?.contracts?.[field.replace(/Ids$/, "s")]).length > 0;
}

function classifyToolClass(toolClass, context) {
  const findings = [];
  const evidence = {};
  const plugins = asArray(context.plugins?.plugins);

  if (toolClass.pluginIds) {
    evidence.plugins = toolClass.pluginIds.map((id) => {
      const plugin = pluginById(plugins, id);
      return {
        id,
        present: Boolean(plugin),
        enabled: plugin?.enabled === true,
        status: plugin?.status || "missing",
        requiredDepsInstalled: plugin?.dependencyStatus?.requiredInstalled !== false,
        missingDeps: asArray(plugin?.dependencyStatus?.missing),
      };
    });
    for (const pluginEvidence of evidence.plugins) {
      if (!pluginEvidence.present) findings.push(`${pluginEvidence.id}_plugin_missing`);
      if (pluginEvidence.requiredDepsInstalled === false) findings.push(`${pluginEvidence.id}_deps_missing`);
      if (toolClass.requireEnabled && pluginEvidence.enabled !== true) findings.push(`${pluginEvidence.id}_disabled`);
    }
  }

  if (toolClass.commandNames) {
    evidence.commands = toolClass.commandNames.map((command) => {
      const source = plugins.find((plugin) => pluginHasCommand(plugin, command));
      return {
        command,
        present: Boolean(source),
        pluginId: source?.id || null,
        pluginEnabled: source?.enabled === true,
      };
    });
    for (const commandEvidence of evidence.commands) {
      if (!commandEvidence.present) findings.push(`${commandEvidence.command}_command_missing`);
      if (toolClass.requireEnabled && commandEvidence.pluginEnabled !== true) findings.push(`${commandEvidence.command}_command_disabled`);
    }
  }

  if (toolClass.requiredToolAllow) {
    const globalAllow = asArray(context.config?.tools?.alsoAllow);
    const agentAllows = asArray(context.config?.agents?.list).flatMap((agent) => asArray(agent?.tools?.alsoAllow));
    const allowed = globalAllow.includes(toolClass.requiredToolAllow) || agentAllows.includes(toolClass.requiredToolAllow);
    evidence.toolProfile = {
      profile: context.config?.tools?.profile || null,
      required: toolClass.requiredToolAllow,
      allowed,
    };
    if (!allowed) findings.push(`${toolClass.requiredToolAllow}_tool_profile_blocked`);
  }

  if (toolClass.requiredToolAllows) {
    const globalAllow = asArray(context.config?.tools?.alsoAllow);
    const agentAllows = asArray(context.config?.agents?.list).flatMap((agent) => asArray(agent?.tools?.alsoAllow));
    const allowed = toolClass.requiredToolAllows.filter((tool) => (
      globalAllow.includes(tool) || agentAllows.includes(tool)
    ));
    evidence.toolProfile = {
      profile: context.config?.tools?.profile || null,
      required: toolClass.requiredToolAllows,
      allowed,
      approvalBound: toolClass.approvalBound === true,
    };
    if (allowed.length !== toolClass.requiredToolAllows.length) {
      findings.push("paired_node_file_transfer_requires_explicit_tool_allow");
    }
  }

  if (toolClass.coreToolProfiles) {
    const profile = context.config?.tools?.profile || null;
    const ready = toolClass.coreToolProfiles.includes(profile);
    evidence.coreTools = {
      profile,
      acceptedProfiles: toolClass.coreToolProfiles,
      expectedTools: toolClass.coreToolMeaning || [],
      ready,
      liveProofRequired: true,
    };
    if (!ready) findings.push("local_file_core_tool_profile_not_ready");
  }

  if (toolClass.providerFields) {
    evidence.providers = toolClass.providerFields.map((field) => {
      const source = plugins.find((plugin) => pluginHasProvider(plugin, field));
      return {
        field,
        present: Boolean(source),
        pluginId: source?.id || null,
        pluginEnabled: source?.enabled === true,
      };
    });
    for (const providerEvidence of evidence.providers) {
      if (!providerEvidence.present) findings.push(`${providerEvidence.field}_missing`);
      if (toolClass.requireEnabled && providerEvidence.pluginEnabled !== true) findings.push(`${providerEvidence.field}_disabled`);
    }
  }

  if (toolClass.contractFields) {
    evidence.contracts = toolClass.contractFields.map((field) => {
      const source = plugins.find((plugin) => pluginHasContract(plugin, field));
      return {
        field,
        present: Boolean(source),
        pluginId: source?.id || null,
        pluginEnabled: source?.enabled === true,
      };
    });
    for (const contractEvidence of evidence.contracts) {
      if (!contractEvidence.present) findings.push(`${contractEvidence.field}_missing`);
      if (toolClass.requireEnabled && contractEvidence.pluginEnabled !== true) findings.push(`${contractEvidence.field}_disabled`);
    }
  }

  if (toolClass.statusPath || toolClass.statusPaths) {
    const paths = toolClass.statusPaths || [toolClass.statusPath];
    const { path, value } = firstReadyPath(context.status, paths);
    evidence.statusPath = { path, value, candidates: paths };
    if (toolClass.requireStatusTruthy && !value) findings.push(`${path || "status"}_not_ready`);
  }

  if (toolClass.launchAgentLabels && context.liveReadback !== false) {
    evidence.launchAgents = toolClass.launchAgentLabels.map((label) => inspectLaunchAgent(label));
    const ready = evidence.launchAgents.some((agent) => agent.plistExists && (agent.loaded || agent.running));
    if (ready) {
      for (let index = findings.length - 1; index >= 0; index -= 1) {
        if (findings[index]?.endsWith("_not_ready")) findings.splice(index, 1);
      }
    } else if (toolClass.requireStatusTruthy) {
      findings.push("gpao_t_launch_agent_not_ready");
    }
  }

  if (toolClass.memorySearchBaseline) {
    const memory = context.status?.memory || {};
    const ftsReady = memory.fts?.available === true || memory.fts?.enabled === true;
    const localHybridReady = memory.custom?.searchMode === "hybrid" || memory.provider === "none";
    const indexValid = memory.custom?.indexIdentity?.status === "valid" || memory.dirty === false;
    evidence.memorySearchBaseline = {
      provider: memory.provider || null,
      requestedProvider: memory.requestedProvider || null,
      ftsReady,
      localHybridReady,
      indexValid,
      vectorEnabled: memory.vector?.enabled === true,
      externalQuotaRequired: false,
      meaning: "GPAO-T P0 memory relies on local FTS/hybrid recall. Provider-grade vector memory is an optional later enhancement.",
    };
    if (!(ftsReady && localHybridReady && indexValid)) {
      findings.push("local_hybrid_memory_not_ready");
    }
  }

  if (toolClass.doctorCheckIds) {
    const doctorFindings = asArray(context.doctor?.findings).filter((finding) => toolClass.doctorCheckIds.includes(finding.checkId));
    evidence.doctorFindings = doctorFindings.map((finding) => ({
      checkId: finding.checkId,
      severity: finding.severity,
      message: finding.message,
      path: finding.path,
    }));
    if (toolClass.requireNoDoctorFindings && doctorFindings.length > 0) findings.push("doctor_findings_present");
  }

  if (toolClass.registryDiagnosticCodes) {
    const diagnostics = asArray(context.plugins?.registry?.diagnostics).filter((diagnostic) => (
      toolClass.registryDiagnosticCodes.includes(diagnostic.code)
    ));
    evidence.registryDiagnostics = diagnostics;
    if (toolClass.requireNoRegistryDiagnostics && diagnostics.length > 0) findings.push("registry_diagnostics_present");
  }

  let status = "ready";
  if (findings.length > 0) {
    status = toolClass.tier === "P0" ? "blocked" : "review";
  }
  if (toolClass.tier === "P1" && evidence.plugins?.some((plugin) => plugin.present && !plugin.enabled)) {
    status = "approval_required";
  }
  if (toolClass.approvalBound && findings.length > 0) status = "approval_required";

  return {
    id: toolClass.id,
    tier: toolClass.tier,
    userMeaning: toolClass.userMeaning,
    status,
    findings,
    evidence,
  };
}

function summarize(results) {
  const byTier = {};
  for (const result of results) {
    byTier[result.tier] ||= { ready: 0, blocked: 0, review: 0, approval_required: 0 };
    byTier[result.tier][result.status] = (byTier[result.tier][result.status] || 0) + 1;
  }
  return {
    status: results.some((result) => result.tier === "P0" && result.status === "blocked") ? "blocked" : "review",
    byTier,
    p0Blocked: results.filter((result) => result.tier === "P0" && result.status === "blocked").map((result) => result.id),
    p1Review: results.filter((result) => result.tier === "P1" && result.status !== "ready").map((result) => result.id),
  };
}

function main() {
  const cliPath = readArg("--cli", DEFAULT_CLI);
  const pluginsJson = readJsonFile(readArg("--plugins-json"));
  const statusJson = readJsonFile(readArg("--status-json"));
  const doctorJson = readJsonFile(readArg("--doctor-json"));
  const configJson = readJsonFile(readArg("--config-json"));
  const configPath = readArg("--config", DEFAULT_CONFIG);
  const config = configJson || readJsonFile(configPath);
  const sessionsJson = readJsonFile(readArg("--sessions-json"))
    || readJsonFileIfPresent(join(homedir(), ".gpao-t", "agents", "main", "sessions", "sessions.json"));
  const memoryIndexJson = readJsonFile(readArg("--memory-index-json"))
    || readJsonFileIfPresent(join(homedir(), ".gpao-t", "memory", "search-index.json"));
  const healthJson = readJsonFile(readArg("--health-json"));
  const evidenceRoot = resolve(readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT));
  const writeEvidence = hasArg("--write-evidence");

  const context = {
    plugins: pluginsJson || runJson(cliPath, ["plugins", "list", "--json"], "plugins_unavailable"),
    status: statusJson || collectQuietLocalStatus({
      config,
      sessions: sessionsJson,
      memoryIndex: memoryIndexJson,
      health: healthJson,
      healthUrl: readArg("--health-url", "http://127.0.0.1:18799/health"),
    }),
    doctor: doctorJson || runJson(cliPath, ["doctor", "--lint", "--json"], "doctor_unavailable"),
    config,
    liveReadback: !(pluginsJson || statusJson || doctorJson),
  };
  const results = TOOL_CLASSES.map((toolClass) => classifyToolClass(toolClass, context));
  const summary = summarize(results);
  const report = {
    schema: "gpao_t.live_tool_parity_audit.v0_1",
    createdAt: new Date().toISOString(),
    status: summary.status,
    plainLanguage: {
      meaning: "도구가 목록에 있는지보다, 사용자가 실제로 기대하는 기본 기능이 켜져 있고 오류 없이 쓸 수 있는지를 분류한다.",
      readyMeans: "기본 설정/상태 기준으로 통과했지만, 사용자 화면 완료 주장은 별도 Safari QA가 필요하다.",
      blockedMeans: "기본 기능으로 기대되는 항목이 꺼져 있거나 진단 경고가 남아 있다.",
    },
    summary,
    results,
    sourceDiagnostics: {
      pluginRegistry: context.plugins?.registry?.diagnostics || [],
      doctorExitOk: context.doctor?.ok === true,
    },
  };

  if (writeEvidence) {
    const outDir = join(evidenceRoot, stamp());
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "tool-parity-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
    report.evidenceDir = outDir;
  }

  console.log(JSON.stringify(report, null, 2));
  if (summary.p0Blocked.length > 0) process.exitCode = 1;
}

main();
