import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildApprovalAuditLocalRecordSubstrate,
  buildApprovalAuditReplay,
  verifyApprovalAuditLocalRecordSubstrate,
} from "./approval-audit-records.js";
import {
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellState,
  verifyBrowserLocalAppShell,
} from "./browser-local-app-shell.js";
import { buildControlCenterServingContract } from "./control-center-serving.js";
import { buildTauriReadOnlyShellSlice, verifyTauriReadOnlyShellSlice } from "./tauri-readonly-shell.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const TAURI_SCAFFOLD_FILES = [
  "src-tauri/Cargo.toml",
  "src-tauri/build.rs",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "tauri-shell/index.html",
];

const STAGE_4_BLOCKED_ACTIONS = [
  "Tauri build",
  "dependency install",
  "bundle/signing/installer creation",
  "install execution",
  "update execution",
  "rollback execution",
  "local IPC command execution",
  "live model call",
  "tool/CLI/MCP execution from model output",
  "connector activation",
  "OAuth/token/credential access",
  "external send",
  "paid action",
  "destructive action",
  "public release/deployment",
  "durable memory promotion",
  "self-growth apply",
];

const STAGE_4_ALLOWED_ACTIONS = [
  "read loopback health",
  "inspect browser-local app-shell state",
  "inspect Tauri scaffold files",
  "inspect local approval/audit records",
  "read replay and rollback reference",
  "capture desktop/mobile screenshots",
  "run npm verify and local serve-check",
];

const FAILURE_RECOVERY_STATES = [
  {
    id: "loopback_preview_unavailable",
    label: "로컬 미리보기 꺼짐",
    recovery: "`gpao-t control serve-check`로 임시 서버를 띄워 확인하고, 지속 데몬은 시작하지 않습니다.",
  },
  {
    id: "tauri_scaffold_missing",
    label: "데스크톱 껍데기 파일 부족",
    recovery: "빠진 파일을 먼저 복구하고, 빌드/설치 단계는 계속 잠급니다.",
  },
  {
    id: "app_shell_state_review",
    label: "앱 셸 상태 재검토 필요",
    recovery: "`/app-shell/verify` 결과를 보고 read-only 상태와 권한 경계를 먼저 복구합니다.",
  },
  {
    id: "local_record_substrate_review",
    label: "로컬 기록 기반 재검토 필요",
    recovery: "승인/감사 JSONL 경로와 replay 읽기를 확인합니다. 실행 권한은 열지 않습니다.",
  },
  {
    id: "visual_evidence_missing",
    label: "화면 증거 부족",
    recovery: "desktop 1440x960과 mobile 390x844 스크린샷을 다시 남깁니다.",
  },
  {
    id: "authority_boundary_hidden",
    label: "권한 경계가 잘 보이지 않음",
    recovery: "다음 행동 전에 잠긴 행동과 허용된 행동을 같은 화면에 보이게 복구합니다.",
  },
];

const VISUAL_EVIDENCE = {
  desktop: "docs/03-verification/evidence/stage-4-production-hardening-desktop-1440x960.png",
  mobile: "docs/03-verification/evidence/stage-4-production-hardening-mobile-390x844.png",
  report: "docs/03-verification/evidence/STAGE-4-PRODUCTION-HARDENING-QA-2026-07-09.md",
  json: "docs/03-verification/evidence/stage-4-production-hardening-qa-2026-07-09.json",
};

export function buildStage4ProductionHardening({
  root = PROJECT_ROOT,
  sourceRoot = PROJECT_ROOT,
  now = new Date().toISOString(),
  visualEvidenceReady = true,
} = {}) {
  const servingContract = buildControlCenterServingContract();
  const appShellState = buildBrowserLocalAppShellState({ root, now });
  const appShellVerification = verifyBrowserLocalAppShell({ state: appShellState });
  const tauriShell = buildTauriReadOnlyShellSlice({ root, sourceRoot, appShellState });
  const tauriVerification = verifyTauriReadOnlyShellSlice({ slice: tauriShell });
  const localRecords = buildApprovalAuditLocalRecordSubstrate({ root });
  const localRecordVerification = verifyApprovalAuditLocalRecordSubstrate({ root });
  const replay = buildApprovalAuditReplay({ root });
  const tauriScaffold = TAURI_SCAFFOLD_FILES.map((path) => ({
    path,
    required: true,
    status: existsSync(resolve(sourceRoot, path)) ? "present" : "missing",
  }));

  const readinessChecks = [
    {
      id: "browser_local_serving",
      label: "브라우저 로컬 서빙",
      status: servingContract.authorityBoundary.loopbackOnly ? "ready" : "blocked",
      evidence: "GET /health, /work-surface, /app-shell, /control-center routes",
    },
    {
      id: "app_shell_readiness",
      label: "앱 셸 읽기 표면",
      status: appShellVerification.status,
      evidence: appShellState.schema,
    },
    {
      id: "tauri_source_scaffold",
      label: "Tauri 소스 스캐폴드",
      status: tauriScaffold.every((file) => file.status === "present") ? "ready" : "blocked",
      evidence: "src-tauri + tauri-shell source files",
    },
    {
      id: "tauri_readonly_shell",
      label: "읽기 전용 데스크톱 셸",
      status: tauriVerification.status,
      evidence: tauriShell.schema,
    },
    {
      id: "approval_audit_records",
      label: "로컬 승인/감사 기록",
      status: localRecordVerification.ok ? "ready" : "blocked",
      evidence: localRecords.storage.approvalRecords,
    },
    {
      id: "replay_rollback_reference",
      label: "리플레이와 되돌리기 기준",
      status: replay.status === "ready" || replay.status === "empty" ? "ready" : "blocked",
      evidence: replay.rollbackReference,
    },
    {
      id: "visual_qa_baseline",
      label: "화면 기준선",
      status: visualEvidenceReady ? "ready" : "review",
      evidence: VISUAL_EVIDENCE.report,
    },
    {
      id: "source_control_rollback",
      label: "소스 롤백 기준",
      status: "ready",
      evidence: "local git baseline and commit history",
    },
  ];

  const activeFailureStates = FAILURE_RECOVERY_STATES.map((state) => ({
    ...state,
    active: isFailureActive({
      id: state.id,
      readinessChecks,
      appShellVerification,
      localRecordVerification,
      visualEvidenceReady,
    }),
  }));
  const activeFailures = activeFailureStates.filter((state) => state.active);

  return {
    schema: "gpao_t.stage_4_production_hardening.v1",
    status: activeFailures.length ? "review" : "ready",
    stage: {
      current: 4,
      total: 4,
      name: "Local app / desktop production hardening",
      completionMeaning:
        "브라우저 로컬 증거, Tauri 소스 스캐폴드, 로컬 기록/replay/rollback 읽기, 화면 기준선을 하나의 제품화 준비 표면으로 묶었습니다.",
      remainingAfterThisStage:
        "명시 승인 후에만 실제 Tauri build, install/update/rollback 실행, connector/model/tool activation, external send, public release를 열 수 있습니다.",
    },
    generatedAt: now,
    readinessChecks,
    readinessSummary: {
      ready: readinessChecks.filter((check) => check.status === "ready").length,
      review: readinessChecks.filter((check) => check.status === "review").length,
      blocked: readinessChecks.filter((check) => check.status === "blocked").length,
      total: readinessChecks.length,
    },
    localServing: {
      contractSchema: servingContract.schema,
      mode: servingContract.servingMode,
      loopbackOnly: servingContract.authorityBoundary.loopbackOnly,
      persistentDaemon: servingContract.previewLifecycle.persistentDaemon,
      routeCount: servingContract.routes.length,
    },
    appShell: {
      stateSchema: appShellState.schema,
      status: appShellState.status,
      verificationStatus: appShellVerification.status,
      nextSafeAction: appShellState.nextSafeAction,
    },
    tauriScaffold,
    tauriShell: {
      schema: tauriShell.schema,
      status: tauriShell.status,
      packagedBuildExecuted: tauriShell.packagedBuildExecuted,
      dependencyInstallExecuted: tauriShell.dependencyInstallExecuted,
      bundleOrSigningExecuted: tauriShell.bundleOrSigningExecuted,
      localIpc: tauriShell.runtimeBoundary.localIpc,
    },
    localRecords: {
      status: localRecords.status,
      counts: localRecords.counts,
      latest: localRecords.latest,
      replayStatus: replay.status,
      rollbackReference: replay.rollbackReference,
    },
    allowedActions: STAGE_4_ALLOWED_ACTIONS,
    blockedActions: STAGE_4_BLOCKED_ACTIONS,
    authorityBoundary: {
      firstSliceMode: "read_mostly_local_inspection",
      buildInstallDeploy: "blocked_until_explicit_user_approval",
      localIpc: "blocked_until_per_command_authority_audit_replay_rollback_contract",
      liveExecution: "blocked",
      externalNetwork: "blocked",
      credentialAccess: "blocked",
      durableMemoryPromotion: "blocked",
    },
    failureRecoveryStates: activeFailureStates,
    visualEvidence: VISUAL_EVIDENCE,
    nextSafeAction:
      "이 기준선 위에서 명시 승인 전까지는 read-only 제품화 점검만 진행하고, 실제 빌드/설치/배포/외부 실행은 계속 잠급니다.",
  };
}

export function verifyStage4ProductionHardening({
  state = buildStage4ProductionHardening(),
  html,
} = {}) {
  const findings = [];
  if (state.schema !== "gpao_t.stage_4_production_hardening.v1") findings.push("schema_mismatch");
  if (state.stage.current !== 4 || state.stage.total !== 4) findings.push("stage_position_mismatch");
  if (state.localServing.loopbackOnly !== true) findings.push("loopback_boundary_not_closed");
  if (state.localServing.persistentDaemon !== false) findings.push("persistent_daemon_open");
  if (state.tauriShell.packagedBuildExecuted !== false) findings.push("tauri_build_executed");
  if (state.tauriShell.dependencyInstallExecuted !== false) findings.push("dependency_install_executed");
  if (state.tauriShell.bundleOrSigningExecuted !== false) findings.push("bundle_or_signing_executed");
  if (state.tauriShell.localIpc !== "blocked_in_this_slice") findings.push("local_ipc_not_blocked");
  for (const action of [
    "live model call",
    "connector activation",
    "external send",
    "paid action",
    "destructive action",
    "public release/deployment",
    "durable memory promotion",
  ]) {
    if (!state.blockedActions.includes(action)) findings.push(`missing_blocked_action:${action}`);
  }
  if (state.tauriScaffold.some((file) => file.status !== "present")) findings.push("tauri_scaffold_missing");
  if (!state.readinessChecks.some((check) => check.id === "replay_rollback_reference" && check.status === "ready")) {
    findings.push("replay_rollback_reference_not_ready");
  }
  if (html) {
    if (/<script/i.test(html)) findings.push("script_tag_present");
    if (/<form/i.test(html)) findings.push("form_present");
    if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(html)) findings.push("external_url_present");
    for (const text of ["4단계", "제품화 준비", "권한 경계", "다음 안전 행동", "실제 빌드 없음"]) {
      if (!html.includes(text)) findings.push(`missing_html_text:${text}`);
    }
  }
  return {
    schema: "gpao_t.stage_4_production_hardening_check.v1",
    status: findings.length ? "blocked" : "ready",
    ok: findings.length === 0,
    findings,
    checkedBlockedActions: STAGE_4_BLOCKED_ACTIONS,
    state,
  };
}

export function buildStage4ProductionHardeningHtml({
  state = buildStage4ProductionHardening(),
} = {}) {
  const checks = state.readinessChecks
    .map((check) => `
      <article class="check-card" data-check="${escapeHtml(check.id)}" data-status="${escapeHtml(check.status)}">
        <div class="check-head">
          <span class="status-dot" aria-hidden="true"></span>
          <strong>${escapeHtml(check.label)}</strong>
          <span class="chip">${statusLabel(check.status)}</span>
        </div>
        <p class="technical-evidence">${escapeHtml(check.evidence)}</p>
      </article>`)
    .join("");
  const scaffold = state.tauriScaffold
    .map((file) => `<li><span>${escapeHtml(file.path)}</span><strong>${file.status === "present" ? "있음" : "부족"}</strong></li>`)
    .join("");
  const blocked = state.blockedActions
    .map((action) => `<li>${escapeHtml(toProductActionLabel(action))}</li>`)
    .join("");
  const failures = state.failureRecoveryStates
    .map((failure) => `
      <article class="review-row" data-failure-recovery-state="${escapeHtml(failure.id)}" data-active="${failure.active ? "true" : "false"}">
        <strong>${escapeHtml(failure.label)}</strong>
        <p>${escapeHtml(failure.recovery)}</p>
      </article>`)
    .join("");
  const latestRecord = state.localRecords.latest.approvalRecord?.id ? "로컬 승인/감사 기록 있음" : "아직 로컬 기록 없음";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T 4단계 제품화 준비</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8f6;
      --surface: #ffffff;
      --surface-soft: #f3f5f2;
      --surface-blue: #eef4f8;
      --surface-green: #edf6f2;
      --surface-amber: #fbf4e6;
      --text: #17211b;
      --muted: #5b665d;
      --line: #dbe5dc;
      --accent: #256b5a;
      --blue: #2c6f9f;
      --amber: #996d1f;
      --locked: #8f4a42;
      --shadow: 0 1px 2px rgba(23,33,27,0.04);
      font-family: Pretendard, "Apple SD Gothic Neo", "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      line-height: 1.58;
      letter-spacing: 0;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      padding: 14px 22px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(10px);
    }
    .brand { min-width: 0; }
    .brand strong { display: block; font-size: 18px; line-height: 1.2; }
    .brand span, p { color: var(--muted); word-break: keep-all; overflow-wrap: anywhere; }
    .decision-strip {
      max-width: 480px;
      border: 1px solid #cde0d5;
      border-radius: 8px;
      background: var(--surface-green);
      color: #245f4e;
      padding: 9px 12px;
      font-size: 13px;
      font-weight: 800;
    }
    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 20px 0 38px;
    }
    .overview {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 14px;
      align-items: stretch;
      margin-bottom: 14px;
    }
    .panel, .hero-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .hero-card { padding: 18px; }
    .eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 13px; font-weight: 900; }
    h1, h2, h3, p { margin: 0; }
    h1 { max-width: 760px; font-size: clamp(24px, 3vw, 34px); line-height: 1.18; letter-spacing: 0; }
    h2 { font-size: 17px; line-height: 1.25; letter-spacing: 0; }
    h3 { font-size: 14px; line-height: 1.3; }
    .hero-card p { margin-top: 12px; max-width: 720px; font-size: 15px; }
    .summary-card {
      display: grid;
      gap: 12px;
      padding: 14px;
      background: var(--surface);
    }
    .score {
      display: grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .score div {
      border-right: 1px solid var(--line);
      background: var(--surface-soft);
      padding: 10px;
      min-width: 0;
    }
    .score div:last-child { border-right: 0; }
    .score strong { display: block; font-size: 24px; line-height: 1; }
    .score span { display: block; margin-top: 6px; color: var(--muted); font-size: 12px; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 14px;
      align-items: start;
    }
    .panel { padding: 14px; }
    .panel + .panel { margin-top: 14px; }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    summary {
      cursor: default;
      list-style: none;
      font-weight: 900;
    }
    summary::-webkit-details-marker { display: none; }
    details.panel > summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      border: 1px solid #cbdcd2;
      background: var(--surface-green);
      color: #245f4e;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }
    .checks {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .check-card, .review-row {
      min-width: 0;
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: var(--surface);
      padding: 10px 12px;
    }
    .check-card:last-child, .review-row:last-child { border-bottom: 0; }
    .check-card[data-status="review"] { background: var(--surface-amber); border-color: #eddcae; }
    .check-card[data-status="blocked"] { background: #fff1ef; border-color: #edc3bd; }
    .check-head {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .check-head strong { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .status-dot {
      width: 9px;
      height: 9px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 3px rgba(37,107,90,0.12);
    }
    .check-card p, .review-row p { margin-top: 8px; font-size: 13px; }
    .technical-evidence {
      display: none;
    }
    .rail-list, .blocked-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rail-list li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      border-bottom: 1px solid var(--line);
      padding: 8px 0;
      font-size: 13px;
    }
    .rail-list li:last-child { border-bottom: 0; }
    .rail-list span { min-width: 0; overflow-wrap: anywhere; color: var(--muted); }
    .rail-list strong { white-space: nowrap; color: var(--accent); }
    .blocked-list { grid-template-columns: 1fr; }
    .blocked-list li {
      border-bottom: 1px solid #ead8d2;
      border-radius: 0;
      background: transparent;
      color: #7d443c;
      padding: 7px 0;
      font-size: 13px;
      font-weight: 750;
      overflow-wrap: anywhere;
    }
    .blocked-list li:last-child { border-bottom: 0; }
    .review-stack { display: grid; gap: 8px; }
    .review-row[data-active="false"] { opacity: .72; }
    .evidence {
      border: 1px solid #c8dcec;
      border-radius: 8px;
      background: var(--surface-blue);
      padding: 12px;
    }
    .evidence strong, .evidence span { display: block; overflow-wrap: anywhere; }
    .evidence strong { color: var(--blue); }
    .next-action {
      border-color: #cde0d5;
      background: var(--surface-green);
    }
    @media (max-width: 860px) {
      .topbar { grid-template-columns: 1fr; padding: 12px 14px; }
      .decision-strip { max-width: none; }
      main { width: min(100vw - 20px, 460px); padding-top: 14px; }
      .overview, .grid { grid-template-columns: 1fr; }
      .hero-card, .panel, .summary-card { padding: 14px; border-radius: 10px; }
      h1 { font-size: 26px; }
      .score { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .score div:nth-child(2) { border-right: 0; }
      .score div:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .checks { grid-template-columns: 1fr; }
      .section-head { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body data-stage-4-production-hardening="read-mostly" data-external-activation="blocked">
  <header class="topbar">
    <div class="brand">
      <strong>GPAO-T Local App Hardening</strong>
      <span>세션 작업공간에서 데스크톱 제품화로 넘어가기 전, 준비 상태만 읽습니다.</span>
    </div>
    <div class="decision-strip" data-next-safe-action="visible">다음 안전 행동: 빌드/설치 없이 준비 상태만 확인</div>
  </header>
  <main>
    <section class="overview">
      <div class="hero-card">
        <p class="eyebrow">4단계 · 제품화 준비</p>
        <h1>로컬 앱 전환 준비 상태</h1>
        <p>브라우저 로컬 증거, Tauri 소스 스캐폴드, 승인/감사 기록, replay/rollback 기준을 묶었습니다. 이 화면은 실행기가 아니라 제품화 전 점검 표면입니다.</p>
      </div>
      <aside class="panel summary-card" aria-label="준비 요약">
        <div class="section-head">
          <h2>준비 요약</h2>
          <span class="chip">${state.status === "ready" ? "검증 가능" : "재검토"}</span>
        </div>
        <div class="score">
          <div><strong>${state.readinessSummary.ready}</strong><span>준비됨</span></div>
          <div><strong>${state.readinessSummary.review}</strong><span>재검토</span></div>
          <div><strong>${state.readinessSummary.blocked}</strong><span>막힘</span></div>
          <div><strong>${state.readinessSummary.total}</strong><span>전체</span></div>
        </div>
        <div class="evidence">
          <strong>최근 로컬 기록</strong>
          <span>${escapeHtml(latestRecord)}</span>
        </div>
      </aside>
    </section>
    <section class="grid">
      <div>
        <section class="panel" aria-label="준비 체크">
          <div class="section-head">
            <h2>제품화 준비 체크</h2>
            <span class="chip">읽기 전용</span>
          </div>
          <div class="checks">${checks}</div>
        </section>
        <section class="panel next-action" aria-label="다음 안전 행동">
          <div class="section-head">
            <h2>다음 안전 행동</h2>
            <span class="chip">실제 빌드 없음</span>
          </div>
          <p>${escapeHtml(state.nextSafeAction)}</p>
        </section>
        <details class="panel" aria-label="복구 상태">
          <summary><h2>실패와 복구</h2><span class="chip">조용한 복구</span></summary>
          <div class="review-stack">${failures}</div>
        </details>
      </div>
      <aside>
        <section class="panel" aria-label="Tauri 파일">
          <div class="section-head">
            <h2>데스크톱 껍데기</h2>
            <span class="chip">빌드 전</span>
          </div>
          <ul class="rail-list">${scaffold}</ul>
        </section>
        <details class="panel" aria-label="권한 경계" data-authority-boundary="visible" open>
          <summary><h2>권한 경계</h2><span class="chip">계속 잠김</span></summary>
          <ul class="blocked-list">${blocked}</ul>
        </details>
        <details class="panel" aria-label="화면 증거">
          <summary><h2>화면 증거</h2><span class="chip">QA 기준선</span></summary>
          <div class="evidence">
            <strong>Desktop</strong>
            <span>${escapeHtml(state.visualEvidence.desktop)}</span>
          </div>
          <div class="evidence" style="margin-top:8px">
            <strong>Mobile</strong>
            <span>${escapeHtml(state.visualEvidence.mobile)}</span>
          </div>
        </details>
      </aside>
    </section>
  </main>
</body>
</html>`;
}

function isFailureActive({
  id,
  readinessChecks,
  appShellVerification,
  localRecordVerification,
  visualEvidenceReady,
}) {
  if (id === "loopback_preview_unavailable") return false;
  if (id === "tauri_scaffold_missing") return readinessChecks.some((check) => check.id === "tauri_source_scaffold" && check.status === "blocked");
  if (id === "app_shell_state_review") return appShellVerification.status !== "ready";
  if (id === "local_record_substrate_review") return !localRecordVerification.ok;
  if (id === "visual_evidence_missing") return !visualEvidenceReady;
  if (id === "authority_boundary_hidden") return false;
  return false;
}

function statusLabel(status) {
  if (status === "ready") return "준비됨";
  if (status === "review") return "재검토";
  return "막힘";
}

function toProductActionLabel(action) {
  const labels = {
    "Tauri build": "데스크톱 앱 빌드",
    "dependency install": "의존성 설치",
    "bundle/signing/installer creation": "번들/서명/설치 파일 생성",
    "install execution": "설치 실행",
    "update execution": "업데이트 실행",
    "rollback execution": "되돌리기 실행",
    "local IPC command execution": "로컬 IPC 명령 실행",
    "live model call": "실제 모델 호출",
    "tool/CLI/MCP execution from model output": "모델 출력 기반 도구 실행",
    "connector activation": "커넥터 활성화",
    "OAuth/token/credential access": "계정/토큰/credential 접근",
    "external send": "외부 전송",
    "paid action": "비용 발생 행동",
    "destructive action": "되돌리기 어려운 행동",
    "public release/deployment": "공개 배포",
    "durable memory promotion": "지속 기억 승격",
    "self-growth apply": "자가 성장 변경 적용",
  };
  return labels[action] || action;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
