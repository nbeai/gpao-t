import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildControlCenterSnapshot } from "./control-center.js";
import {
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  validateControlCenterUiSnapshot,
} from "./control-center-ui-contract.js";
import { buildLocalControlCenterDesignContract } from "./design-contract.js";

const DEFAULT_OUTPUT_PATH = ".gpao-t/control-center/index.html";

const STATUS_LABELS = {
  ready: "준비됨",
  review: "검토",
  blocked: "막힘",
  approval_required: "승인 필요",
  not_applicable: "해당 없음",
  unknown: "확인 필요",
};

const PANEL_GROUPS = {
  runtime: "Work",
  "skill-ecosystem": "Work",
  memory: "Context",
  recovery: "Evidence",
  growth: "Growth",
  authority: "Authority",
  adapters: "Authority",
  connectors: "Authority",
  ops: "Authority",
};

export function buildControlCenterHtml({ snapshot, designContract } = {}) {
  const controlSnapshot = snapshot || buildControlCenterSnapshot();
  const contract = designContract || buildLocalControlCenterDesignContract();
  const uiContract = buildControlCenterUiContract();
  const uiSnapshot = buildControlCenterUiSnapshot({
    snapshot: controlSnapshot,
    designContract: contract,
    uiContract,
  });
  const panels = uiSnapshot.panels || [];
  const authorityEntries = Object.entries(uiSnapshot.authorityBoundary || {});

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Local Control Center</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --surface: #ffffff;
      --surface-muted: #eef2f6;
      --text: #17202a;
      --muted: #5c6b7a;
      --line: #d8e0e8;
      --ready: #0b7a53;
      --review: #9a6200;
      --blocked: #b42318;
      --approval: #2857a3;
      --unknown: #596579;
      --shadow: 0 1px 2px rgba(23, 32, 42, 0.08);
    }
    * { box-sizing: border-box; }
    html {
      max-width: 100%;
      overflow-x: hidden;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
      max-width: 100%;
      overflow-x: hidden;
    }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 2;
      max-width: 100vw;
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: 10px;
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-size: 19px;
      line-height: 1.2;
      letter-spacing: 0;
      white-space: nowrap;
    }
    .subtitle {
      color: var(--muted);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .topbar-action {
      display: none;
    }
    .layout {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr) 320px;
      min-height: 0;
      max-width: 100vw;
      overflow-x: hidden;
    }
    nav {
      border-right: 1px solid var(--line);
      padding: 16px 12px;
      background: var(--surface-muted);
      min-width: 0;
    }
    .nav-title {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      margin: 0 0 10px;
      text-transform: uppercase;
    }
    .nav-item {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 8px;
      border-radius: 6px;
      font-size: 13px;
      color: var(--text);
      text-decoration: none;
      min-width: 0;
    }
    .nav-item:hover,
    .nav-item:focus-visible {
      background: var(--surface);
      outline: 1px solid var(--line);
    }
    .nav-item span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    main {
      padding: 18px;
      min-width: 0;
    }
    aside {
      border-left: 1px solid var(--line);
      padding: 18px;
      background: var(--surface);
      min-width: 0;
    }
    .decision-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .focus-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .focus-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--surface-muted);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .focus-link:hover,
    .focus-link:focus-visible {
      background: var(--surface);
      outline: 2px solid var(--approval);
      outline-offset: 1px;
    }
    .mobile-next-action {
      display: block;
      margin-bottom: 14px;
      padding: 12px;
    }
    .metric,
    .panel,
    .authority-row,
    .mobile-next-action {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .metric {
      padding: 12px;
      min-width: 0;
      min-height: 74px;
    }
    .metric b {
      display: block;
      font-size: 20px;
      line-height: 1.1;
    }
    .metric span {
      color: var(--muted);
      font-size: 12px;
    }
    .workflow-state-view {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .state-card {
      min-width: 0;
      min-height: 82px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .state-card strong {
      display: block;
      font-size: 12px;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .state-card span {
      display: block;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .state-card small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .panel-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .panel {
      padding: 14px;
      min-width: 0;
      min-height: 142px;
      scroll-margin-top: 78px;
    }
    .panel:target {
      outline: 2px solid var(--approval);
      outline-offset: 2px;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    h2,
    h3 {
      margin: 0;
      letter-spacing: 0;
    }
    h2 { font-size: 16px; }
    h3 { font-size: 15px; }
    p { margin: 0; }
    .headline {
      color: var(--muted);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .next {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--text);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .state-ribbon {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
      margin-top: 10px;
    }
    .state-pill {
      min-width: 0;
      min-height: 46px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfd;
      font-size: 11px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .state-pill strong {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
    }
    .state-pill span {
      display: block;
      margin-top: 3px;
      font-weight: 700;
    }
    .panel-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-top: 10px;
    }
    .panel-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--surface-muted);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .panel-action:hover,
    .panel-action:focus-visible {
      background: var(--surface);
      outline: 2px solid var(--approval);
      outline-offset: 1px;
    }
    .inspector {
      margin-top: 10px;
      border-top: 1px solid var(--line);
      padding-top: 10px;
      scroll-margin-top: 92px;
    }
    .inspector:target {
      outline: 2px solid var(--approval);
      outline-offset: 3px;
      border-radius: 6px;
    }
    .inspector summary {
      cursor: pointer;
      color: var(--text);
      font-size: 13px;
      font-weight: 700;
      list-style-position: outside;
    }
    .inspector summary:focus-visible {
      outline: 2px solid var(--approval);
      outline-offset: 3px;
      border-radius: 4px;
    }
    .inspector-grid {
      display: grid;
      gap: 7px;
      margin-top: 9px;
    }
    .inspector-row {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      gap: 8px;
      font-size: 12px;
    }
    .inspector-row strong {
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .inspector-row span {
      overflow-wrap: anywhere;
    }
    .status {
      flex: 0 0 auto;
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      background: #fff;
    }
    .status-ready { color: var(--ready); }
    .status-review { color: var(--review); }
    .status-blocked { color: var(--blocked); }
    .status-approval_required { color: var(--approval); }
    .status-not_applicable,
    .status-unknown { color: var(--unknown); }
    .side-section + .side-section {
      margin-top: 18px;
    }
    .side-section {
      scroll-margin-top: 92px;
    }
    .side-list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .authority-row {
      padding: 9px;
      box-shadow: none;
    }
    .authority-row strong {
      display: block;
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .authority-row span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .quality {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 12px;
    }
    .quality li + li {
      margin-top: 5px;
    }
    .footer-note {
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      nav,
      aside {
        border: 0;
        border-bottom: 1px solid var(--line);
      }
      nav { order: 3; }
      main { order: 1; }
      aside { order: 2; }
      .decision-strip,
      .workflow-state-view,
      .panel-grid {
        grid-template-columns: 1fr;
      }
      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }
      h1 { white-space: normal; }
    }
    @media (max-width: 640px) {
      body {
        background: var(--surface);
      }
      .topbar {
        gap: 10px;
        padding: 12px 14px;
        position: fixed;
        width: 100%;
      }
      .layout {
        padding-top: 140px;
      }
      .brand {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
        width: 100%;
      }
      h1 {
        font-size: 17px;
        max-width: 100%;
      }
      .subtitle {
        font-size: 12px;
      }
      .topbar-action {
        display: -webkit-box;
        width: 100%;
        max-height: 34px;
        overflow: hidden;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      main,
      aside,
      nav {
        padding: 12px;
      }
      nav {
        background: var(--surface);
      }
      .nav-title {
        margin-bottom: 8px;
      }
      nav[aria-label="GPAO-T information architecture"] {
        display: block;
      }
      nav[aria-label="GPAO-T information architecture"] > .nav-item {
        display: inline-flex;
        align-items: center;
        width: calc(50% - 5px);
        margin: 0 5px 8px 0;
        border: 1px solid var(--line);
        background: var(--surface-muted);
      }
      .decision-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
      }
      .workflow-state-view {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
      }
      .state-card {
        min-height: 72px;
        padding: 10px;
      }
      .focus-strip {
        margin-bottom: 10px;
        padding: 7px;
      }
      .focus-link {
        flex: 1 1 calc(50% - 5px);
        min-width: 0;
      }
      .mobile-next-action {
        margin-bottom: 12px;
        padding: 11px;
      }
      .mobile-next-action h2 {
        margin-bottom: 6px;
      }
      .metric {
        min-height: 64px;
        padding: 10px;
      }
      .metric b {
        font-size: 18px;
      }
      .metric span,
      .mobile-next-action .next,
      .headline,
      .next,
      .authority-row span,
      .quality,
      .footer-note {
        font-size: 12px;
      }
      .panel-grid {
        gap: 10px;
      }
      .panel {
        min-height: 0;
        padding: 12px;
        scroll-margin-top: 242px;
      }
      .panel-actions {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      .state-ribbon {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }
      .panel-action {
        min-height: 34px;
        padding: 6px;
        font-size: 11px;
      }
      .inspector {
        scroll-margin-top: 242px;
      }
      .side-section {
        scroll-margin-top: 140px;
      }
      #next-safe-action-aside {
        display: none;
      }
      .panel-head {
        align-items: flex-start;
        gap: 8px;
      }
      h2 { font-size: 15px; }
      h3 { font-size: 14px; }
      .status {
        max-width: 112px;
        padding: 3px 7px;
        text-align: center;
        white-space: normal;
        line-height: 1.15;
      }
      .side-section + .side-section {
        margin-top: 14px;
      }
      .side-list {
        gap: 7px;
      }
      .authority-row {
        padding: 8px;
      }
      .inspector-row {
        grid-template-columns: 1fr;
        gap: 2px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <h1>GPAO-T Local Control Center</h1>
        <span class="subtitle">정적 UI reader · 외부 활성화 없음</span>
      </div>
      <span class="topbar-action">다음 행동: ${escapeHtml(uiSnapshot.firstViewport.nextSafeAction)}</span>
      ${statusChip(controlSnapshot.status)}
    </header>
    <div class="layout">
      <nav aria-label="GPAO-T information architecture">
        <p class="nav-title">Operating Objects</p>
        ${uiSnapshot.operatingObjects.map((item) => `
        <div class="nav-item"><span>${escapeHtml(item.type)}</span><span>${escapeHtml(item.panelCount)}</span></div>`).join("")}
        <p class="nav-title nav-panel-title">Panels</p>
        ${panels.map((panel) => `
        <a class="nav-item" href="#panel-${escapeHtml(panel.id)}"><span>${escapeHtml(panel.label)}</span><span>${escapeHtml(STATUS_LABELS[panel.status] || panel.status)}</span></a>`).join("")}
      </nav>
      <main>
        <section class="focus-strip" aria-label="Control Center focus navigation">
          <a class="focus-link" href="#decision-strip">상태</a>
          <a class="focus-link" href="#workflow-state-view">흐름</a>
          <a class="focus-link" href="#next-safe-action">다음 행동</a>
          <a class="focus-link" href="#authority-boundary">권한</a>
        </section>
        <section class="decision-strip" id="decision-strip" aria-label="Current operating state">
          ${metric("Panels", uiSnapshot.firstViewport.counts.panels, "visible OS surfaces")}
          ${metric("Blocked", uiSnapshot.firstViewport.counts.blocked, "requires recovery before action")}
          ${metric("Review", uiSnapshot.firstViewport.counts.review, "needs human-readable inspection")}
          ${metric("Evidence", uiSnapshot.firstViewport.counts.evidence, "recorded replay signals")}
        </section>
        <section class="workflow-state-view" id="workflow-state-view" aria-label="Workflow, recovery, authority, and next action states">
          ${stateCard("Workflow", workflowState(controlSnapshot), "전체 Control Center 진행 상태")}
          ${stateCard("Recovery", recoveryState(controlSnapshot), "복구 우선순위와 검토 필요성")}
          ${stateCard("Authority", authorityState(controlSnapshot), "외부 실행과 권한 경계")}
          ${stateCard("Next", nextActionState(controlSnapshot), "지금 이어갈 안전 행동")}
        </section>
        <section class="mobile-next-action" id="next-safe-action" aria-label="Mobile next safe action">
          <h2>다음 안전 행동</h2>
          <p class="next">${escapeHtml(uiSnapshot.firstViewport.nextSafeAction)}</p>
        </section>
        <section class="panel-grid" aria-label="Control Center panels">
          ${panels.map((panel) => panelHtml(panel)).join("")}
        </section>
      </main>
      <aside aria-label="Authority and next safe action">
        <section class="side-section" id="next-safe-action-aside">
          <h2>다음 안전 행동</h2>
          <p class="next">${escapeHtml(uiSnapshot.firstViewport.nextSafeAction)}</p>
        </section>
        <section class="side-section" id="authority-boundary">
          <h2>권한 경계</h2>
          <div class="side-list">
            ${authorityEntries.map(([key, value]) => `
            <div class="authority-row">
              <strong>${escapeHtml(key)}</strong>
              <span>${escapeHtml(value)}</span>
            </div>`).join("")}
          </div>
        </section>
        <section class="side-section">
          <h2>디자인 게이트</h2>
          <ul class="quality">
            ${uiSnapshot.designGate.slice(0, 6).map((gate) => `<li>${escapeHtml(gate)}</li>`).join("")}
          </ul>
          <p class="footer-note">Interaction: no-script local inspection · panel anchors, focus navigation, and inspectors only.</p>
          <p class="footer-note">Source: ${escapeHtml(contract.recipePath)} · schema ${escapeHtml(controlSnapshot.schema)}</p>
        </section>
      </aside>
    </div>
  </div>
</body>
</html>`;
}

export function renderControlCenterHtml({ root, outputPath = DEFAULT_OUTPUT_PATH, now } = {}) {
  const snapshot = buildControlCenterSnapshot({ root });
  const designContract = buildLocalControlCenterDesignContract();
  const uiContract = buildControlCenterUiContract();
  const uiSnapshot = buildControlCenterUiSnapshot({ snapshot, designContract, uiContract });
  const validation = validateControlCenterUiSnapshot({ uiSnapshot });
  const html = buildControlCenterHtml({ snapshot, designContract });
  const resolvedOutputPath = resolve(root || process.cwd(), outputPath);

  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, html, "utf8");

  return {
    schema: "gpao_t.local_control_center_render.v0_1",
    status: "rendered_static_html",
    outputPath: resolvedOutputPath,
    generatedAt: now || new Date().toISOString(),
    snapshotSchema: snapshot.schema,
    designSchema: designContract.schema,
    uiContractSchema: uiContract.schema,
    uiSnapshotSchema: uiSnapshot.schema,
    uiValidationStatus: validation.status,
    firstUiRole: designContract.implementationBoundary.firstUiRole,
    renderEvidence: "static_html_file_written",
    executableSurfaces: ["gpao-t control html", "gpao-t control render [output.html]"],
    counts: {
      panels: snapshot.counts.panels,
      blocked: snapshot.counts.blocked,
      review: snapshot.counts.review,
      authorityBoundaries: Object.keys(snapshot.authorityBoundary || {}).length,
    },
    authorityBoundary: {
      startsDaemon: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      appliesGrowthMutation: false,
      installsUpdatesRollsBackOrDeploys: false,
      deploysOrPublishes: false,
    },
    verificationHint: "Open the outputPath as a local file or inspect the HTML for first viewport, panels, authority boundaries, and next safe action.",
    nextSafeAction: "Run render or screenshot verification before adding interactivity, daemon behavior, or external activation.",
  };
}

function panelHtml(panel) {
  const group = PANEL_GROUPS[panel.id] || "Work";
  const states = panelStateLens(panel, group);
  return `
          <section class="panel" id="panel-${escapeHtml(panel.id)}" data-panel="${escapeHtml(panel.id)}" data-group="${escapeHtml(group)}">
            <div class="panel-head">
              <div>
                <h3>${escapeHtml(panel.label)}</h3>
                <p class="headline">${escapeHtml(group)} · ${escapeHtml(panel.headline)}</p>
              </div>
              ${statusChip(panel.status)}
            </div>
            <p class="next">${escapeHtml(panel.nextSafeAction)}</p>
            <div class="state-ribbon" aria-label="${escapeHtml(panel.label)} workflow state">
              ${statePill("Workflow", states.workflow)}
              ${statePill("Recovery", states.recovery)}
              ${statePill("Authority", states.authority)}
              ${statePill("Next", states.next)}
            </div>
            <div class="panel-actions" aria-label="${escapeHtml(panel.label)} local drilldown actions">
              <a class="panel-action" data-panel-action="inspect" href="#inspect-${escapeHtml(panel.id)}">인스펙터</a>
              <a class="panel-action" data-panel-action="authority" href="#authority-boundary">권한</a>
              <a class="panel-action" data-panel-action="next" href="#next-safe-action">다음 행동</a>
            </div>
            <details class="inspector" id="inspect-${escapeHtml(panel.id)}" data-panel-inspector="${escapeHtml(panel.id)}">
              <summary>운영 드릴다운</summary>
              <div class="inspector-grid" aria-label="Control Center panel inspector">
                ${inspectorRow("Panel ID", panel.id)}
                ${inspectorRow("Group", group)}
                ${inspectorRow("Status", STATUS_LABELS[panel.status] || panel.status)}
                ${inspectorRow("Headline", panel.headline)}
                ${inspectorRow("Next", panel.nextSafeAction)}
                ${inspectorRow("Workflow State", states.workflow)}
                ${inspectorRow("Recovery State", states.recovery)}
                ${inspectorRow("Authority State", states.authority)}
                ${inspectorRow("Next State", states.next)}
                ${inspectorRow("Authority", authorityLens(group))}
                ${inspectorRow("Evidence", evidenceLens(panel))}
                ${inspectorLinks(panel)}
              </div>
            </details>
          </section>`;
}

function metric(label, value, hint) {
  return `
          <div class="metric">
            <b>${escapeHtml(value)}</b>
            <span>${escapeHtml(label)} · ${escapeHtml(hint)}</span>
          </div>`;
}

function stateCard(label, value, hint) {
  return `
          <div class="state-card" data-state-card="${escapeHtml(label.toLowerCase())}">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(value)}</span>
            <small>${escapeHtml(hint)}</small>
          </div>`;
}

function statePill(label, value) {
  return `
              <div class="state-pill" data-state-pill="${escapeHtml(label.toLowerCase())}">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
              </div>`;
}

function statusChip(status) {
  const normalized = String(status || "unknown");
  return `<span class="status status-${escapeHtml(normalized)}">${escapeHtml(STATUS_LABELS[normalized] || normalized)}</span>`;
}

function inspectorRow(label, value) {
  return `
                <div class="inspector-row">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(value)}</span>
                </div>`;
}

function inspectorLinks(panel) {
  return `
                <div class="inspector-row">
                  <strong>Return</strong>
                  <span><a href="#panel-${escapeHtml(panel.id)}">패널</a> · <a href="#authority-boundary">권한 경계</a> · <a href="#next-safe-action">다음 행동</a></span>
                </div>`;
}

function authorityLens(group) {
  return group === "Authority"
    ? "권한 경계를 먼저 확인하고 외부 활성화는 차단한다."
    : "로컬 검사만 허용하고 외부 계정, 모델, 도구 호출은 열지 않는다.";
}

function evidenceLens(panel) {
  return `${STATUS_LABELS[panel.status] || panel.status} 상태와 다음 안전 행동을 함께 확인한다.`;
}

function panelStateLens(panel, group) {
  return {
    workflow: panel.status === "blocked"
      ? "복구 우선"
      : panel.status === "review"
      ? "검토 흐름"
      : "진행 가능",
    recovery: panel.status === "blocked"
      ? "복구 필요"
      : panel.status === "review"
      ? "검토 후 진행"
      : "복구 대기 없음",
    authority: group === "Authority"
      ? "권한 확인"
      : "로컬 검사",
    next: panel.nextSafeAction ? "다음 행동 있음" : "다음 행동 없음",
  };
}

function workflowState(snapshot) {
  if (snapshot.counts?.blocked) {
    return `복구 우선 · blocked ${snapshot.counts.blocked}`;
  }
  if (snapshot.counts?.review) {
    return `검토 흐름 · review ${snapshot.counts.review}`;
  }
  return "진행 가능 · blocked 0";
}

function recoveryState(snapshot) {
  const evidence = snapshot.counts?.recoveryRecords ?? 0;
  if (snapshot.counts?.blocked) {
    return `복구 필요 · evidence ${evidence}`;
  }
  if (snapshot.counts?.review) {
    return `검토 필요 · evidence ${evidence}`;
  }
  return `복구 대기 없음 · evidence ${evidence}`;
}

function authorityState(snapshot) {
  const entries = Object.values(snapshot.authorityBoundary || {});
  const blocked = entries.filter((value) => String(value).includes("blocked")).length;
  return blocked ? `외부 실행 차단 · blocked ${blocked}` : "로컬 preview 허용";
}

function nextActionState(snapshot) {
  return snapshot.nextSafeAction ? "다음 안전 행동 표시됨" : "다음 행동 누락";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
