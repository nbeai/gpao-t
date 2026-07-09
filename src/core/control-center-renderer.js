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
  "core-work-surface": "작업",
  runtime: "작업",
  "skill-ecosystem": "작업",
  "approval-preview": "권한",
  "design-reference": "권한",
  "execution-approval": "권한",
  memory: "맥락",
  recovery: "근거",
  growth: "성장",
  authority: "권한",
  adapters: "권한",
  connectors: "권한",
  ops: "권한",
};

const UI_LABELS = {
  ready: "준비됨",
  review: "검토 필요",
  blocked: "잠김",
  allowed: "허용됨",
  draft_not_sent: "초안 · 미전송",
  preview_only: "미리보기만",
  visible_preview_ready: "미리보기 준비",
  local_execution_plan: "로컬 계획",
  local_reasoning_stub: "로컬 추론 후보",
  "external action": "외부 행동",
  externalModelCall: "외부 모델 호출",
  modelRouterBoundary: "모델 라우터 경계",
  externalToolAction: "외부 도구 행동",
  installExecution: "설치 실행",
  updateExecution: "업데이트 실행",
  destructiveRollback: "되돌리기 어려운 롤백",
  approvalPreviewFlow: "승인 미리보기 흐름",
  designReferenceGate: "디자인 기준 게이트",
  executionApprovalPacket: "실행 승인 패킷",
  auditWriteDesign: "감사 기록 설계",
  approvalRecordWriteUx: "승인 기록 화면",
  approvalRecordWrite: "승인 기록 저장",
  dryRunInvocation: "미리보기 실행",
  tauriBuild: "Tauri 빌드",
  dependencyInstall: "의존성 설치",
  connectorActivation: "커넥터 활성화",
  connectorWriteAccess: "커넥터 쓰기 권한",
  connectorExternalSend: "커넥터 외부 전송",
  toolCliMcpExecution: "도구/명령/MCP 실행",
  growthApplication: "성장 규칙 적용",
  durableMemoryPromotion: "지속 기억 승격",
  publicRelease: "공개 배포",
  localPreview: "로컬 미리보기",
  secrets: "인증 정보",
  "tool activation": "도구 실행",
  "model connector live execution": "모델 연결 실행",
  "connector activation": "커넥터 활성화",
  "approval record write": "승인 기록 쓰기",
  "audit record write": "감사 기록 쓰기",
  "replay read": "기록 재생 읽기",
  "rollback reference read": "되돌리기 기준 읽기",
  local_jsonl_write_available: "로컬 기록 가능",
  local_jsonl_only: "로컬 기록 한정",
  local_jsonl_record_write_read_replay: "로컬 기록/재생",
  written_local_only: "로컬 저장됨",
  not_written: "아직 저장 전",
  local_record: "로컬 기록",
  confirmed_for_local_record_only: "로컬 기록만 확인",
  dry_run: "미리보기 후보",
  cli: "로컬 명령 후보",
  "cli.dry_run": "로컬 명령 미리보기",
  "미리보기만 · dry_run": "미리보기만",
  "cli,dry_run": "로컬 명령 미리보기",
  model_skill_user_request_preview: "모델/스킬/요청에서 나온 미리보기",
  proposal_local_draft_preview: "로컬 초안 제안",
  "proposal.local_draft_preview": "로컬 초안 제안",
  approval_record_preview_only: "승인 기록 미리보기",
  "approval_record.preview_only": "승인 기록 미리보기",
  preview_packet_not_written: "저장 전 승인 패킷",
  local_preview_only: "로컬 미리보기 한정",
  preview_only_not_scheduled: "만료 없음 · 미리보기",
  "replay.reference.required_before_write": "기록 전 리플레이 기준 필요",
  ".gpao-t/events/audit.jsonl": "로컬 감사 기록 위치",
  not_confirmed: "아직 확인 전",
  not_invoked: "아직 실행 전",
  validation_design_only: "검증 설계만",
  design_only: "설계만",
  true: "예",
  false: "아니오",
  none: "없음",
  cli_command_execution: "명령 실행",
  dry_run_invocation: "미리보기 실행 호출",
  actual_tool_execution: "실제 도구 실행",
  mcp_invocation: "MCP 호출",
  external_network_or_send: "외부 전송",
  credential_read_or_write: "인증 정보 접근",
  paid_action: "비용 발생 행동",
  destructive_action: "되돌리기 어려운 행동",
  approval_directory_create: "승인 폴더 생성",
  approval_store_read: "승인 저장소 읽기",
  model_output_persistence: "모델 출력 저장",
  approval_record_write: "승인 기록 저장",
  audit_write: "감사 기록 저장",
  tool_cli_mcp_execution: "도구/명령/MCP 실행",
  "dry-run invocation": "미리보기 실행",
  "durable memory promotion": "지속 기억 승격",
  "self-growth apply": "자가성장 적용",
  deployment: "배포",
  "messenger send": "메신저 전송",
  "recurring automation": "반복 자동화",
  Work: "작업",
  Authority: "권한",
  Context: "맥락",
  Evidence: "근거",
  Growth: "성장",
  blocked_until_configured_and_approved: "설정과 승인 전까지 잠김",
  blocked_until_explicit_approval: "명시적 승인 전까지 잠김",
  blocked_until_provider_setup_task_approval_and_audit: "제공자 설정, 작업 승인, 감사 전까지 잠김",
  blocked_until_user_approval: "사용자 승인 전까지 잠김",
  blocked_until_connector_setup: "커넥터 설정 전까지 잠김",
  blocked_until_write_approval: "쓰기 승인 전까지 잠김",
  blocked_until_explicit_send_approval: "외부 전송 승인 전까지 잠김",
  blocked_until_destructive_approval: "되돌리기 어려운 행동 승인 전까지 잠김",
  blocked_until_cost_ceiling_and_explicit_cost_approval: "비용 한도와 비용 승인 전까지 잠김",
  blocked_until_preview_approval_replay_and_audit: "미리보기, 승인, 리플레이, 감사 전까지 잠김",
  blocked_until_configured: "설정 전까지 잠김",
  blocked_until_user_session: "사용자 세션 전까지 잠김",
  blocked_until_task_approval: "작업 승인 전까지 잠김",
  blocked_until_replay_audit_rollback_approval: "리플레이, 감사, 롤백 기준, 승인 전까지 잠김",
  local_preview_only_no_write_no_invocation: "로컬 미리보기만 · 쓰기/호출 없음",
  required_for_every_ui_ux_slice: "모든 UI/UX slice 필수",
  preview_validation_only_no_write_no_invocation: "검증 미리보기만 · 쓰기/호출 없음",
  local_jsonl_write_available: "로컬 JSONL 기록 가능",
  local_jsonl_only: "로컬 JSONL 한정",
  blocked: "잠김",
  allowed: "허용됨",
  not_stored: "저장하지 않음",
  "GPAO Core Thinking Pack": "핵심 사고 정리 팩",
  "GPAO Document Output Pack": "문서 결과물 정리 팩",
  "GPAO Visual Design Pack": "시각 품질 점검 팩",
  "Recover the release-file active target and answer or draft only within local authority.":
    "현재 릴리스 파일 흐름을 복구하고, 로컬 권한 안에서만 답변하거나 초안을 만듭니다.",
  "release-file": "릴리스 파일",
  "general-runtime": "일반 작업 흐름",
  work_surface_general_request: "작업 표면 일반 요청",
  general_work_request: "일반 작업 요청",
  release_file_follow_up: "릴리스 파일 후속 요청",
  release_file_request: "릴리스 파일 요청",
  answer_anchor: "주 맥락",
  supporting_context: "보조 맥락",
  stale_supporting: "이전 흐름 보조 맥락",
  candidate: "후보",
  candidates: "후보",
  intent_recovery: "의도 복구",
  supporting_skill: "보조 스킬",
  quality_anchor: "품질 기준",
  general_request: "일반 요청",
  blocked_in_this_slice: "이번 단계에서는 미전송",
  balanced_reasoning: "균형 추론",
  "local.reasoning.stub": "로컬 추론 후보",
  prefer_local_then_metered_after_approval: "로컬 우선 · 승인 후 비용 모델",
  "local.fast.stub": "로컬 빠른 후보",
  fast_context_recovery: "빠른 맥락 복구",
  private_summary: "민감 요약",
  deep_design_review: "깊은 디자인 검토",
  no_safe_adapter: "안전한 어댑터 없음",
  context_not_admitted: "맥락 미채택",
  privacy_boundary: "개인정보 경계",
  provider_unconfigured: "제공자 미설정",
  tool_execution_requested: "도구 실행 요청됨",
  admitted_context_only: "채택된 맥락만",
  authority_boundary_attached: "권한 경계 포함",
  active_target_visible: "현재 대상 표시",
  skill_route_preview_only: "스킬 경로 미리보기만",
  "live model call": "실시간 모델 호출",
  "provider credential read": "제공자 인증 정보 읽기",
  "provider credential write": "제공자 인증 정보 쓰기",
  "external network request": "외부 네트워크 요청",
  "paid token spend": "토큰 비용 발생",
  "model output persistence": "모델 출력 저장",
  "tool execution from model output": "모델 출력 기반 도구 실행",
  "tool.local_read": "도구 읽기",
  "cli.local_dry_run": "로컬 명령 미리보기",
  "mcp.read_only": "MCP 읽기",
  "connector.read": "커넥터 읽기",
  "connector.write": "커넥터 쓰기",
  "external.send": "외부 전송",
  "destructive.action": "되돌리기 어려운 행동",
  read_only: "읽기 전용",
  write: "저장 전 확인",
  external_send: "외부 전송 전 확인",
  destructive: "되돌리기 어려움",
  paid_action: "비용 발생 가능",
  preview_candidate_allowed: "미리보기 후보 허용",
  "Use this governance contract as the execution-candidate boundary before designing any live tool, CLI, MCP, or connector invocation.":
    "실제 도구, 명령, MCP, 커넥터 실행을 설계하기 전에 이 권한 경계를 먼저 확인한다.",
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
      --bg: #f5f7f2;
      --bg-soft: #eef3ec;
      --surface: #ffffff;
      --surface-muted: #eef3ec;
      --surface-warm: #fbfcf8;
      --surface-raised: #ffffff;
      --text: #17211b;
      --muted: #526257;
      --soft-text: #6d7b70;
      --faint: #8b978f;
      --line: #dde5dc;
      --line-strong: #bfd0c0;
      --ready: #1f7a64;
      --review: #a86f1d;
      --blocked: #a9473f;
      --approval: #2e6dae;
      --unknown: #6d7b70;
      --primary-soft: #e4f3ed;
      --blue-soft: #e8f1fa;
      --amber-soft: #fff4d8;
      --red-soft: #fbe9e7;
      --violet-soft: #efecfa;
      --shadow: 0 1px 2px rgba(23, 33, 27, 0.05), 0 14px 36px rgba(23, 33, 27, 0.06);
      --shadow-soft: 0 1px 1px rgba(23, 33, 27, 0.04), 0 8px 22px rgba(23, 33, 27, 0.045);
    }
    * { box-sizing: border-box; }
    html {
      max-width: 100%;
      overflow-x: hidden;
    }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.96), rgba(245, 247, 242, 0.88) 34%, rgba(238, 243, 236, 0.94) 100%);
      color: var(--text);
      font-family: Pretendard, "Apple SD Gothic Neo", "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.55;
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
      padding: 14px 22px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(18px);
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
      font-size: 20px;
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
      grid-template-columns: 188px minmax(0, 1fr) 320px;
      min-height: 0;
      max-width: 100vw;
      overflow-x: hidden;
    }
    nav {
      border-right: 1px solid var(--line);
      padding: 16px 12px;
      background: rgba(255, 255, 255, 0.66);
      backdrop-filter: blur(14px);
      min-width: 0;
    }
    .nav-title {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      margin: 0 0 10px;
      text-transform: none;
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
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(14px);
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
      border-radius: 12px;
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
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: var(--shadow);
    }
    .state-card strong {
      display: block;
      font-size: 12px;
      color: var(--muted);
      text-transform: none;
      overflow-wrap: anywhere;
    }
    .state-card span {
      display: block;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 700;
      overflow-wrap: anywhere;
      word-break: keep-all;
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
      gap: 14px;
    }
    .panel {
      padding: 18px;
      min-width: 0;
      min-height: 138px;
      scroll-margin-top: 78px;
      background: rgba(255, 255, 255, 0.92);
    }
    .panel[data-panel="approval-preview"] {
      grid-column: 1 / -1;
    }
    .panel[data-panel="design-reference"] {
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
    h2 { font-size: 17px; }
    h3 { font-size: 15px; }
    p { margin: 0; }
    .headline {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }
    .next {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
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
      border-radius: 8px;
      background: var(--surface-warm);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .state-pill strong {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: none;
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
    .panel[data-panel="design-reference"] .approval-flow {
      grid-template-columns: repeat(auto-fit, minmax(188px, 1fr));
    }
    .approval-safe-note {
      margin-top: 10px;
      padding: 9px 10px;
      border: 1px solid #b7d2c5;
      border-radius: 10px;
      background: var(--primary-soft);
      color: #1e5d43;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .approval-stage {
      min-width: 0;
      min-height: 112px;
      padding: 13px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: linear-gradient(180deg, #ffffff, var(--surface-warm));
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .approval-stage-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      margin-bottom: 8px;
      border-radius: 50%;
      background: var(--approval);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
    }
    .approval-stage strong {
      display: block;
      color: var(--text);
      font-size: 13px;
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
      font-size: 11px;
      line-height: 1.4;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .blocked-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .proposal-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
      gap: 10px;
      margin-top: 10px;
      align-items: stretch;
    }
    .proposal-card {
      min-width: 0;
      padding: 14px;
      border: 1px solid #d8c8f0;
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff, var(--violet-soft));
      box-shadow: var(--shadow-soft);
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .proposal-card strong {
      display: block;
      font-size: 14px;
      line-height: 1.4;
    }
    .proposal-card p {
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }
    .proposal-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .record-flow {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .record-flow > strong,
    .compact-review-grid > strong {
      grid-column: 1 / -1;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .record-step {
      min-width: 0;
      min-height: 82px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-warm);
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .record-step strong {
      display: block;
      font-size: 12px;
      line-height: 1.35;
    }
    .record-step span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }
    .compact-review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .execution-review {
      margin-top: 10px;
    }
    .blocked-actions strong {
      grid-column: 1 / -1;
      text-transform: none;
    }
    .blocked-action {
      min-width: 0;
      padding: 10px 11px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--amber-soft);
      color: #725200;
      font-size: 12px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .blocked-action[data-authority-tone="ready"],
    .blocked-action[data-authority-level="read_only"] {
      border-color: #b7dacd;
      background: var(--primary-soft);
      color: var(--ready);
    }
    .blocked-action[data-authority-tone="review"],
    .blocked-action[data-authority-level="write"] {
      border-color: #e1c987;
      background: var(--amber-soft);
      color: var(--review);
    }
    .blocked-action[data-authority-tone="approval_required"],
    .blocked-action[data-authority-level="dry_run"],
    .blocked-action[data-authority-level="external_send"] {
      border-color: #c2d5ea;
      background: var(--blue-soft);
      color: var(--approval);
    }
    .blocked-action[data-authority-tone="blocked"],
    .blocked-action[data-authority-level="destructive"] {
      border-color: #e7b3ad;
      background: var(--red-soft);
      color: var(--blocked);
    }
    .blocked-action[data-authority-level="paid_action"] {
      border-color: #d4ccef;
      background: var(--violet-soft);
      color: #6e5aa8;
    }
    .blocked-action-detail {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
    }
    .blocked-action-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 11px;
      text-transform: none;
      margin-right: 4px;
      margin-bottom: 4px;
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
      border-radius: 10px;
      background: var(--surface-warm);
      padding: 12px;
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .work-composer {
      background: var(--blue-soft);
      border-color: #c2d5ea;
    }
    .work-composer strong,
    .work-message strong,
    .work-signal strong {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: none;
    }
    .work-surface-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .panel-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-warm);
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
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      background: rgba(251, 252, 248, 0.88);
      box-shadow: var(--shadow-soft);
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
      grid-template-columns: 108px minmax(0, 1fr);
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
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      background: var(--surface-warm);
    }
    .status-ready { color: var(--ready); background: var(--primary-soft); }
    .status-review { color: var(--review); background: var(--amber-soft); }
    .status-blocked { color: var(--blocked); background: var(--red-soft); }
    .status-approval_required { color: var(--approval); background: var(--blue-soft); }
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
        width: 100vw;
        max-width: 100vw;
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
        max-width: 100%;
        max-height: 34px;
        overflow: hidden;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .topbar,
      .layout,
      main,
      nav,
      aside,
      .panel,
      .work-composer,
      .work-message,
      .work-signal,
      .blocked-action {
        max-width: 100%;
        min-width: 0;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
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
        grid-template-columns: 1fr;
        gap: 8px;
        margin-bottom: 10px;
      }
      .workflow-state-view {
        grid-template-columns: 1fr;
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
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .approval-flow {
        grid-template-columns: 1fr;
      }
      .proposal-hero,
      .record-flow {
        grid-template-columns: 1fr;
      }
      .proposal-meta {
        grid-template-columns: 1fr;
      }
      .work-surface-grid {
        grid-template-columns: 1fr;
      }
      .approval-stage {
        min-height: 0;
      }
      .approval-safe-note {
        font-size: 11px;
      }
      .blocked-actions {
        grid-template-columns: 1fr;
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
        <p class="nav-title">운영 영역</p>
        ${uiSnapshot.operatingObjects.map((item) => `
        <div class="nav-item"><span>${escapeHtml(uiLabel(item.type))}</span><span>${escapeHtml(item.panelCount)}</span></div>`).join("")}
        <p class="nav-title nav-panel-title">패널</p>
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
          ${metric("화면", uiSnapshot.firstViewport.counts.panels, "현재 보이는 운영 표면")}
          ${metric("잠김", uiSnapshot.firstViewport.counts.blocked, "행동 전 복구 필요")}
          ${metric("검토", uiSnapshot.firstViewport.counts.review, "사람이 읽고 확인")}
          ${metric("근거", uiSnapshot.firstViewport.counts.evidence, "기록된 재검토 신호")}
        </section>
        <section class="workflow-state-view" id="workflow-state-view" aria-label="Workflow, recovery, authority, and next action states">
          ${stateCard("작업 흐름", workflowState(controlSnapshot), "전체 Control Center 진행 상태")}
          ${stateCard("복구 상태", recoveryState(controlSnapshot), "복구 우선순위와 검토 필요성")}
          ${stateCard("권한 경계", authorityState(controlSnapshot), "외부 실행과 권한 경계")}
          ${stateCard("다음 행동", nextActionState(controlSnapshot), "지금 이어갈 안전 행동")}
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
              <strong>${escapeHtml(uiLabel(key))}</strong>
              <span>${escapeHtml(uiLabel(value))}</span>
            </div>`).join("")}
          </div>
        </section>
        <section class="side-section">
          <h2>디자인 게이트</h2>
          <ul class="quality">
            ${uiSnapshot.designGate.slice(0, 6).map((gate) => `<li>${escapeHtml(gate)}</li>`).join("")}
          </ul>
          <p class="footer-note">상호작용: 스크립트 없는 로컬 검사 · 패널 이동 · 인스펙터만 허용.</p>
          <p class="footer-note">기준: ${escapeHtml(contract.recipePath)} · schema ${escapeHtml(controlSnapshot.schema)}</p>
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
  const group = PANEL_GROUPS[panel.id] || "작업";
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
            <p class="next">${escapeHtml(uiLabel(panel.nextSafeAction))}</p>
            <div class="state-ribbon" aria-label="${escapeHtml(panel.label)} workflow state">
              ${statePill("작업", states.workflow)}
              ${statePill("복구", states.recovery)}
              ${statePill("권한", states.authority)}
              ${statePill("다음", states.next)}
            </div>
            ${coreWorkSurfaceHtml(panel)}
            ${approvalPreviewHtml(panel)}
            ${designReferenceHtml(panel)}
            ${executionApprovalHtml(panel)}
            <div class="panel-actions" aria-label="${escapeHtml(panel.label)} local drilldown actions">
              <a class="panel-action" data-panel-action="inspect" href="#inspect-${escapeHtml(panel.id)}">인스펙터</a>
              <a class="panel-action" data-panel-action="authority" href="#authority-boundary">권한</a>
              <a class="panel-action" data-panel-action="next" href="#next-safe-action">다음 행동</a>
            </div>
            <details class="inspector" id="inspect-${escapeHtml(panel.id)}" data-panel-inspector="${escapeHtml(panel.id)}">
              <summary>운영 드릴다운</summary>
              <div class="inspector-grid" aria-label="Control Center panel inspector">
                ${inspectorRow("패널 ID", panel.id)}
                ${inspectorRow("그룹", group)}
                ${inspectorRow("상태", STATUS_LABELS[panel.status] || panel.status)}
                ${inspectorRow("요약", panel.headline)}
                ${inspectorRow("다음 행동", uiLabel(panel.nextSafeAction))}
                ${inspectorRow("작업 상태", states.workflow)}
                ${inspectorRow("복구 상태", states.recovery)}
                ${inspectorRow("권한 상태", states.authority)}
                ${inspectorRow("다음 상태", states.next)}
                ${approvalInspectorRows(panel)}
                ${designReferenceInspectorRows(panel)}
                ${executionApprovalInspectorRows(panel)}
                ${coreWorkSurfaceInspectorRows(panel)}
                ${adapterInspectorRows(panel)}
                ${connectorInspectorRows(panel)}
                ${inspectorRow("권한 설명", authorityLens(group))}
                ${inspectorRow("근거", evidenceLens(panel))}
                ${inspectorLinks(panel)}
              </div>
            </details>
          </section>`;
}

function coreWorkSurfaceHtml(panel) {
  if (panel.id !== "core-work-surface" || !panel.data) return "";
  const surface = panel.data;
  const workspace = surface.sessionWorkspace;
  const railGroups = workspace?.sessionRail?.groups || [];
  const sessionActions = workspace?.sessionRail?.sessionActions || [];
  const activeSession = workspace?.activeWorkSession;
  const inspectorTabs = workspace?.inspector?.tabs || [];
  const selectedPacks = surface.skillRoutePreview?.selectedPacks || [];
  const contextCandidates = surface.contextPreview?.retrievedCandidates || [];
  const closedActions = surface.authoritySummary?.closedActions || [];
  const localLoop = surface.firstLocalWorkLoop;

  return `
            <div class="work-thread-preview" data-core-work-surface="read-only">
              <div class="work-surface-grid" aria-label="Session workspace IA" data-session-workspace="session-based-local-ai-os">
                ${workSignal("세션 레일", `${railGroups.length}개 그룹 · ${sessionActions.length}개 안전 액션`)}
                ${workSignal("활성 세션", activeSession ? `${activeSession.title} · ${uiLabel(activeSession.state)}` : "없음")}
                ${workSignal("인스펙터", `${inspectorTabs.length}개 검토 영역`)}
                ${workSignal("모바일", workspace?.mobile?.forceThreeColumns === false ? "시트 방식 · 3컬럼 강제 없음" : "확인 필요")}
              </div>
              <div class="blocked-actions" aria-label="Session workspace recoverable actions">
                <strong>세션 작업공간</strong>
                <span class="blocked-action"><span class="blocked-action-label">구조</span>좌측 세션 레일 · 중앙 활성 작업 세션 · 우측 인스펙터<span class="blocked-action-detail">Control Center는 보조 검토 표면</span></span>
                <span class="blocked-action"><span class="blocked-action-label">보관</span>보관된 세션은 복구 가능<span class="blocked-action-detail">영구 삭제 없음</span></span>
                <span class="blocked-action"><span class="blocked-action-label">삭제 대기</span>삭제 대기 취소 가능<span class="blocked-action-detail">recoverable 상태</span></span>
              </div>
              <div class="work-composer" role="textbox" aria-readonly="true" data-composer-state="draft-not-sent" tabindex="0">
                <strong>${escapeHtml(surface.workspaceThread.composer.label)}</strong>
                ${escapeHtml(surface.workspaceThread.composer.draftRequest)}
              </div>
              ${surface.workspaceThread.threadPreview.map((message) => `
              <div class="work-message" data-work-message-role="${escapeHtml(message.role)}">
                <strong>${escapeHtml(message.label)} · ${escapeHtml(uiLabel(message.state))}</strong>
                ${escapeHtml(message.text)}
              </div>`).join("")}
              <div class="work-surface-grid" aria-label="Core work surface state">
                ${workSignal("작업 상태", surface.taskState.status)}
                ${workSignal("맥락", surface.contextPreview.status)}
                ${workSignal("스킬", surface.skillRoutePreview.status)}
                ${workSignal("권한", surface.authoritySummary.approvalStatus)}
              </div>
              <div class="work-surface-grid" aria-label="Core work surface route preview">
                ${workSignal("기억", `${surface.contextPreview.memoryEntries}`)}
                ${workSignal("T-cell", `${surface.contextPreview.tcellCandidates}`)}
                ${workSignal("스킬 후보", `${selectedPacks.length}`)}
                ${workSignal("잠긴 행동", `${closedActions.length}`)}
              </div>
              <div class="blocked-actions" aria-label="Core work surface closed authority actions" data-authority-boundary="closed">
                <strong>닫힌 실행 경계</strong>
                <span class="blocked-action"><span class="blocked-action-label">요약</span>외부 행동 없음 · 도구 실행 없음 · 모델 연결 실행 없음<span class="blocked-action-detail">아직 전송/실행/연결은 열리지 않음</span></span>
                ${closedActions.slice(0, 6).map((action) => `<span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(uiLabel(action))}<span class="blocked-action-detail">미리보기만</span></span>`).join("")}
              </div>
              <div class="work-surface-grid" aria-label="Context and skill route anchors">
                ${workSignal("맥락 근거", formatContextSignal(contextCandidates[0]))}
                ${workSignal("스킬 경로", selectedPacks[0]?.title || selectedPacks[0]?.id || "none")}
                ${workSignal("모델 후보", surface.modelToolRoutePreview.selectedModelAdapter || "none")}
                ${workSignal("도구 후보", `${surface.modelToolRoutePreview.toolAdapters.length}`)}
              </div>
              <div class="work-surface-grid" aria-label="First local work loop" data-first-local-work-loop="preview">
                ${workSignal("첫 로컬 루프", localLoop?.status || "none")}
                ${workSignal("작업 패킷", localLoop?.packet?.id || "none")}
                ${workSignal("기록 상태", localLoop?.approvalAudit?.recordWrite?.status || "none")}
                ${workSignal("replay 기준", localLoop?.approvalAudit?.rollbackReference || "none")}
              </div>
            </div>`;
}

function workSignal(label, value) {
  return `<div class="work-signal"><strong>${escapeHtml(label)}</strong>${escapeHtml(uiLabel(value || "none"))}</div>`;
}

function formatContextSignal(candidate) {
  if (!candidate) return "none";
  return `${uiLabel(candidate.anchor)} · ${uiLabel(candidate.admissionRole || candidate.lifecycle)}`;
}

function coreWorkSurfaceInspectorRows(panel) {
  if (panel.id !== "core-work-surface" || !panel.data) return "";
  const surface = panel.data;
  return [
    inspectorRow("입력 상태", uiLabel(surface.workspaceThread.composer.submission)),
    inspectorRow("작업 상태", `${uiLabel(surface.taskState.status)} · ${uiLabel(surface.taskState.inputSignal)}`),
    inspectorRow("맥락 미리보기", `${uiLabel(surface.contextPreview.status)} · 후보 ${surface.contextPreview.retrievedCandidates.length}`),
    inspectorRow("스킬 경로", (surface.skillRoutePreview.selectedPacks || []).map((pack) => uiLabel(pack.title || pack.id)).join(" · ") || "없음"),
    inspectorRow("첫 로컬 루프", `${uiLabel(surface.firstLocalWorkLoop?.status || "none")} · ${surface.firstLocalWorkLoop?.packet?.id || "none"}`),
    inspectorRow("로컬 기록/replay", `${uiLabel(surface.firstLocalWorkLoop?.approvalAudit?.recordWrite?.status || "none")} · ${surface.firstLocalWorkLoop?.approvalAudit?.rollbackReference || "none"}`),
    inspectorRow("권한 요약", (surface.authoritySummary.closedActions || []).map(uiLabel).join(" · ")),
  ].join("");
}

function adapterInspectorRows(panel) {
  if (panel.id !== "adapters" || !panel.data) return "";
  const boundary = panel.data.modelRouterBoundary;
  const policy = panel.data.modelRouterPolicy;
  if (!boundary) return "";
  return [
    inspectorRow("모델 라우터", `${uiLabel(boundary.route.route)} · ${uiLabel(boundary.route.adapterSelection.selected?.id || "none")}`),
    inspectorRow("제공자 경계", uiLabel(boundary.providerBoundary.externalProviderCall)),
    inspectorRow("속도/비용", `${uiLabel(boundary.latencyCostFallback.latencyBudget)} · ${uiLabel(boundary.latencyCostFallback.costPolicy)}`),
    inspectorRow("대체 경로", (boundary.latencyCostFallback.fallbackChain || []).map((item) => uiLabel(item.id)).join(" · ") || "none"),
    inspectorRow("라우트 프로필", (policy?.routeProfiles || []).map((profile) => uiLabel(profile.id)).join(" · ") || "none"),
    inspectorRow("실패 상태", (policy?.fallbackAndFailure?.failureStates || []).map((state) => uiLabel(state.id)).join(" · ") || "none"),
    inspectorRow("입력 조건", (policy?.contextMeshTaskPacket?.becomesModelInputWhen || []).map((condition) => uiLabel(condition.id)).join(" · ") || "none"),
    inspectorRow("출력 경계", uiLabel(policy?.modelOutputBoundary?.toolCliMcpExecution || "none")),
    inspectorRow("재검토 기준", `${policy?.replayAudit?.requiredCriteria?.length || 0}`),
    inspectorRow("잠긴 모델 행동", (boundary.blockedActions || []).map(uiLabel).join(" · ")),
  ].join("");
}

function connectorInspectorRows(panel) {
  if (panel.id !== "connectors" || !panel.data?.toolGovernance) return "";
  const governance = panel.data.toolGovernance;
  return [
    inspectorRow("실행 후보", (governance.candidateClasses || []).map((candidate) => uiLabel(candidate.id)).join(" · ") || "none"),
    inspectorRow("권한 단계", (governance.authorityTiers || []).map((tier) => `${uiLabel(tier.id)}:${uiLabel(tier.status)}`).join(" · ") || "none"),
    inspectorRow("모델 출력 경계", governance.modelOutputToExecutionProposal.outputIsExecutionAuthority === false ? "제안만 가능" : "실행 권한"),
    inspectorRow("승인 경계", uiLabel(governance.modelOutputToExecutionProposal.blockedUntil)),
    inspectorRow("감사/재검토/되돌리기", `${governance.auditReplayRollback.auditReference} · ${governance.auditReplayRollback.replayReference} · ${governance.auditReplayRollback.rollbackReference}`),
    inspectorRow("잠긴 실행", (governance.blockedActions || []).map(uiLabel).join(" · ")),
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
    inspectorRow("흐름 모드", panel.data.flowMode),
    inspectorRow("미리보기 상태", panel.data.userUnderstanding),
    inspectorRow("단계", (panel.data.stages || []).map((stage) => `${stage.label}:${uiLabel(stage.status)}`).join(" · ")),
    inspectorRow("계속 잠김", (panel.data.blockedActions || []).map(uiLabel).join(" · ")),
  ].join("");
}

function designReferenceHtml(panel) {
  if (panel.id !== "design-reference" || !panel.data) return "";
  const data = panel.data;
  const axes = data.referenceAxes || [];
  const evidence = data.evidenceRequirements || [];
  const criteria = data.visualAssessmentCriteria || [];

  return `
            <p class="approval-safe-note" data-design-reference-gate="required">${escapeHtml(data.nextSafeAction)}</p>
            <div class="approval-flow" aria-label="GPAO-T design reference axes" data-design-reference-axes="required">
              ${axes.map((axis, index) => `
              <div class="approval-stage" data-design-axis="${escapeHtml(axis.id)}">
                <span class="approval-stage-number">${escapeHtml(index + 1)}</span>
                <strong>${escapeHtml(axis.label)}</strong>
                <span class="approval-stage-status">필수</span>
                <small>${escapeHtml((axis.requiredSignals || []).slice(0, 3).join(" · "))}</small>
              </div>`).join("")}
            </div>
            <div class="blocked-actions" aria-label="Required design evidence" data-design-evidence="required">
              <strong>다음부터 남길 evidence</strong>
              ${evidence.map((item) => `
              <span class="blocked-action" data-design-evidence-item="${escapeHtml(item.id)}">
                <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(item.userMeaning)}
                <span class="blocked-action-detail">${escapeHtml(item.required ? "required" : "optional")}</span>
              </span>`).join("")}
            </div>
            <div class="blocked-actions" aria-label="Visual assessment criteria" data-visual-assessment="required">
              <strong>사람 눈 기준 평가</strong>
              ${criteria.map((item) => `
              <span class="blocked-action" data-visual-criterion="${escapeHtml(item.id)}">
                <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(item.fits)}
                <span class="blocked-action-detail">visual review</span>
              </span>`).join("")}
            </div>
            <div class="blocked-actions" aria-label="Design reference blocked actions" data-design-reference-boundary="no-execution">
              <strong>디자인 게이트가 열지 않는 것</strong>
              ${(data.blockedActions || []).map((action) => `
              <span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(uiLabel(action))}<span class="blocked-action-detail">쓰기 없음 · 호출 없음</span></span>`).join("")}
            </div>`;
}

function designReferenceInspectorRows(panel) {
  if (panel.id !== "design-reference" || !panel.data) return "";
  const data = panel.data;
  return [
    inspectorRow("모드", data.mode),
    inspectorRow("기준 축", (data.referenceAxes || []).map((axis) => axis.label).join(" · ")),
    inspectorRow("필수 증거", `${(data.evidenceRequirements || []).length}`),
    inspectorRow("보고 항목", (data.requiredReportFields || []).join(" · ")),
    inspectorRow("적용 화면", (data.supportedSurfaces || []).join(" · ")),
    inspectorRow("계속 잠김", (data.blockedActions || []).map(uiLabel).join(" · ")),
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
  const localRecordSubstrate = data.localRecordSubstrate || {};
  return `
            <div class="execution-review" aria-label="Execution proposal confirmation" data-execution-proposal-confirmation="preview-only">
              <p class="approval-safe-note" data-execution-no-write="true">${escapeHtml(data.uxContract.noExecutionNotice)} ${escapeHtml(data.uxContract.primaryQuestion)}</p>
              <div class="proposal-hero">
                <div class="proposal-card" data-execution-proposal="${escapeHtml(proposal.id || "unknown")}">
                  <span class="approval-stage-number" data-authority-icon="${escapeHtml(data.authorityDisplay.icon)}">${escapeHtml(iconSymbol(data.authorityDisplay.icon))}</span>
                  <strong>${escapeHtml(proposal.title || "실행 전 확인")}</strong>
                  <p>${escapeHtml(proposal.userSummary || proposal.expectedEffect || "")}</p>
                  <p>${escapeHtml(proposal.risk || "위험 정보 없음")}</p>
                </div>
                <div class="proposal-meta" aria-label="Execution proposal summary">
                  ${workSignal("행동 후보", proposal.actionType)}
                  ${workSignal("권한 단계", data.authorityDisplay.label)}
                  ${workSignal("예상 효과", proposal.expectedEffect)}
                  ${workSignal("되돌리기 기준", proposal.rollbackReference)}
                </div>
              </div>
              <div class="blocked-actions" aria-label="Korean authority levels" data-authority-levels="ko">
                <strong>권한 단계</strong>
                ${authorityLegend.map((level) => `
                <span class="blocked-action" data-authority-level="${escapeHtml(level.id)}" data-authority-tone="${escapeHtml(level.tone)}">
                  <span class="blocked-action-label">${escapeHtml(iconSymbol(level.icon))}</span>${escapeHtml(level.label)}
                  <span class="blocked-action-detail">${escapeHtml(level.description)}</span>
                </span>`).join("")}
              </div>
              <div class="blocked-actions" aria-label="Approval packet validation" data-approval-packet-validation="design-only">
                <strong>승인 패킷 검증</strong>
                ${validationRules.slice(0, 4).map((rule) => `
                <span class="blocked-action">
                  <span class="blocked-action-label">${escapeHtml(rule.label)}</span>${escapeHtml(rule.userMessage)}
                  <span class="blocked-action-detail">검증 기준</span>
                </span>`).join("")}
              </div>
              <div class="compact-review-grid" aria-label="Planned audit items" data-audit-preview="design-only">
                <strong>기록 예정 항목</strong>
                ${plannedAuditItems.slice(0, 6).map((item) => `
                <span class="blocked-action" data-audit-item="${escapeHtml(item.id)}">
                  <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(uiLabel(item.value))}
                  <span class="blocked-action-detail">${escapeHtml(item.userMeaning)}</span>
                </span>`).join("")}
              </div>
              <div class="record-flow" aria-label="Approval record write UX design" data-approval-record-write-ux="design-only">
                <strong>승인 기록 저장 전 확인</strong>
                ${approvalRecordStages.map((stage) => `
                <span class="record-step" data-approval-record-stage="${escapeHtml(stage.id)}">
                  <strong>${escapeHtml(stage.step)} · ${escapeHtml(stage.label)}</strong>
                  <span>${escapeHtml(uiLabel(stage.status))} · ${escapeHtml(stage.userMeaning)}</span>
                </span>`).join("")}
              </div>
              <div class="compact-review-grid" aria-label="Approval record preview items" data-approval-record-preview="no-write">
                <strong>저장될 항목 미리보기</strong>
                ${approvalRecordItems.slice(0, 6).map((item) => `
                <span class="blocked-action" data-approval-record-item="${escapeHtml(item.id)}">
                  <span class="blocked-action-label">${escapeHtml(item.label)}</span>${escapeHtml(uiLabel(item.value))}
                  <span class="blocked-action-detail">${escapeHtml(item.userMeaning)}</span>
                </span>`).join("")}
              </div>
              ${localRecordSubstrateHtml(localRecordSubstrate)}
              <div class="blocked-actions" aria-label="Execution approval blocked actions" data-audit-write-design="no-write">
                <strong>아직 열지 않음</strong>
                ${data.blockedActions.slice(0, 8).map((action) => `
                <span class="blocked-action"><span class="blocked-action-label">잠김</span>${escapeHtml(uiLabel(action))}<span class="blocked-action-detail">외부 실행 없음</span></span>`).join("")}
              </div>
            </div>`;
}

function executionApprovalInspectorRows(panel) {
  if (panel.id !== "execution-approval" || !panel.data) return "";
  const data = panel.data;
  return [
    inspectorRow("제안", `${uiLabel(data.proposal.toolKind)} · ${uiLabel(data.proposal.actionType)} · ${uiLabel(data.proposal.authorityLevel)}`),
    inspectorRow("예상 효과", data.proposal.expectedEffect),
    inspectorRow("위험", data.proposal.risk),
    inspectorRow("되돌리기", data.proposal.rollbackReference),
    inspectorRow("승인 필드", `${data.approvalPacket.requiredFields.length}`),
    inspectorRow("검증 규칙", `${data.validation.rules.length}`),
    inspectorRow("감사 항목", `${data.auditWriteDesign.plannedAuditItems.length}`),
    inspectorRow("감사 기록", data.localRecordSubstrate ? "로컬 JSONL 기록 가능" : "기록 설계만"),
    inspectorRow("승인 기록", data.localRecordSubstrate ? "로컬 JSONL 기록 가능" : "저장 설계만"),
    inspectorRow("저장 항목", `${data.approvalRecordWriteUx.recordItems.length}`),
    inspectorRow("로컬 기록", `승인 ${data.localRecordSubstrate?.counts?.approvalRecords || 0} · 감사 ${data.localRecordSubstrate?.counts?.auditRecords || 0}`),
    inspectorRow("리플레이", data.localRecordSubstrate?.latest?.approvalRecord?.replayReference || "아직 없음"),
    inspectorRow("언어", data.uxContract.defaultLocale),
  ].join("");
}

function localRecordSubstrateHtml(substrate = {}) {
  const counts = substrate.counts || {};
  const latest = substrate.latest?.approvalRecord;
  return `
              <div class="blocked-actions" aria-label="Local approval audit record substrate" data-local-record-substrate="v1">
                <strong>로컬 승인/감사 기록</strong>
                <span class="blocked-action">
                  <span class="blocked-action-label">기록</span>승인 ${escapeHtml(counts.approvalRecords || 0)} · 감사 ${escapeHtml(counts.auditRecords || 0)}
                  <span class="blocked-action-detail">${escapeHtml(substrate.storage?.format || "jsonl")}</span>
                </span>
                <span class="blocked-action">
                  <span class="blocked-action-label">최근</span>${escapeHtml(latest?.id || "아직 없음")}
                  <span class="blocked-action-detail">${escapeHtml(latest?.replayReference || "replay 대기")}</span>
                </span>
                <span class="blocked-action">
                  <span class="blocked-action-label">잠김</span>${escapeHtml((substrate.blockedBoundaries || []).slice(0, 4).map(uiLabel).join(" · "))}
                  <span class="blocked-action-detail">외부/비용/파괴/인증 정보 차단</span>
                </span>
              </div>`;
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
          <div class="state-card" data-state-card="${escapeHtml(stableStateId(label))}">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(value)}</span>
            <small>${escapeHtml(hint)}</small>
          </div>`;
}

function statePill(label, value) {
  return `
              <div class="state-pill" data-state-pill="${escapeHtml(stableStateId(label))}">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
              </div>`;
}

function statusChip(status) {
  const normalized = String(status || "unknown");
  return `<span class="status status-${escapeHtml(normalized)}">${escapeHtml(STATUS_LABELS[normalized] || normalized)}</span>`;
}

function uiLabel(value) {
  return UI_LABELS[String(value)] || value;
}

function stableStateId(label) {
  const ids = {
    "작업 흐름": "workflow",
    "작업": "workflow",
    "복구 상태": "recovery",
    "복구": "recovery",
    "권한 경계": "authority",
    "권한": "authority",
    "다음 행동": "next",
    "다음": "next",
  };
  return ids[label] || String(label).toLowerCase();
}

function iconSymbol(icon) {
  const symbols = {
    eye: "○",
    scan: "◇",
    "edit-3": "✎",
    send: "→",
    "octagon-alert": "!",
    "circle-dollar-sign": "$",
    shield: "◇",
    history: "↺",
    rotate: "↻",
    route: "⇄",
  };
  return symbols[icon] || "•";
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
                  <strong>돌아가기</strong>
                  <span><a href="#panel-${escapeHtml(panel.id)}">패널</a> · <a href="#authority-boundary">권한 경계</a> · <a href="#next-safe-action">다음 행동</a></span>
                </div>`;
}

function authorityLens(group) {
  return group === "권한"
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
    return `복구 우선 · 잠김 ${snapshot.counts.blocked}`;
  }
  if (snapshot.counts?.review) {
    return `검토 흐름 · 확인 ${snapshot.counts.review}`;
  }
  return "진행 가능 · 잠김 없음";
}

function recoveryState(snapshot) {
  const evidence = snapshot.counts?.recoveryRecords ?? 0;
  if (snapshot.counts?.blocked) {
    return `복구 필요 · 근거 ${evidence}`;
  }
  if (snapshot.counts?.review) {
    return `검토 필요 · 근거 ${evidence}`;
  }
  return `복구 대기 없음 · 근거 ${evidence}`;
}

function authorityState(snapshot) {
  const entries = Object.values(snapshot.authorityBoundary || {});
  const blocked = entries.filter((value) => String(value).includes("blocked")).length;
  return blocked ? `외부 실행 차단 · 잠김 ${blocked}` : "로컬 미리보기 허용";
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
