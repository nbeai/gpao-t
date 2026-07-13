import {
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  verifyCoreWorkSurface,
} from "./core-work-surface.js";
import { buildGpaoTFirstCompletionAudit } from "./first-completion.js";
import {
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "./session-workspace.js";

const DEFAULT_REQUEST =
  "GPAO-T 작업공간의 현재 흐름과 다음 안전 행동을 확인해줘.";

const CHAT_CONDITIONS = [
  {
    id: "multi_session_rail",
    label: "멀티 작업 세션",
    target: "Codex처럼 여러 작업 흐름을 만들고 다시 열 수 있어야 한다.",
    status: "ready",
  },
  {
    id: "active_target_recovery",
    label: "현재 목표 복구",
    target: "새 세션이나 후속 질문에서도 현재 작업 대상이 먼저 보여야 한다.",
    status: "review",
  },
  {
    id: "composer_centrality",
    label: "입력창 중심성",
    target: "사용자가 AI에게 맡기는 일이 화면의 중심 행동으로 보여야 한다.",
    status: "ready",
  },
  {
    id: "streaming_progress_feel",
    label: "진행감",
    target: "도구 로그보다 이해, 계획, 검증 진행이 먼저 읽혀야 한다.",
    status: "review",
  },
  {
    id: "context_pressure",
    label: "맥락 압력",
    target: "무엇을 주 맥락으로 쓰고 무엇을 제외했는지 보여야 한다.",
    status: "ready",
  },
  {
    id: "authority_clarity",
    label: "권한 명료성",
    target: "모델 호출, 도구 실행, 외부 전송, 기록 쓰기 경계가 숨어 있으면 안 된다.",
    status: "ready",
  },
  {
    id: "answer_readability",
    label: "답변 가독성",
    target: "사용자가 기술 로그를 읽지 않아도 현재 상태와 다음 행동을 알 수 있어야 한다.",
    status: "ready",
  },
  {
    id: "recovery_path",
    label: "복구 경로",
    target: "엉뚱한 맥락, 빈 입력, 보류 상태에서 다음 안전 행동이 보여야 한다.",
    status: "ready",
  },
  {
    id: "korean_rhythm",
    label: "한국어 작업 리듬",
    target: "개발자 enum이 아니라 일상적인 한국어 작업 언어로 보여야 한다.",
    status: "ready",
  },
  {
    id: "speed_perception",
    label: "체감 속도",
    target: "무거운 런타임 검사를 기다리는 동안에도 즉시 읽을 수 있는 상태가 있어야 한다.",
    status: "review",
  },
];

const REVIEW_NARROWING = [
  {
    id: "active_target_recovery",
    currentEvidence: "activeTarget strip and replay proof are visible in state.",
    proofNeeded: "Turn-start active target recovery must remain visible before a new answer is drafted.",
    nextSafeAction: "Replay the same follow-up shape against activeTargetReplay before changing live runtime.",
  },
  {
    id: "streaming_progress_feel",
    currentEvidence: "The shell shows a desktop progress lane and a mobile-compressed progress sentence.",
    proofNeeded: "Progress must show understanding, plan, tool boundary, and verification without raw log overload.",
    nextSafeAction: "Keep detailed tool/runtime logs below quiet disclosure unless the user asks for them.",
  },
  {
    id: "speed_perception",
    currentEvidence: "The shell renders immediately from local state without model/tool execution.",
    proofNeeded: "Slow runtime work must still provide instant readable state and latency budget signals.",
    nextSafeAction: "Add route-state placeholders and a visible local-first latency budget.",
  },
];

const VISUAL_QA_EVIDENCE = {
  schema: "gpao_t.workspace_shell_visual_qa_reference.v0_1",
  status: "os_pass_002_local_proof",
  capturedAt: "2026-07-10",
  route: "/gpao-t-workspace",
  desktopScreenshot: "docs/03-verification/evidence/gpao-t-workspace-shell-desktop-2026-07-10.png",
  mobileScreenshot: "docs/03-verification/evidence/gpao-t-workspace-shell-mobile-390x844-2026-07-10.png",
  osPass001DesktopScreenshot: "docs/03-verification/evidence/gpao-t-workspace-os-pass-001-desktop-2026-07-10.png",
  osPass001MobileScreenshot: "docs/03-verification/evidence/gpao-t-workspace-os-pass-001-mobile-390x844-2026-07-10.png",
  osPass001EvidenceJson: "docs/03-verification/evidence/workspace-shell-os-pass-001-2026-07-10.json",
  osPass001EvidenceDoc: "docs/03-verification/evidence/WORKSPACE-SHELL-OS-PASS-001-2026-07-10.md",
  osPass002EvidenceJson: "docs/03-verification/evidence/workspace-shell-os-pass-002-2026-07-10.json",
  osPass002EvidenceDoc: "docs/03-verification/evidence/WORKSPACE-SHELL-OS-PASS-002-2026-07-10.md",
  osPass002MobileScreenshot: "docs/03-verification/evidence/gpao-t-workspace-os-pass-002-mobile-390x844-2026-07-10.png",
  osPass002Snapshot: "docs/03-verification/evidence/workspace-shell-os-pass-002-snapshot-2026-07-10.md",
  evidenceJson: "docs/03-verification/evidence/workspace-shell-visual-qa-2026-07-10.json",
  evidenceDoc: "docs/03-verification/evidence/WORKSPACE-SHELL-VISUAL-QA-2026-07-10.md",
  consoleFinding: "favicon_404_only_before_static_favicon_route",
};

export function buildGpaoTWorkspaceShell({
  root,
  request = DEFAULT_REQUEST,
  now = new Date().toISOString(),
} = {}) {
  const workSurface = buildCoreWorkSurface({ root, draftRequest: request, now });
  const sessionState = readSessionWorkspaceState({ root, now });
  const sessionVerification = verifySessionWorkspaceBehavior({ root });
  const workSurfaceVerification = verifyCoreWorkSurface({ surface: workSurface });
  const firstCompletion = buildGpaoTFirstCompletionAudit({ root, now });
  const activeSession = workSurface.sessionWorkspace.activeWorkSession;
  const operatingSignals = buildOperatingSignals({
    workSurface,
    sessionState,
    sessionVerification,
    workSurfaceVerification,
    firstCompletion,
    now,
  });
  const chatConditions = buildChatConditionStatus({
    workSurface,
    sessionState,
    sessionVerification,
    workSurfaceVerification,
  });
  const reviewCount = chatConditions.conditions.filter((item) => item.status !== "ready").length;

  return {
    schema: "gpao_t.workspace_shell.v0_1",
    status: reviewCount ? "review" : "ready",
    generatedAt: now,
    shellKind: "gpao_t_owned_workspace_shell",
    sourceStrategy: {
      runtimeSubstrate: "absorbed_local_runtime_reference",
      codex: "multi_chat_work_rhythm_reference",
      gpaoT: "product_owned_user_environment",
      liveRuntimeMutation: false,
    },
    routes: {
      html: "/gpao-t-workspace",
      htmlAlias: "/gpao-t-workspace.html",
      state: "/gpao-t-workspace/state",
      verify: "/gpao-t-workspace/verify",
    },
    cli: {
      state: "gpao-t control workspace-shell",
      html: "gpao-t control workspace-shell-html",
      verify: "gpao-t control workspace-shell-check",
    },
    layout: {
      pattern: "session_rail_active_work_session_inspector",
      left: {
        id: "session_rail",
        label: "작업 세션",
        source: "session-workspace",
        sessionCount: sessionState.sessions.length,
        activeSessionId: sessionState.activeSessionId,
        actions: workSurface.sessionWorkspace.sessionRail.actions,
      },
      center: {
        id: "active_work_session",
        label: "현재 작업",
        title: activeSession.title,
        state: activeSession.state,
        composer: activeSession.composer,
        thread: activeSession.thread,
      },
      right: {
        id: "inspector",
        label: "맥락 / 권한 / 성장",
        tabs: workSurface.sessionWorkspace.inspector.tabs,
      },
    },
    operatingSignals,
    chatConditionStatus: chatConditions,
    visualQaEvidence: VISUAL_QA_EVIDENCE,
    firstCompletion,
    reviewConditionNarrowing: REVIEW_NARROWING,
    workSurfaceSummary: {
      schema: workSurface.schema,
      status: workSurface.status,
      interactionMode: workSurface.interactionMode,
      understandingSummary: workSurface.understandingSummary,
      nextSafeAction: workSurface.nextSafeAction,
      safetyInvariants: workSurface.safetyInvariants,
    },
    boundaries: {
      liveRuntimeUiOverwrite: false,
      gatewayRestart: false,
      liveTurnExecution: false,
      modelProviderCall: false,
      toolExecution: false,
      connectorActivation: false,
      externalSend: false,
      durableMemoryPromotion: false,
      publicRelease: false,
    },
    nextSafeAction:
      "activeTargetReplay를 기준으로 후속 질문 복구를 검증하고, mobile/quiet disclosure 시각 QA를 이어간다.",
  };
}

export function buildGpaoTWorkspaceShellHtml({ shell, root, request } = {}) {
  const state = shell || buildGpaoTWorkspaceShell({ root, request });
  const workSurface = buildCoreWorkSurface({ root, draftRequest: request || DEFAULT_REQUEST });
  const embeddedWorkSurface = buildCoreWorkSurfaceHtml({ surface: workSurface });
  const conditions = state.chatConditionStatus.conditions;
  const inspectorTabs = state.layout.right.tabs;
  const sessionActions = state.layout.left.actions;
  const { activeTargetStrip, progressLane, localFirstSignal } = state.operatingSignals;
  const firstCompletion = state.firstCompletion || state.operatingSignals.firstCompletionSignal;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T 작업 대시보드</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #11161b;
      --plane: #f7f8f5;
      --panel: #ffffff;
      --panel-soft: #eef4f0;
      --line: #dbe4dd;
      --line-dark: #2a3138;
      --text: #16211b;
      --muted: #5d6c62;
      --ready: #1f7a64;
      --review: #a66a1f;
      --locked: #9f463f;
      --accent: #2e6f9f;
      --dark-text: #e7ece8;
      --dark-muted: #9ba7a0;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; max-width: 100%; overflow-x: hidden; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: Pretendard, "Apple SD Gothic Neo", system-ui, -apple-system, sans-serif;
      line-height: 1.5;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line-dark);
      background: rgba(17, 22, 27, 0.92);
      backdrop-filter: blur(16px);
    }
    .topbar h1 { margin: 0; color: var(--dark-text); font-size: 18px; letter-spacing: 0; }
    .topbar p { margin: 4px 0 0; color: var(--dark-muted); font-size: 13px; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .badge {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 9px;
      background: #20262d;
      font-size: 12px;
      white-space: nowrap;
    }
    .badge.ready { color: var(--ready); border-color: #b6d8cb; }
    .badge.review { color: #e0b26b; border-color: #7b5f2d; }
    .badge.locked { color: #e7aaa5; border-color: #743f3b; }
    .shell {
      display: grid;
      grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(260px, 340px);
      min-height: calc(100vh - 73px);
      background: var(--plane);
    }
    aside, main { min-width: 0; }
    .rail, .inspector {
      background: var(--panel);
      border-right: 1px solid var(--line);
      padding: 16px;
    }
    .inspector { border-right: 0; border-left: 1px solid var(--line); }
    .section-title { margin: 0 0 10px; font-size: 13px; color: var(--muted); }
    .session-card, .condition-card, .tab-card {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .session-card strong, .condition-card strong, .tab-card strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .session-card span, .condition-card span, .tab-card span {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }
    .session-row, .inspector-row {
      display: grid;
      gap: 3px;
      padding: 10px 0;
      border-bottom: 1px solid var(--line);
    }
    .session-row strong, .inspector-row strong { font-size: 14px; }
    .session-row span, .inspector-row span {
      color: var(--muted);
      font-size: 12px;
    }
    .workspace {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .target-strip {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.7fr) minmax(220px, 0.7fr);
      gap: 14px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfa;
    }
    .signal-block { min-width: 0; }
    .signal-block small {
      display: block;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .signal-block strong {
      display: block;
      font-size: 17px;
      line-height: 1.35;
    }
    .signal-block span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .progress-lane {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1px;
      padding: 0 20px;
      border-bottom: 1px solid var(--line);
      background: #e7eee8;
    }
    .progress-step {
      min-width: 0;
      padding: 10px;
      background: #f7faf7;
    }
    .progress-step strong {
      display: block;
      font-size: 12px;
      color: var(--text);
    }
    .progress-step span {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }
    .progress-step.ready { border-top: 3px solid var(--ready); }
    .progress-step.review { border-top: 3px solid var(--review); }
    .progress-step.locked { border-top: 3px solid var(--locked); }
    .progress-compact {
      display: none;
      padding: 10px 20px;
      border-bottom: 1px solid var(--line);
      background: #f7faf7;
      color: var(--muted);
      font-size: 13px;
    }
    .progress-compact strong {
      color: var(--text);
      font-size: 13px;
    }
    .replay-proof {
      display: grid;
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 10px;
      padding: 11px 20px;
      border-bottom: 1px solid var(--line);
      background: #f2f6f4;
    }
    .replay-proof div { min-width: 0; }
    .replay-proof small {
      display: block;
      color: var(--muted);
      font-size: 11px;
    }
    .replay-proof strong {
      display: block;
      margin-top: 3px;
      font-size: 13px;
      line-height: 1.35;
    }
    .work-header {
      padding: 18px 20px 10px;
      background: var(--plane);
    }
    .work-header h2 { margin: 0; font-size: 24px; letter-spacing: 0; }
    .work-header p { max-width: 880px; margin: 6px 0 0; color: var(--muted); }
    .thread {
      flex: 1;
      padding: 18px 20px;
      display: grid;
      gap: 12px;
      align-content: start;
    }
    .message {
      max-width: 880px;
      border-left: 3px solid var(--line);
      padding: 6px 0 6px 14px;
    }
    .message.gpao { border-left-color: #80b9a6; }
    .message p { margin-bottom: 0; }
    .local-first {
      max-width: 880px;
      border-left: 3px solid #80b9a6;
      padding: 7px 0 7px 13px;
      background: transparent;
    }
    .local-first strong { display: block; }
    .local-first span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .condition-lane {
      max-width: 880px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .condition-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 5px 9px;
      background: #fff;
      border: 1px solid var(--line);
      font-size: 12px;
    }
    .condition-pill.review { color: var(--review); border-color: #e2c68c; }
    .condition-pill.ready { color: var(--ready); border-color: #bad8cc; }
    .composer {
      border-top: 1px solid var(--line);
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.96);
    }
    .composer-box {
      min-height: 64px;
      border: 1px solid #313942;
      border-radius: 16px;
      padding: 14px;
      background: #20262d;
      color: var(--dark-muted);
      box-shadow: 0 12px 30px rgba(17, 22, 27, 0.12);
    }
    .composer-box strong {
      display: block;
      color: var(--dark-text);
      margin-bottom: 5px;
    }
    .composer-box span { color: var(--dark-muted); }
    .embedded {
      border-top: 1px solid var(--line);
      background: #fff;
      padding: 14px 20px;
    }
    .quiet-disclosure {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      margin-top: 12px;
    }
    .quiet-disclosure .condition-card {
      border: 0;
      border-radius: 0;
      border-top: 1px solid var(--line);
      padding: 9px 0 0;
      margin: 9px 0 0;
    }
    details {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      margin-top: 12px;
    }
    summary { cursor: pointer; font-weight: 650; }
    @media (max-width: 1040px) {
      .shell { grid-template-columns: 1fr; }
      .target-strip { grid-template-columns: 1fr; }
      .progress-lane { display: none; }
      .progress-compact { display: block; }
      .replay-proof { grid-template-columns: 1fr; padding: 10px 16px; }
      .rail, .inspector { border: 0; border-bottom: 1px solid var(--line); }
      .topbar { position: static; }
      .badge-row { justify-content: flex-start; }
    }
  </style>
</head>
<body data-gpao-t-workspace-shell="owned-workspace" data-live-runtime-mutation="false">
  <header class="topbar">
    <div>
      <h1>GPAO-T 작업 대시보드</h1>
      <p>GPAO-T의 멀티 작업 세션, 맥락, 권한, 성장 흐름을 한 화면에서 정리합니다.</p>
    </div>
    <div class="badge-row" aria-label="workspace shell state">
      <span class="badge ${state.status === "ready" ? "ready" : "review"}">${escapeHtml(state.status)}</span>
      <span class="badge ready">1차 ${escapeHtml(firstCompletion?.progress?.readyStages || 0)}/${escapeHtml(firstCompletion?.progress?.totalStages || 0)}</span>
      <span class="badge locked">라이브 런타임 변경 없음</span>
      <span class="badge ready">Codex식 멀티 세션</span>
    </div>
  </header>
  <div class="shell">
    <aside class="rail" data-session-rail="left">
      <h2 class="section-title">작업 세션</h2>
      <div class="session-row">
        <strong>${escapeHtml(state.layout.center.title)}</strong>
        <span>${escapeHtml(state.layout.center.state)} · ${escapeHtml(state.layout.left.activeSessionId)}</span>
      </div>
      ${sessionActions.map((action) => `
        <div class="session-row">
          <strong>${escapeHtml(action.label)}</strong>
          <span>${action.enabled ? "로컬 세션 상태만" : "아직 미리보기"}</span>
        </div>
      `).join("")}
    </aside>
    <main class="workspace" data-active-work-session="center">
      <section class="target-strip" data-active-target-strip="visible">
        <div class="signal-block">
          <small>${escapeHtml(activeTargetStrip.label)}</small>
          <strong>${escapeHtml(activeTargetStrip.title)}</strong>
          <span>${escapeHtml(activeTargetStrip.summary)}</span>
        </div>
        <div class="signal-block">
          <small>권한 경계</small>
          <strong>${escapeHtml(activeTargetStrip.authority)}</strong>
          <span>${escapeHtml(activeTargetStrip.boundary)}</span>
        </div>
        <div class="signal-block">
          <small>다음 안전 행동</small>
          <strong>${escapeHtml(activeTargetStrip.nextSafeAction)}</strong>
          <span>${escapeHtml(activeTargetStrip.recoverySignal)}</span>
        </div>
      </section>
      <section class="progress-lane" data-progress-lane="compact">
        ${progressLane.steps.map((step) => `
          <div class="progress-step ${escapeHtml(step.status)}" data-progress-step="${escapeHtml(step.id)}">
            <strong>${escapeHtml(step.label)}</strong>
            <span>${escapeHtml(step.text)}</span>
          </div>
        `).join("")}
      </section>
      <section class="progress-compact" data-first-completion="visible">
        <strong>1차 완료선</strong>
        <span>${escapeHtml(firstCompletion?.progress?.readyStages || 0)}/${escapeHtml(firstCompletion?.progress?.totalStages || 0)} ready · ${escapeHtml(firstCompletion?.status || "unknown")} · ${escapeHtml(firstCompletion?.userLine || "수정/보강 단계로 이동합니다.")}</span>
      </section>
      <section class="progress-compact" data-mobile-progress-lane="compressed">
        <strong>${escapeHtml(progressLane.mobileSummary.label)}</strong>
        <span>${escapeHtml(progressLane.mobileSummary.text)}</span>
      </section>
      <section class="replay-proof" data-active-target-replay="visible">
        <div>
          <small>복구 증거</small>
          <strong>${escapeHtml(activeTargetStrip.replayProof.status)} · ${escapeHtml(activeTargetStrip.replayProof.mode)}</strong>
        </div>
        <div>
          <small>후속 질문 기준</small>
          <strong>${escapeHtml(activeTargetStrip.replayProof.followUpShape)}</strong>
        </div>
        <div>
          <small>채택 경계</small>
          <strong>${escapeHtml(activeTargetStrip.replayProof.admission)}</strong>
        </div>
      </section>
      <section class="work-header">
        <h2>${escapeHtml(state.layout.center.title)}</h2>
        <p>${escapeHtml(state.workSurfaceSummary.nextSafeAction)}</p>
      </section>
      <section class="thread" aria-label="active work session">
        ${state.layout.center.thread.map((item) => `
          <article class="message ${item.role === "gpao-t" ? "gpao" : ""}">
            <strong>${escapeHtml(item.label)}</strong>
            <p>${escapeHtml(item.text)}</p>
          </article>
        `).join("")}
        <div class="local-first" data-local-first-latency-signal="visible">
          <strong>${escapeHtml(localFirstSignal.label)} · ${escapeHtml(localFirstSignal.status)}</strong>
          <span>${escapeHtml(localFirstSignal.message)}</span>
          <span>${escapeHtml(localFirstSignal.latencyBudget)}</span>
        </div>
        <div class="condition-lane" data-chat-condition-status="visible">
          ${conditions.map((condition) => `
            <span class="condition-pill ${escapeHtml(condition.status)}" data-chat-condition="${escapeHtml(condition.id)}" data-status="${escapeHtml(condition.status)}">
              ${escapeHtml(condition.label)} · ${escapeHtml(condition.status)}
            </span>
          `).join("")}
        </div>
        <details class="quiet-disclosure" data-chat-condition-disclosure="quiet">
          <summary>컨디션 근거 보기</summary>
          ${conditions.map((condition) => `
            <div class="condition-card" data-chat-condition="${escapeHtml(condition.id)}" data-status="${escapeHtml(condition.status)}">
              <strong>${escapeHtml(condition.label)}</strong>
              <span>${escapeHtml(condition.evidence)}</span>
            </div>
          `).join("")}
        </details>
      </section>
      <section class="composer" data-composer-state="local-submission-enabled">
        <div class="composer-box">
          <strong>GPAO-T에게 맡길 일</strong>
          <span>${escapeHtml(state.layout.center.composer.placeholder)}</span>
        </div>
      </section>
      <section class="embedded">
        <details>
          <summary>작업 세부 정보 보기</summary>
          ${embeddedWorkSurface}
        </details>
      </section>
    </main>
    <aside class="inspector" data-session-inspector="right">
      <h2 class="section-title">맥락 / 권한 / 성장</h2>
      ${inspectorTabs.map((tab) => `
        <div class="inspector-row" data-inspector-tab="${escapeHtml(tab.id)}">
          <strong>${escapeHtml(tab.label)}</strong>
          <span>${escapeHtml(tab.state)} · ${escapeHtml(tab.nextSafeAction || "")}</span>
        </div>
      `).join("")}
    </aside>
  </div>
</body>
</html>`;
}

export function verifyGpaoTWorkspaceShell({
  shell = buildGpaoTWorkspaceShell(),
  html = buildGpaoTWorkspaceShellHtml({ shell }),
} = {}) {
  const findings = [];

  if (shell.schema !== "gpao_t.workspace_shell.v0_1") findings.push("invalid_schema");
  if (shell.shellKind !== "gpao_t_owned_workspace_shell") findings.push("invalid_shell_kind");
  if (shell.sourceStrategy.liveRuntimeMutation !== false) findings.push("live_runtime_mutation_open");
  if (shell.layout.pattern !== "session_rail_active_work_session_inspector") findings.push("layout_pattern_missing");
  if (!shell.layout.left.actions?.some((action) => action.id === "new_session")) findings.push("new_session_missing");
  if (!shell.layout.center.composer?.noExternalSendAmbiguity) findings.push("composer_external_send_ambiguous");
  if (!shell.layout.right.tabs?.some((tab) => tab.id === "context")) findings.push("context_inspector_missing");
  if (!shell.layout.right.tabs?.some((tab) => tab.id === "authority")) findings.push("authority_inspector_missing");
  if (!shell.layout.right.tabs?.some((tab) => tab.id === "records")) findings.push("records_inspector_missing");
  if (shell.chatConditionStatus.conditions.length !== CHAT_CONDITIONS.length) findings.push("chat_condition_count_mismatch");
  if (!shell.chatConditionStatus.conditions.some((item) => item.id === "active_target_recovery")) {
    findings.push("active_target_recovery_condition_missing");
  }
  if (shell.operatingSignals?.schema !== "gpao_t.workspace_operating_signals.v0_1") {
    findings.push("operating_signals_missing");
  }
  if (!shell.operatingSignals?.activeTargetStrip?.activeTargetId) findings.push("active_target_strip_missing");
  if (shell.operatingSignals?.activeTargetStrip?.replayProof?.status !== "review_candidate") {
    findings.push("active_target_replay_missing");
  }
  if (shell.operatingSignals?.progressLane?.steps?.length !== 6) findings.push("progress_lane_incomplete");
  if (!shell.operatingSignals?.progressLane?.steps?.some((step) => step.id === "first_completion")) {
    findings.push("first_completion_progress_missing");
  }
  if (shell.firstCompletion?.progress?.readyStages !== 6) findings.push("first_completion_not_ready");
  if (!shell.operatingSignals?.progressLane?.mobileSummary) findings.push("mobile_progress_summary_missing");
  if (!shell.operatingSignals?.localFirstSignal?.latencyBudget) findings.push("local_first_latency_missing");
  if (shell.reviewConditionNarrowing?.length !== 3) findings.push("review_narrowing_missing");
  if (!shell.visualQaEvidence?.desktopScreenshot) findings.push("desktop_visual_evidence_missing");
  if (!shell.visualQaEvidence?.mobileScreenshot) findings.push("mobile_visual_evidence_missing");
  if (shell.boundaries.liveRuntimeUiOverwrite !== false) findings.push("live_runtime_overwrite_open");
  if (shell.boundaries.gatewayRestart !== false) findings.push("gateway_restart_open");
  if (shell.boundaries.liveTurnExecution !== false) findings.push("live_turn_open");
  if (shell.boundaries.connectorActivation !== false) findings.push("connector_activation_open");
  if (shell.boundaries.externalSend !== false) findings.push("external_send_open");
  if (!html.includes("data-gpao-t-workspace-shell=\"owned-workspace\"")) findings.push("html_shell_marker_missing");
  if (!html.includes("data-live-runtime-mutation=\"false\"")) findings.push("html_live_boundary_missing");
  if (!html.includes("data-session-rail=\"left\"")) findings.push("html_session_rail_missing");
  if (!html.includes("data-active-work-session=\"center\"")) findings.push("html_active_work_missing");
  if (!html.includes("data-session-inspector=\"right\"")) findings.push("html_inspector_missing");
  if (!html.includes("data-active-target-strip=\"visible\"")) findings.push("html_active_target_strip_missing");
  if (!html.includes("data-active-target-replay=\"visible\"")) findings.push("html_active_target_replay_missing");
  if (!html.includes("data-progress-lane=\"compact\"")) findings.push("html_progress_lane_missing");
  if (!html.includes("data-mobile-progress-lane=\"compressed\"")) findings.push("html_mobile_progress_missing");
  if (!html.includes("data-local-first-latency-signal=\"visible\"")) findings.push("html_local_first_signal_missing");
  if (!html.includes("data-chat-condition-status=\"visible\"")) findings.push("html_chat_condition_missing");
  if (!html.includes("data-chat-condition-disclosure=\"quiet\"")) findings.push("html_quiet_disclosure_missing");
  if (!html.includes("GPAO-T 작업 대시보드")) findings.push("html_title_missing");
  if (/<script/i.test(html)) findings.push("script_tag_present");
  if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(html)) findings.push("external_url_present");

  return {
    schema: "gpao_t.workspace_shell_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedConditions: shell.chatConditionStatus.conditions.map((item) => ({
      id: item.id,
      status: item.status,
    })),
    checkedBoundaries: shell.boundaries,
    nextSafeAction: findings.length
      ? "Workspace Shell findings를 먼저 수정한다."
      : shell.nextSafeAction,
  };
}

function buildOperatingSignals({
  workSurface,
  sessionState,
  sessionVerification,
  workSurfaceVerification,
  firstCompletion,
  now,
}) {
  const contextCount = workSurface.contextPreview.retrievedCandidates.length;
  const closedCount = workSurface.authoritySummary.closedActions.length;
  const objective = userObjectiveLabel(workSurface.taskState.objective);
  const authority = authorityLabel(workSurface.authoritySummary.approvalStatus);
  const inputSignal = inputSignalLabel(workSurface.taskState.inputSignal);

  return {
    schema: "gpao_t.workspace_operating_signals.v0_1",
    status: "review",
    generatedAt: now,
    activeTargetStrip: {
      status: "visible",
      label: "현재 목표",
      activeTargetId: workSurface.taskState.activeTargetId,
      title: objective,
      summary: `${inputSignal} · ${contextCount}개 맥락 후보 · ${sessionState.activeSessionId}`,
      authority,
      boundary: "모델/도구/커넥터/외부 전송은 열지 않음",
      nextSafeAction: "로컬 작업 상태 먼저 확인",
      recoverySignal: "새 후속 질문에서도 이 목표를 먼저 복구해야 함",
      replayProof: {
        schema: "gpao_t.active_target_replay_proof.v0_1",
        status: "review_candidate",
        mode: "local_state_replay",
        followUpShape: "사용자가 '좋아, 진행해'처럼 짧게 이어도 activeTargetId를 먼저 복구",
        recoveredTarget: workSurface.taskState.activeTargetId,
        recoveredObjective: objective,
        admittedEvidence: [
          "current_user_request",
          "session_workspace_active_session",
          "context_preview_candidates",
        ],
        traceRefs: [
          "workSurface.taskState.activeTargetId",
          "sessionWorkspace.activeWorkSession",
          "contextPreview.retrievedCandidates",
        ],
        replayRefs: [
          "same-session short follow-up",
          "new-session active target recovery",
          "authority-boundary preservation",
        ],
        conflictBoundaries: [
          "old memory must not override current user request",
          "흡수한 원천 런타임 분석은 GPAO-T 완성 흐름에서 벗어나면 안 된다",
          "review candidate must not become durable memory without approval",
        ],
        rejectedAuthority: [
          "live_openclaw_mutation",
          "durable_memory_promotion",
          "external_send",
        ],
        admission: "현재 화면/상태에는 표시하지만 live runtime truth로 승격하지 않음",
      },
    },
    progressLane: {
      status: "visible",
      mode: "compact_os_lane",
      mobileSummary: {
        label: "진행",
        text: `이해 ${workSurface.taskState.objective ? "완료" : "확인"} · 맥락 ${contextCount}개 · 권한 ${closedCount}개 잠김 · 로컬 상태 · 검증 대기`,
      },
      steps: [
        {
          id: "understanding",
          label: "이해",
          status: workSurface.taskState.objective ? "ready" : "review",
          text: objective,
        },
        {
          id: "context",
          label: "맥락",
          status: contextCount ? "ready" : "review",
          text: `${contextCount}개 맥락 · 검토 대기`,
        },
        {
          id: "authority",
          label: "권한",
          status: closedCount ? "locked" : "review",
          text: `${closedCount}개 실행 경계 잠김`,
        },
        {
          id: "local_work",
          label: "로컬",
          status: sessionVerification.status === "ready" ? "ready" : "review",
          text: "세션/화면 상태만 갱신",
        },
        {
          id: "first_completion",
          label: "1차 완료",
          status: firstCompletion.status === "ready" ? "ready" : "review",
          text: `${firstCompletion.progress.readyStages}/${firstCompletion.progress.totalStages} 단계`,
        },
        {
          id: "verification",
          label: "검증",
          status: workSurfaceVerification.status === "ready" ? "ready" : "review",
          text: "화면 QA와 테스트로 확인",
        },
      ],
    },
    localFirstSignal: {
      status: "local_first",
      label: "체감 속도",
      message: "무거운 런타임 작업 전에도 로컬 상태, 권한 경계, 다음 행동을 즉시 보여준다.",
      latencyBudget: "즉시 표시: 현재 목표/진행 lane · 지연 가능: 검증, live runtime, 외부 승인",
      liveRuntimeRequired: false,
      externalExecutionRequired: false,
    },
    firstCompletionSignal: {
      status: firstCompletion.status,
      label: "1차 완료선",
      progress: firstCompletion.progress,
      residueCount:
        firstCompletion.stages.find((stage) => stage.id === "residue_closeout")?.evidence?.residueCount || 0,
      nextSafeAction: firstCompletion.nextSafeAction,
    },
  };
}

function userObjectiveLabel(objective) {
  return String(objective || "현재 작업을 복구합니다.")
    .replace(/^Handle user request:\s*/i, "")
    .trim();
}

function authorityLabel(status) {
  if (status === "allowed") return "로컬 미리보기 허용";
  if (status === "blocked") return "실행 전 잠김";
  if (status === "review") return "확인 필요";
  return String(status || "로컬 경계 유지");
}

function inputSignalLabel(signal) {
  if (signal === "general_request") return "일반 요청";
  if (signal === "release_file_follow_up") return "릴리스 파일 후속";
  if (signal === "release_file_request") return "릴리스 파일 요청";
  return String(signal || "요청");
}

function buildChatConditionStatus({
  workSurface,
  sessionState,
  sessionVerification,
  workSurfaceVerification,
}) {
  return {
    schema: "gpao_t.chat_condition_status.v0_1",
    status: sessionVerification.status === "ready" && workSurfaceVerification.status === "ready"
      ? "review"
      : "blocked",
    source: "GPAO-T live chat UX audit + Codex work chat reference + GPAO-T 작업 대시보드",
    conditions: CHAT_CONDITIONS.map((condition) => ({
      ...condition,
      evidence: evidenceForCondition({ condition, workSurface, sessionState }),
      nextSafeAction: nextActionForCondition(condition),
    })),
  };
}

function evidenceForCondition({ condition, workSurface, sessionState }) {
  if (condition.id === "multi_session_rail") {
    return `${sessionState.sessions.length} local sessions, active=${sessionState.activeSessionId}`;
  }
  if (condition.id === "active_target_recovery") {
    return `activeTarget=${workSurface.taskState.activeTargetId}, contextCandidates=${workSurface.contextPreview.retrievedCandidates.length}`;
  }
  if (condition.id === "composer_centrality") {
    return workSurface.sessionWorkspace.activeWorkSession.composer.placeholder;
  }
  if (condition.id === "context_pressure") {
    return workSurface.contextPreview.boundary;
  }
  if (condition.id === "authority_clarity") {
    return workSurface.authoritySummary.closedActions.join(", ");
  }
  return workSurface.nextSafeAction;
}

function nextActionForCondition(condition) {
  if (condition.status === "ready") return "Workspace Shell v0.1에서 유지한다.";
  return "다음 시각 QA와 런타임 신호에서 실제 체감 개선 여부를 좁힌다.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
