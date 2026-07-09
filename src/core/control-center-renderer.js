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
  "core-work-surface": "Work",
  runtime: "Work",
  "skill-ecosystem": "Work",
  "approval-preview": "Authority",
  "execution-approval": "Authority",
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
    .panel[data-panel="approval-preview"] {
      grid-column: 1 / -1;
    }
    .panel[data-panel="core-work-surface"] {
      grid-column: 1 / -1;
    }
    .panel[data-panel="execution-approval"] {
      grid-column: 1 / -1;
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
    .approval-flow {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .approval-safe-note {
      margin-top: 10px;
      padding: 9px 10px;
      border: 1px solid #b7d2c5;
      border-radius: 6px;
      background: #f0f8f4;
      color: #1e5d43;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .approval-stage {
      min-width: 0;
      min-height: 112px;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfd;
      font-size: 11px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .approval-stage-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-bottom: 5px;
      border-radius: 50%;
      background: var(--approval);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
    }
    .approval-stage strong {
      display: block;
      color: var(--text);
      font-size: 12px;
    }
    .blocked-actions strong {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
    }
    .approval-stage-status {
      display: block;
      margin-top: 3px;
      color: var(--ready);
      font-weight: 700;
    }
    .approval-stage small {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.25;
    }
    .blocked-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(154px, 1fr));
      gap: 5px;
      margin-top: 8px;
    }
    .blocked-actions strong {
      grid-column: 1 / -1;
      text-transform: none;
    }
    .blocked-action {
      min-width: 0;
      padding: 6px 7px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fffaf0;
      color: #725200;
      font-size: 10px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .blocked-action-detail {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 600;
    }
    .blocked-action-label {
      display: block;
      color: var(--muted);
      font-size: 9px;
      text-transform: uppercase;
    }
    .work-thread-preview {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .work-composer,
    .work-message,
    .work-signal {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfd;
      padding: 8px;
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .work-composer {
      background: #f7fafc;
    }
    .work-composer strong,
    .work-message strong,
    .work-signal strong {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
    }
    .work-surface-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 6px;
      margin-top: 8px;
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
      .approval-flow {
        grid-template-columns: 1fr;
      }
      .work-surface-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .approval-stage {
        min-height: 0;
      }
      .approval-safe-note {
        font-size: 11px;
      }
      .blocked-actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
      .blocked-actions {
        grid-template-columns: 1fr;
      }
      .work-surface-grid {
        grid-template-columns: 1fr;
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
            ${coreWorkSurfaceHtml(panel)}
            ${approvalPreviewHtml(panel)}
            ${executionApprovalHtml(panel)}
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
                ${approvalInspectorRows(panel)}
                ${executionApprovalInspectorRows(panel)}
                ${coreWorkSurfaceInspectorRows(panel)}
                ${adapterInspectorRows(panel)}
                ${connectorInspectorRows(panel)}
                ${inspectorRow("Authority", authorityLens(group))}
                ${inspectorRow("Evidence", evidenceLens(panel))}
                ${inspectorLinks(panel)}
              </div>
            </details>
          </section>`;
}

function coreWorkSurfaceHtml(panel) {
  if (panel.id !== "core-work-surface" || !panel.data) return "";
  const surface = panel.data;
  const selectedPacks = surface.skillRoutePreview?.selectedPacks || [];
  const contextCandidates = surface.contextPreview?.retrievedCandidates || [];
  const closedActions = surface.authoritySummary?.closedActions || [];

  return `
            <div class="work-thread-preview" data-core-work-surface="read-only">
              <div class="work-composer" role="textbox" aria-readonly="true" data-composer-state="draft-not-sent" tabindex="0">
                <strong>${escapeHtml(surface.workspaceThread.composer.label)}</strong>
                ${escapeHtml(surface.workspaceThread.composer.draftRequest)}
              </div>
              ${surface.workspaceThread.threadPreview.map((message) => `
              <div class="work-message" data-work-message-role="${escapeHtml(message.role)}">
                <strong>${escapeHtml(message.label)} · ${escapeHtml(message.state)}</strong>
                ${escapeHtml(message.text)}
              </div>`).join("")}
              <div class="work-surface-grid" aria-label="Core work surface state">
                ${workSignal("Task", surface.taskState.status)}
                ${workSignal("Context", surface.contextPreview.status)}
                ${workSignal("Skill", surface.skillRoutePreview.status)}
                ${workSignal("Authority", surface.authoritySummary.approvalStatus)}
              </div>
              <div class="work-surface-grid" aria-label="Core work surface route preview">
                ${workSignal("Memory", `${surface.contextPreview.memoryEntries}`)}
                ${workSignal("T-cells", `${surface.contextPreview.tcellCandidates}`)}
                ${workSignal("Packs", `${selectedPacks.length}`)}
                ${workSignal("Closed", `${closedActions.length}`)}
              </div>
              <div class="blocked-actions" aria-label="Core work surface closed authority actions" data-authority-boundary="closed">
                <strong>닫힌 실행 경계</strong>
                <span class="blocked-action"><span class="blocked-action-label">요약</span>no external action · no tool activation · no live model connector execution<span class="blocked-action-detail">아직 전송/실행/연결은 열리지 않음</span></span>
                ${closedActions.slice(0, 6).map((action) => `<span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(action)}<span class="blocked-action-detail">preview only</span></span>`).join("")}
              </div>
              <div class="work-surface-grid" aria-label="Context and skill route anchors">
                ${workSignal("Context Anchor", contextCandidates[0]?.anchor || "none")}
                ${workSignal("Skill Pack", selectedPacks[0]?.id || "none")}
                ${workSignal("Model", surface.modelToolRoutePreview.selectedModelAdapter || "none")}
                ${workSignal("Tools", `${surface.modelToolRoutePreview.toolAdapters.length}`)}
              </div>
            </div>`;
}

function workSignal(label, value) {
  return `<div class="work-signal"><strong>${escapeHtml(label)}</strong>${escapeHtml(value || "none")}</div>`;
}

function coreWorkSurfaceInspectorRows(panel) {
  if (panel.id !== "core-work-surface" || !panel.data) return "";
  const surface = panel.data;
  return [
    inspectorRow("Input State", surface.workspaceThread.composer.submission),
    inspectorRow("Task State", `${surface.taskState.status} · ${surface.taskState.inputSignal}`),
    inspectorRow("Context Preview", `${surface.contextPreview.status} · ${surface.contextPreview.retrievedCandidates.length} candidates`),
    inspectorRow("Skill Route", (surface.skillRoutePreview.selectedPacks || []).map((pack) => pack.id).join(" · ") || "none"),
    inspectorRow("Authority Summary", (surface.authoritySummary.closedActions || []).join(" · ")),
  ].join("");
}

function adapterInspectorRows(panel) {
  if (panel.id !== "adapters" || !panel.data) return "";
  const boundary = panel.data.modelRouterBoundary;
  const policy = panel.data.modelRouterPolicy;
  if (!boundary) return "";
  return [
    inspectorRow("Model Router", `${boundary.route.route} · ${boundary.route.adapterSelection.selected?.id || "none"}`),
    inspectorRow("Provider Boundary", boundary.providerBoundary.externalProviderCall),
    inspectorRow("Latency / Cost", `${boundary.latencyCostFallback.latencyBudget} · ${boundary.latencyCostFallback.costPolicy}`),
    inspectorRow("Fallback", (boundary.latencyCostFallback.fallbackChain || []).map((item) => item.id).join(" · ") || "none"),
    inspectorRow("Route Profiles", (policy?.routeProfiles || []).map((profile) => profile.id).join(" · ") || "none"),
    inspectorRow("Failure States", (policy?.fallbackAndFailure?.failureStates || []).map((state) => state.id).join(" · ") || "none"),
    inspectorRow("Task Packet Conditions", (policy?.contextMeshTaskPacket?.becomesModelInputWhen || []).map((condition) => condition.id).join(" · ") || "none"),
    inspectorRow("Output Boundary", policy?.modelOutputBoundary?.toolCliMcpExecution || "none"),
    inspectorRow("Replay Criteria", `${policy?.replayAudit?.requiredCriteria?.length || 0}`),
    inspectorRow("Blocked Model Actions", (boundary.blockedActions || []).join(" · ")),
  ].join("");
}

function connectorInspectorRows(panel) {
  if (panel.id !== "connectors" || !panel.data?.toolGovernance) return "";
  const governance = panel.data.toolGovernance;
  return [
    inspectorRow("Candidate Classes", (governance.candidateClasses || []).map((candidate) => candidate.id).join(" · ") || "none"),
    inspectorRow("Authority Tiers", (governance.authorityTiers || []).map((tier) => `${tier.id}:${tier.status}`).join(" · ") || "none"),
    inspectorRow("Model Output Boundary", governance.modelOutputToExecutionProposal.outputIsExecutionAuthority === false ? "proposal only" : "execution authority"),
    inspectorRow("Approval Boundary", governance.modelOutputToExecutionProposal.blockedUntil),
    inspectorRow("Audit / Replay / Rollback", `${governance.auditReplayRollback.auditReference} · ${governance.auditReplayRollback.replayReference} · ${governance.auditReplayRollback.rollbackReference}`),
    inspectorRow("Blocked Execution", (governance.blockedActions || []).join(" · ")),
  ].join("");
}

function approvalPreviewHtml(panel) {
  if (panel.id !== "approval-preview" || !panel.data) return "";
  const stages = panel.data.stages || [];
  const blockedActions = panel.data.blockedActionViews || (panel.data.blockedActions || []).map((action) => ({
    label: action,
    detail: "blocked",
  }));
  return `
            <p class="approval-safe-note" data-approval-safe-note="preview-only">${escapeHtml(panel.data.userUnderstanding)}</p>
            <div class="approval-flow" aria-label="Approval preview stages">
              ${stages.map((stage) => `
              <div class="approval-stage" data-approval-stage="${escapeHtml(stage.id)}">
                <span class="approval-stage-number" data-approval-step="${escapeHtml(stage.step)}">${escapeHtml(stage.step)}</span>
                <strong>${escapeHtml(stage.label)}</strong>
                <span class="approval-stage-status">${escapeHtml(stage.executionState || STATUS_LABELS[stage.status] || stage.status)}</span>
                <small>${escapeHtml(stage.visibleState)}</small>
                <small>${escapeHtml(stage.blockedState)}</small>
              </div>`).join("")}
            </div>
            <div class="blocked-actions" aria-label="Blocked approval preview actions">
              <strong>아직 잠겨 있는 행동</strong>
              ${blockedActions.map((action) => `<span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(action.label)}<span class="blocked-action-detail">${escapeHtml(action.detail)}</span></span>`).join("")}
            </div>`;
}

function approvalInspectorRows(panel) {
  if (panel.id !== "approval-preview" || !panel.data) return "";
  return [
    inspectorRow("Flow Mode", panel.data.flowMode),
    inspectorRow("Preview State", panel.data.userUnderstanding),
    inspectorRow("Stages", (panel.data.stages || []).map((stage) => `${stage.label}:${stage.status}`).join(" · ")),
    inspectorRow("Still Blocked", (panel.data.blockedActions || []).join(" · ")),
  ].join("");
}

function executionApprovalHtml(panel) {
  if (panel.id !== "execution-approval" || !panel.data) return "";
  const data = panel.data;
  const proposal = data.proposal || {};
  const authorityLegend = data.authorityLegend || [];
  const validationRules = data.validation?.rules || [];
  const plannedAuditItems = data.auditWriteDesign?.plannedAuditItems || [];
  const approvalRecordWriteUx = data.approvalRecordWriteUx || {};
  const approvalRecordStages = approvalRecordWriteUx.flowStages || [];
  const approvalRecordItems = approvalRecordWriteUx.recordItems || [];
  return `
            <div class="approval-flow" aria-label="Execution proposal confirmation" data-execution-proposal-confirmation="preview-only">
              <p class="approval-safe-note" data-execution-no-write="true">${escapeHtml(data.uxContract.noExecutionNotice)} ${escapeHtml(data.uxContract.primaryQuestion)}</p>
              <div class="approval-stage" data-execution-proposal="${escapeHtml(proposal.id || "unknown")}">
                <span class="approval-stage-number" data-authority-icon="${escapeHtml(data.authorityDisplay.icon)}">${escapeHtml(data.authorityDisplay.shortLabel)}</span>
                <strong>${escapeHtml(proposal.title || "실행 전 확인")}</strong>
                <span class="approval-stage-status">${escapeHtml(data.authorityDisplay.label)}</span>
                <small>${escapeHtml(proposal.userSummary || proposal.expectedEffect || "")}</small>
              </div>
              <div class="work-surface-grid" aria-label="Execution proposal fields">
                ${workSignal("Tool", proposal.toolKind)}
                ${workSignal("Action", proposal.actionType)}
                ${workSignal("Risk", proposal.risk)}
                ${workSignal("Rollback", proposal.rollbackReference)}
              </div>
              <div class="blocked-actions" aria-label="Korean authority levels" data-authority-levels="ko">
                <strong>권한 단계</strong>
                ${authorityLegend.map((level) => `
                <span class="blocked-action" data-authority-level="${escapeHtml(level.id)}" data-authority-tone="${escapeHtml(level.tone)}">
                  <span class="blocked-action-label">${escapeHtml(level.icon)}</span>${escapeHtml(level.label)}
                  <span class="blocked-action-detail">${escapeHtml(level.description)}</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Approval packet validation" data-approval-packet-validation="design-only">
                <strong>승인 패킷 검증</strong>
                ${validationRules.slice(0, 4).map((rule) => `
                <span class="blocked-action">
                  <span class="blocked-action-label">${escapeHtml(rule.label)}</span>${escapeHtml(rule.userMessage)}
                  <span class="blocked-action-detail">design only</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Planned audit items" data-audit-preview="design-only">
                <strong>기록 예정 항목</strong>
                ${plannedAuditItems.map((item) => `
                <span class="blocked-action" data-audit-item="${escapeHtml(item.id)}">
                  <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(item.value)}
                  <span class="blocked-action-detail">${escapeHtml(item.userMeaning)}</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Approval record write UX design" data-approval-record-write-ux="design-only">
                <strong>승인 기록 저장 전 확인</strong>
                ${approvalRecordStages.map((stage) => `
                <span class="blocked-action" data-approval-record-stage="${escapeHtml(stage.id)}">
                  <span class="blocked-action-label">${escapeHtml(stage.step)} · ${escapeHtml(stage.label)}</span>${escapeHtml(stage.status)}
                  <span class="blocked-action-detail">${escapeHtml(stage.userMeaning)}</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Approval record preview items" data-approval-record-preview="no-write">
                <strong>저장될 항목 미리보기</strong>
                ${approvalRecordItems.map((item) => `
                <span class="blocked-action" data-approval-record-item="${escapeHtml(item.id)}">
                  <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(item.value)}
                  <span class="blocked-action-detail">${escapeHtml(item.userMeaning)}</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Execution approval blocked actions" data-audit-write-design="no-write">
                <strong>아직 열지 않음</strong>
                ${data.blockedActions.slice(0, 8).map((action) => `
                <span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(action)}<span class="blocked-action-detail">no write · no execution</span></span>`).join("")}
              </div>
            </div>`;
}

function executionApprovalInspectorRows(panel) {
  if (panel.id !== "execution-approval" || !panel.data) return "";
  const data = panel.data;
  return [
    inspectorRow("Proposal", `${data.proposal.toolKind} · ${data.proposal.actionType} · ${data.proposal.authorityLevel}`),
    inspectorRow("Expected Effect", data.proposal.expectedEffect),
    inspectorRow("Risk", data.proposal.risk),
    inspectorRow("Rollback", data.proposal.rollbackReference),
    inspectorRow("Approval Fields", `${data.approvalPacket.requiredFields.length}`),
    inspectorRow("Validation Rules", `${data.validation.rules.length}`),
    inspectorRow("Audit Items", `${data.auditWriteDesign.plannedAuditItems.length}`),
    inspectorRow("Audit Write", data.auditWriteDesign.auditWriteNow === false ? "기록 설계만 · 실제 기록 없음" : "write open"),
    inspectorRow("Approval Record UX", data.approvalRecordWriteUx.writesApprovalRecordNow === false ? "저장 설계만 · 실제 저장 없음" : "write open"),
    inspectorRow("Approval Record Items", `${data.approvalRecordWriteUx.recordItems.length}`),
    inspectorRow("UX Locale", data.uxContract.defaultLocale),
  ].join("");
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
