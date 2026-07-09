import { buildConnectorGovernanceSummary } from "./connector-governance.js";
import { readMemoryWiki, readTCellCandidates, resolveContextMesh } from "./memory-wiki.js";
import { routeModel } from "./model-router.js";
import { routeSkillPacks, buildSkillExecutionPlan } from "./skill-ecosystem.js";
import { readRuntimeState } from "./storage.js";
import { runTurn } from "./turn-kernel.js";

const DEFAULT_DRAFT_REQUEST = "GPAO-T 첫 작업 표면을 설계하고 다음 안전 행동을 정리해줘.";

const CLOSED_ACTIONS = [
  "external action",
  "tool activation",
  "model connector live execution",
  "connector activation",
  "approval record write",
  "dry-run invocation",
  "durable memory promotion",
  "self-growth apply",
  "deployment",
  "messenger send",
  "recurring automation",
];

export function buildCoreWorkSurface({
  root,
  draftRequest = DEFAULT_DRAFT_REQUEST,
  now = new Date().toISOString(),
} = {}) {
  const runtimeState = readRuntimeState({ root });
  const memoryWiki = readMemoryWiki({ root });
  const tcellCandidates = readTCellCandidates({ root });
  const contextPreview = resolveContextMesh({ root, request: draftRequest });
  const skillRoute = routeSkillPacks({ request: draftRequest });
  const skillExecutionPlan = buildSkillExecutionPlan({ skillRoute });
  const turnPreview = runTurn({ root, input: { text: draftRequest }, priorFlow: runtimeState.activeFlow });
  const modelRoute = routeModel({
    inputSignal: turnPreview.inputSignal,
    authorityDecision: turnPreview.authorityDecision,
  });
  const connectorGovernance = buildConnectorGovernanceSummary();
  const primaryContext = contextPreview.retrievedCandidates[0];
  const primarySkillPack = skillRoute.selectedPacks[0];

  return {
    schema: "gpao_t.core_work_surface.v0_1",
    status: "ready",
    surfaceKind: "user_facing_core_work_surface_first_slice",
    interactionMode: "no_script_read_only_preview",
    generatedAt: now,
    workspaceThread: {
      title: "GPAO-T Work Surface",
      language: "ko",
      mode: "draft_input_visible_no_submit",
      composer: {
        label: "작업 입력",
        placeholder: "GPAO-T에게 맡길 일을 적는 자리",
        draftRequest,
        submission: "blocked_in_this_slice",
      },
      threadPreview: [
        {
          role: "user",
          label: "사용자 요청",
          text: draftRequest,
          state: "draft_not_sent",
        },
        {
          role: "gpao-t",
          label: "GPAO-T 상태",
          text: turnPreview.userVisibleState.summary,
          state: "preview_only",
        },
      ],
    },
    understandingSummary: {
      status: "ready",
      mode: "read_only_summary_strip",
      purpose: "사용자가 세부 패널을 열기 전에 GPAO-T가 현재 요청을 어떻게 이해했는지 빠르게 읽게 한다.",
      cards: [
        {
          id: "understood-task",
          label: "이해한 일",
          value: turnPreview.taskPacket.objective,
          tone: "ready",
        },
        {
          id: "context-source",
          label: "맥락 근거",
          value: primaryContext?.anchor || "admitted context 없음",
          tone: primaryContext ? "ready" : "review",
        },
        {
          id: "skill-route",
          label: "스킬 방향",
          value: primarySkillPack?.title || "스킬 후보 없음",
          tone: primarySkillPack ? "ready" : "review",
        },
        {
          id: "execution-boundary",
          label: "실행 경계",
          value: "읽기 전용 · 실제 전송/모델/도구 실행 없음",
          tone: "locked",
        },
      ],
    },
    readabilityView: {
      status: "ready",
      interaction: "native_details_no_script",
      sections: [
        {
          id: "task-brief",
          title: "작업 브리프",
          summary: "현재 초안을 실행하지 않고 목표와 상태를 먼저 읽는다.",
          items: [
            `목표: ${turnPreview.taskPacket.objective}`,
            `입력 신호: ${turnPreview.inputSignal.kind}`,
            `현재 대상: ${turnPreview.taskPacket.activeTargetId}`,
          ],
        },
        {
          id: "route-brief",
          title: "맥락 / 스킬 라우트",
          summary: "Context Mesh와 Skill Pack 후보를 현재 요청의 읽기 힌트로만 보여준다.",
          items: [
            `주요 맥락: ${primaryContext?.anchor || "none"}`,
            `주요 스킬: ${primarySkillPack?.title || "none"}`,
            `라우트 모드: ${skillExecutionPlan.executionMode}`,
          ],
        },
        {
          id: "authority-brief",
          title: "권한 경계",
          summary: "읽기와 미리보기만 허용되고 실행 권한은 열리지 않는다.",
          items: [
            "입력 전송: blocked",
            "외부 모델 호출: blocked",
            "도구 / 커넥터 실행: blocked",
          ],
        },
      ],
      checklist: [
        "요청 목표를 먼저 확인한다.",
        "현재 맥락과 스킬 라우트가 맞는지 읽는다.",
        "실행 전 권한 경계가 닫혀 있는지 확인한다.",
      ],
    },
    confirmationUx: {
      schema: "gpao_t.work_surface_confirmation_ux.v0_1",
      status: "visible_preview_only",
      interactionMode: "no_script_confirmation_card",
      title: "제출 전 확인",
      userMessage:
        "아직 실행된 것은 없습니다. GPAO-T가 이해한 작업, 사용할 맥락, 제안된 스킬 경로, 닫힌 권한을 확인하는 단계입니다.",
      cards: [
        {
          id: "understood-input",
          label: "GPAO-T가 이해한 일",
          value: turnPreview.taskPacket.objective,
          state: "confirm_before_draft",
        },
        {
          id: "context-evidence",
          label: "맥락 근거",
          value: primaryContext?.anchor || "아직 강한 Context Mesh 후보 없음",
          state: primaryContext ? "attached_preview" : "review",
        },
        {
          id: "skill-route",
          label: "스킬 경로",
          value: primarySkillPack?.title || "Core thinking route",
          state: skillExecutionPlan.executionMode,
        },
        {
          id: "authority-boundary",
          label: "권한 경계",
          value: "실제 제출, 모델 호출, 도구 실행, 외부 전송은 잠겨 있음",
          state: "locked",
        },
      ],
      confirmMeaning: "미리보기 확인만 의미하며 live submission을 열지 않는다.",
      noExecutionNotice: "아직 실행된 것은 없음",
      preparesLocalDraftPreview: true,
      nextProductDirection: "first_local_draft_preview",
      opensLiveSubmission: false,
      writesApprovalRecord: false,
    },
    localDraftPreview: {
      schema: "gpao_t.local_draft_preview.v0_1",
      status: "visible_local_preview_structure",
      purpose: "확인된 이해/맥락/스킬/권한을 바탕으로 GPAO-T가 어떻게 처리할 예정인지 한눈에 보여준다.",
      previewMode: "structure_only_no_model_no_submit",
      headline: "이렇게 처리될 예정입니다",
      understoodTask: turnPreview.taskPacket.objective,
      expectedOutputShape: {
        label: "예상 출력 형태",
        value: "작업 요약, 선택된 맥락, 권한 경계, 다음 안전 행동을 포함한 local draft preview",
        state: "preview_only",
      },
      contextToUse: {
        label: "사용될 맥락",
        value: primaryContext?.anchor || "강한 Context Mesh 후보가 없어서 확인 필요",
        state: primaryContext ? "attached_preview" : "review_needed",
      },
      skillRoute: {
        label: "스킬 경로",
        value: primarySkillPack?.title || "Core thinking route",
        state: skillExecutionPlan.executionMode || "preview_only",
      },
      lockedExecutionState: {
        label: "실행 전 잠금",
        value: "live submission, model call, tool execution, connector activation, external send는 모두 닫혀 있음",
        state: "locked_before_execution",
      },
      sections: [
        {
          id: "understood-task",
          label: "이해한 작업",
          value: turnPreview.taskPacket.objective,
          state: draftRequest.trim() ? "ready" : "empty",
        },
        {
          id: "expected-output",
          label: "예상 출력",
          value: "local-only draft preview 구조",
          state: "preview_only",
        },
        {
          id: "context-to-use",
          label: "사용될 맥락",
          value: primaryContext?.anchor || "맥락 후보 확인 필요",
          state: primaryContext ? "attached_preview" : "review_needed",
        },
        {
          id: "skill-route",
          label: "스킬 경로",
          value: primarySkillPack?.title || "Core thinking route",
          state: skillExecutionPlan.executionMode || "preview_only",
        },
        {
          id: "locked-state",
          label: "잠금 상태",
          value: "아직 실행 전이며 모든 외부/모델/도구 행동은 차단됨",
          state: "blocked_until_future_approval",
        },
      ],
      productStates: [
        {
          id: "empty",
          label: "입력이 비어 있으면",
          userMessage: "작업 내용을 먼저 적어야 preview를 만들 수 있습니다.",
          outcome: "empty",
        },
        {
          id: "blocked",
          label: "위험 행동이 포함되면",
          userMessage: "외부 전송, 모델 호출, 도구 실행, 커넥터 활성화는 이 화면에서 실행되지 않습니다.",
          outcome: "blocked",
        },
        {
          id: "review-needed",
          label: "맥락이 애매하면",
          userMessage: "GPAO-T가 이해한 일과 사용할 맥락을 사용자가 먼저 확인해야 합니다.",
          outcome: "review_needed",
        },
      ],
      visualQaEvidence: {
        contract:
          "docs/03-verification/evidence/work-surface-local-draft-preview-qa-2026-07-09.json",
        desktop:
          "docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-desktop-viewport-1440x960.jpg",
        mobile:
          "docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-mobile-viewport-390x844.jpg",
      },
      nextAfterPreview: "사용자가 preview를 이해한 뒤에도 실제 제출/모델/도구/외부 실행은 별도 승인 경계에서 멈춘다.",
      structureVisible: true,
      draftContentGeneratedNow: false,
      generationMode: "local_structure_preview_only",
      opensLiveSubmission: false,
      invokesModel: false,
      executesTools: false,
      activatesConnectors: false,
      sendsExternally: false,
      writesApprovalRecord: false,
      installsUpdatesOrRollsBack: false,
      promotesDurableMemory: false,
    },
    taskState: {
      id: turnPreview.taskPacket.id,
      status: turnPreview.status,
      inputSignal: turnPreview.inputSignal.kind,
      activeTargetId: turnPreview.taskPacket.activeTargetId,
      objective: turnPreview.taskPacket.objective,
      selectedModelAdapter: turnPreview.taskPacket.selectedModelAdapter,
      admittedToolAdapters: turnPreview.taskPacket.admittedToolAdapters,
      skillExecutionMode: turnPreview.taskPacket.skillExecutionPlan.executionMode,
    },
    contextPreview: {
      status: contextPreview.status,
      memoryEntries: memoryWiki.entries.length,
      tcellCandidates: tcellCandidates.length,
      retrievedCandidates: contextPreview.retrievedCandidates.slice(0, 3).map((candidate) => ({
        id: candidate.id,
        anchor: candidate.anchor,
        score: candidate.meshScore,
        lifecycle: candidate.lifecycle,
      })),
      latestMemoryEntry: memoryWiki.entries.at(-1) || null,
      boundary: "Context Mesh preview only; candidates are not durable promotion or live action authority.",
    },
    skillRoutePreview: {
      status: skillRoute.status,
      selectedPacks: skillRoute.selectedPacks.slice(0, 4).map((pack) => ({
        id: pack.id,
        title: pack.title,
        routeRole: pack.routeRole,
        score: pack.score,
        firstQualityGate: pack.firstQualityGate,
      })),
      executionMode: skillExecutionPlan.executionMode,
      artifactTypes: skillExecutionPlan.artifactContract?.artifactTypes || [],
      authority: skillExecutionPlan.authorityContract,
    },
    modelToolRoutePreview: {
      modelRoute: modelRoute.route,
      selectedModelAdapter: modelRoute.adapterSelection?.selected?.id || null,
      liveModelExecution: false,
      toolAdapters: turnPreview.taskPacket.admittedToolAdapters,
      liveToolExecution: false,
    },
    authoritySummary: {
      approvalStatus: turnPreview.authorityDecision.status,
      requiredApprovals: turnPreview.authorityDecision.requiredApprovals,
      connectorActivation: connectorGovernance.authorityBoundary.oauthSetup,
      externalModelCall: "blocked_until_configured_and_approved",
      externalToolAction: "blocked_until_explicit_approval",
      approvalRecordWrite: "blocked",
      dryRunInvocation: "blocked",
      durableMemoryPromotion: runtimeState.boundaries?.durableMemoryPromotion || "blocked",
      selfGrowthApply: "blocked",
      closedActions: CLOSED_ACTIONS,
    },
    safetyInvariants: {
      rendersOnly: true,
      acceptsDraftInputVisually: true,
      submitsInput: false,
      callsExternalModel: false,
      executesTools: false,
      activatesConnectors: false,
      writesApprovalRecord: false,
      invokesDryRun: false,
      promotesDurableMemory: false,
      appliesSelfGrowth: false,
      deploysOrSendsExternally: false,
      usesScript: false,
      usesForm: false,
    },
    nextSafeAction:
      "local draft preview에서 이해한 작업, 예상 출력, 사용될 맥락, 스킬 경로, 잠금 상태를 확인한다. 실제 제출/모델/도구/커넥터/외부 실행은 계속 열지 않는다.",
  };
}

export function verifyCoreWorkSurface({ surface = buildCoreWorkSurface(), html } = {}) {
  const findings = [];

  if (surface.schema !== "gpao_t.core_work_surface.v0_1") findings.push("invalid_surface_schema");
  if (surface.interactionMode !== "no_script_read_only_preview") findings.push("interaction_mode_not_read_only");
  if (surface.workspaceThread.composer.submission !== "blocked_in_this_slice") findings.push("composer_submission_open");
  if (!surface.workspaceThread.threadPreview.some((item) => item.role === "user")) findings.push("missing_user_thread_preview");
  if (!surface.workspaceThread.threadPreview.some((item) => item.role === "gpao-t")) findings.push("missing_gpao_thread_preview");
  if (surface.understandingSummary?.mode !== "read_only_summary_strip") findings.push("missing_understanding_summary");
  if ((surface.understandingSummary?.cards || []).length < 4) findings.push("missing_understanding_cards");
  if (!surface.understandingSummary?.cards?.some((card) => card.id === "execution-boundary" && card.tone === "locked")) findings.push("missing_locked_understanding_boundary");
  if (surface.readabilityView?.interaction !== "native_details_no_script") findings.push("missing_readability_interaction");
  if ((surface.readabilityView?.sections || []).length < 3) findings.push("missing_readability_sections");
  if (!(surface.readabilityView?.checklist || []).length) findings.push("missing_readability_checklist");
  if (surface.confirmationUx?.interactionMode !== "no_script_confirmation_card") findings.push("missing_confirmation_ux");
  if (!surface.confirmationUx?.cards?.some((card) => card.id === "understood-input")) findings.push("missing_confirmation_understood_input");
  if (!surface.confirmationUx?.cards?.some((card) => card.id === "context-evidence")) findings.push("missing_confirmation_context_evidence");
  if (!surface.confirmationUx?.cards?.some((card) => card.id === "skill-route")) findings.push("missing_confirmation_skill_route");
  if (!surface.confirmationUx?.cards?.some((card) => card.id === "authority-boundary" && card.state === "locked")) findings.push("missing_confirmation_authority_boundary");
  if (surface.confirmationUx?.opensLiveSubmission !== false) findings.push("confirmation_opens_live_submission");
  if (surface.confirmationUx?.nextProductDirection !== "first_local_draft_preview") findings.push("confirmation_next_direction_not_local_draft_preview");
  if (surface.localDraftPreview?.status !== "visible_local_preview_structure") findings.push("missing_local_draft_preview_structure");
  if (surface.localDraftPreview?.structureVisible !== true) findings.push("local_draft_structure_not_visible");
  if (surface.localDraftPreview?.draftContentGeneratedNow !== false) findings.push("local_draft_content_generated_too_early");
  if (!surface.localDraftPreview?.sections?.some((section) => section.id === "expected-output")) findings.push("local_draft_missing_expected_output");
  if (!surface.localDraftPreview?.sections?.some((section) => section.id === "locked-state")) findings.push("local_draft_missing_locked_state");
  if (!surface.localDraftPreview?.productStates?.some((state) => state.id === "empty")) findings.push("local_draft_missing_empty_state");
  if (!surface.localDraftPreview?.productStates?.some((state) => state.id === "blocked")) findings.push("local_draft_missing_blocked_state");
  if (!surface.localDraftPreview?.productStates?.some((state) => state.id === "review-needed")) findings.push("local_draft_missing_review_state");
  if (surface.localDraftPreview?.opensLiveSubmission !== false) findings.push("local_draft_submission_open");
  if (surface.localDraftPreview?.invokesModel !== false) findings.push("local_draft_model_open");
  if (surface.localDraftPreview?.executesTools !== false) findings.push("local_draft_tools_open");
  if (surface.localDraftPreview?.activatesConnectors !== false) findings.push("local_draft_connector_open");
  if (surface.localDraftPreview?.sendsExternally !== false) findings.push("local_draft_external_send_open");
  if (surface.localDraftPreview?.promotesDurableMemory !== false) findings.push("local_draft_memory_promotion_open");
  if (!surface.taskState.objective) findings.push("missing_task_objective");
  if (!surface.contextPreview.boundary.includes("preview only")) findings.push("context_boundary_not_preview_only");
  if (!surface.skillRoutePreview.executionMode) findings.push("missing_skill_route_preview");
  if (surface.modelToolRoutePreview.liveModelExecution !== false) findings.push("live_model_execution_open");
  if (surface.modelToolRoutePreview.liveToolExecution !== false) findings.push("live_tool_execution_open");
  if (!surface.authoritySummary.closedActions.includes("connector activation")) findings.push("connector_activation_not_closed");
  if (surface.safetyInvariants.submitsInput !== false) findings.push("input_submission_open");
  if (surface.safetyInvariants.callsExternalModel !== false) findings.push("external_model_open");
  if (surface.safetyInvariants.executesTools !== false) findings.push("tool_execution_open");
  if (surface.safetyInvariants.activatesConnectors !== false) findings.push("connector_activation_open");
  if (surface.safetyInvariants.usesScript !== false) findings.push("script_invariant_open");
  if (surface.safetyInvariants.usesForm !== false) findings.push("form_invariant_open");

  if (html) {
    if (!html.includes("GPAO-T Work Surface")) findings.push("html_missing_title");
    if (!html.includes("data-core-work-surface=\"read-only\"")) findings.push("html_missing_surface_marker");
    if (!html.includes("data-understanding-summary=\"read-only\"")) findings.push("html_missing_understanding_summary");
    if (!html.includes("data-readability-interaction=\"native-details\"")) findings.push("html_missing_readability_marker");
    if (!html.includes("data-confirmation-ux=\"preview-only\"")) findings.push("html_missing_confirmation_ux");
    if (!html.includes("data-local-draft-preview=\"visible-local-structure\"")) findings.push("html_missing_local_draft_preview");
    if (!html.includes("이렇게 처리될 예정입니다")) findings.push("html_missing_local_draft_headline");
    if (!html.includes("data-local-draft-state=\"blocked\"")) findings.push("html_missing_local_draft_blocked_state");
    if (!html.includes("data-local-draft-state=\"review-needed\"")) findings.push("html_missing_local_draft_review_state");
    if (!html.includes("아직 실행된 것은 없습니다")) findings.push("html_missing_no_execution_notice");
    if (!html.includes("data-composer-state=\"draft-not-sent\"")) findings.push("html_missing_composer_marker");
    if (!html.includes("data-authority-boundary=\"closed\"")) findings.push("html_missing_authority_marker");
    if (/<script/i.test(html)) findings.push("script_tag_present");
    if (/<form/i.test(html)) findings.push("form_present");
    if (/method=["']?post/i.test(html)) findings.push("post_form_present");
    if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(html)) findings.push("external_url_present");
  }

  return {
    schema: "gpao_t.core_work_surface_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedBoundaries: surface.authoritySummary.closedActions,
    nextSafeAction: findings.length
      ? "Fix core work surface findings before visual QA."
      : surface.nextSafeAction,
  };
}

export function buildCoreWorkSurfaceHtml({ surface } = {}) {
  const workSurface = surface || buildCoreWorkSurface();
  const selectedPacks = workSurface.skillRoutePreview.selectedPacks;
  const contextCandidates = workSurface.contextPreview.retrievedCandidates;
  const readabilitySections = workSurface.readabilityView.sections || [];
  const understandingCards = workSurface.understandingSummary.cards || [];
  const confirmationCards = workSurface.confirmationUx.cards || [];
  const draftPreviewSections = workSurface.localDraftPreview.sections || [];
  const draftProductStates = workSurface.localDraftPreview.productStates || [];

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Work Surface</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --surface: #ffffff;
      --muted: #607080;
      --text: #17202a;
      --line: #d9e1e8;
      --soft: #eef3f7;
      --ready: #0b7a53;
      --review: #986000;
      --blocked: #b42318;
      --accent: #2857a3;
    }
    * { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }
    .topbar-main {
      min-width: 0;
    }
    .topbar-action {
      margin-top: 4px;
      color: var(--review);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    h1, h2, h3, p { margin: 0; letter-spacing: 0; }
    h1 { font-size: 19px; line-height: 1.2; }
    h2 { font-size: 15px; }
    h3 { font-size: 13px; }
    .subtitle, .muted { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
    .status {
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--ready);
      background: #fff;
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
      gap: 14px;
      padding: 16px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .thread, .panel, .composer, .message, .state-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: 0 1px 2px rgba(23, 32, 42, 0.06);
    }
    .thread, .panel { padding: 14px; min-width: 0; }
    .panel + .panel { margin-top: 12px; }
    .composer {
      min-height: 118px;
      margin-top: 12px;
      padding: 12px;
      background: #fbfcfd;
    }
    .composer-label {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .composer-body {
      margin-top: 8px;
      min-height: 62px;
      color: var(--text);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .composer-lock {
      margin-top: 8px;
      color: var(--review);
      font-size: 12px;
      font-weight: 800;
    }
    .message-list {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .understanding-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .understanding-card {
      min-width: 0;
      min-height: 82px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
    }
    .understanding-card[data-tone="locked"] {
      border-color: #efd2a8;
      background: #fffaf0;
    }
    .understanding-card strong {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .understanding-card span {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .readability-panel {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .readability-panel details {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
      padding: 10px;
    }
    .readability-panel summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .readability-panel p,
    .readability-panel li {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .readability-panel ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    .checklist {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #c9dccf;
      border-radius: 8px;
      background: #f5fbf7;
    }
    .confirmation-card {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #b9c9df;
      border-radius: 8px;
      background: #f8fbff;
    }
    .confirmation-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .confirmation-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .confirmation-item {
      min-width: 0;
      min-height: 90px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
    }
    .confirmation-item[data-state="locked"] {
      border-color: #efd2a8;
      background: #fffaf0;
    }
    .confirmation-item strong,
    .confirmation-item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .confirmation-item strong {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    .confirmation-item span {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
    }
    .confirmation-note {
      margin-top: 10px;
      color: var(--review);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .draft-preview {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #b7d7c6;
      border-radius: 8px;
      background: #f8fcfa;
    }
    .draft-preview-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .draft-preview-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .draft-preview-item {
      min-width: 0;
      min-height: 92px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
    }
    .draft-preview-item[data-state*="blocked"],
    .draft-preview-item[data-state*="locked"] {
      border-color: #efd2a8;
      background: #fffaf0;
    }
    .draft-preview-item[data-state*="review"] {
      border-color: #e0cc8f;
      background: #fffdf3;
    }
    .draft-preview-item strong,
    .draft-preview-item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .draft-preview-item strong {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    .draft-preview-item span {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
    }
    .draft-state-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .draft-state {
      min-width: 0;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
    }
    .draft-state[data-local-draft-state="blocked"] {
      border-color: #efd2a8;
      background: #fffaf0;
    }
    .draft-state strong,
    .draft-state span {
      display: block;
      overflow-wrap: anywhere;
    }
    .draft-state strong { font-size: 12px; }
    .draft-state span {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .checklist strong {
      display: block;
      color: var(--ready);
      font-size: 12px;
      margin-bottom: 5px;
    }
    .message {
      padding: 12px;
      min-width: 0;
    }
    .message strong {
      display: block;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .message p { font-size: 13px; overflow-wrap: anywhere; }
    .state-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .state-card {
      min-height: 78px;
      padding: 10px;
      min-width: 0;
    }
    .state-card strong {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    .state-card span {
      display: block;
      margin-top: 5px;
      font-size: 13px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .item {
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--soft);
      min-width: 0;
    }
    .item strong, .item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .item strong { font-size: 12px; }
    .item span { color: var(--muted); font-size: 12px; }
    .authority-strip {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .lock {
      padding: 7px 8px;
      border: 1px solid #efd2a8;
      border-radius: 7px;
      background: #fffaf0;
      color: #775200;
      font-size: 11px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .next {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      font-size: 13px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    @media (max-width: 820px) {
      .layout { grid-template-columns: 1fr; padding: 12px; }
      .topbar { flex-direction: column; gap: 8px; }
      .understanding-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .confirmation-grid, .draft-preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .draft-state-strip { grid-template-columns: 1fr; }
      h1 { font-size: 17px; }
    }
    @media (max-width: 520px) {
      .topbar {
        position: fixed;
        width: 100%;
        padding: 12px 14px;
      }
      .layout { padding-top: 146px; }
      .state-grid, .authority-strip, .understanding-strip, .confirmation-grid, .draft-preview-grid { grid-template-columns: 1fr; }
      .thread, .panel { padding: 12px; }
    }
  </style>
</head>
<body data-core-work-surface="read-only" data-external-activation="blocked">
  <header class="topbar">
    <div class="topbar-main">
      <h1>GPAO-T Work Surface</h1>
      <p class="subtitle">작업 초안 · 맥락 프리뷰 · 권한 경계</p>
      <p class="topbar-action">다음 안전 행동: confirmation 확인 후 first local draft preview · 실제 전송/모델/도구 실행 없음</p>
    </div>
    <span class="status">${escapeHtml(workSurface.status)}</span>
  </header>
  <main class="layout">
    <section class="thread" aria-label="GPAO-T work thread">
      <h2>작업</h2>
      <p class="muted">현재 요청은 전송되지 않은 초안 상태다.</p>
      <div class="composer" role="textbox" aria-readonly="true" data-composer-state="draft-not-sent" tabindex="0">
        <div class="composer-label">
          <span>${escapeHtml(workSurface.workspaceThread.composer.label)}</span>
          <span>${escapeHtml(workSurface.workspaceThread.composer.submission)}</span>
        </div>
        <div class="composer-body">${escapeHtml(workSurface.workspaceThread.composer.draftRequest)}</div>
        <div class="composer-lock">no external action · no tool activation · no live model connector execution</div>
      </div>
      <div class="message-list">
        ${workSurface.workspaceThread.threadPreview.map((message) => `
        <article class="message" data-message-role="${escapeHtml(message.role)}">
          <strong>${escapeHtml(message.label)} · ${escapeHtml(message.state)}</strong>
          <p>${escapeHtml(message.text)}</p>
        </article>`).join("")}
      </div>
      <div class="understanding-strip" data-understanding-summary="read-only" aria-label="Read-only task understanding summary">
        ${understandingCards.map((card) => `
        <div class="understanding-card" data-understanding-card="${escapeHtml(card.id)}" data-tone="${escapeHtml(card.tone)}">
          <strong>${escapeHtml(card.label)}</strong>
          <span>${escapeHtml(card.value)}</span>
        </div>`).join("")}
      </div>
      <div class="readability-panel" data-readability-interaction="native-details">
        ${readabilitySections.map((section, index) => `
        <details ${index === 0 ? "open" : ""} data-readability-section="${escapeHtml(section.id)}">
          <summary>${escapeHtml(section.title)}</summary>
          <p>${escapeHtml(section.summary)}</p>
          <ul>
            ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </details>`).join("")}
        <div class="checklist" aria-label="Read-only task handoff checklist">
          <strong>읽기 체크리스트</strong>
          <ul>
            ${workSurface.readabilityView.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
      <section class="confirmation-card" data-confirmation-ux="preview-only" aria-label="Work surface confirmation card">
        <div class="confirmation-head">
          <div>
            <h2>${escapeHtml(workSurface.confirmationUx.title)}</h2>
            <p class="muted">${escapeHtml(workSurface.confirmationUx.userMessage)}</p>
          </div>
          <span class="status">${escapeHtml(workSurface.confirmationUx.status)}</span>
        </div>
        <div class="confirmation-grid">
          ${confirmationCards.map((card) => `
          <div class="confirmation-item" data-confirmation-card="${escapeHtml(card.id)}" data-state="${escapeHtml(card.state)}">
            <strong>${escapeHtml(card.label)}</strong>
            <span>${escapeHtml(card.value)}</span>
          </div>`).join("")}
        </div>
        <p class="confirmation-note">${escapeHtml(workSurface.confirmationUx.noExecutionNotice)} · ${escapeHtml(workSurface.confirmationUx.confirmMeaning)}</p>
      </section>
      <section class="draft-preview" data-local-draft-preview="visible-local-structure" aria-label="Local draft preview">
        <div class="draft-preview-head">
          <div>
            <h2>${escapeHtml(workSurface.localDraftPreview.headline)}</h2>
            <p class="muted">${escapeHtml(workSurface.localDraftPreview.purpose)}</p>
          </div>
          <span class="status">${escapeHtml(workSurface.localDraftPreview.status)}</span>
        </div>
        <div class="draft-preview-grid">
          ${draftPreviewSections.map((section) => `
          <div class="draft-preview-item" data-local-draft-section="${escapeHtml(section.id)}" data-state="${escapeHtml(section.state)}">
            <strong>${escapeHtml(section.label)}</strong>
            <span>${escapeHtml(section.value)}</span>
          </div>`).join("")}
        </div>
        <div class="draft-state-strip" aria-label="Local draft preview product states">
          ${draftProductStates.map((state) => `
          <div class="draft-state" data-local-draft-state="${escapeHtml(state.id)}" data-outcome="${escapeHtml(state.outcome)}">
            <strong>${escapeHtml(state.label)}</strong>
            <span>${escapeHtml(state.userMessage)}</span>
          </div>`).join("")}
        </div>
        <p class="confirmation-note">${escapeHtml(workSurface.localDraftPreview.nextAfterPreview)}</p>
        <p class="confirmation-note">draft content generated now: ${escapeHtml(workSurface.localDraftPreview.draftContentGeneratedNow)} · model: ${escapeHtml(workSurface.localDraftPreview.invokesModel)} · tools: ${escapeHtml(workSurface.localDraftPreview.executesTools)} · connectors: ${escapeHtml(workSurface.localDraftPreview.activatesConnectors)}</p>
      </section>
      <div class="state-grid" aria-label="Current task state">
        ${stateCard("Task", workSurface.taskState.status)}
        ${stateCard("Signal", workSurface.taskState.inputSignal)}
        ${stateCard("Target", workSurface.taskState.activeTargetId)}
        ${stateCard("Skill Mode", workSurface.taskState.skillExecutionMode)}
      </div>
      <p class="next">${escapeHtml(workSurface.nextSafeAction)}</p>
    </section>
    <section>
      <article class="panel">
        <h2>Context Mesh / Memory Wiki</h2>
        <p class="muted">${escapeHtml(workSurface.contextPreview.boundary)}</p>
        <div class="state-grid">
          ${stateCard("Memory", `${workSurface.contextPreview.memoryEntries}`)}
          ${stateCard("T-cells", `${workSurface.contextPreview.tcellCandidates}`)}
        </div>
        <div class="list">
          ${(contextCandidates.length ? contextCandidates : [{ id: "empty", anchor: "no candidate admitted", score: 0, lifecycle: "preview" }]).map((candidate) => `
          <div class="item" data-context-candidate="${escapeHtml(candidate.id)}">
            <strong>${escapeHtml(candidate.anchor)}</strong>
            <span>${escapeHtml(candidate.lifecycle)} · score ${escapeHtml(candidate.score)}</span>
          </div>`).join("")}
        </div>
      </article>
      <article class="panel">
        <h2>Skill Pack Route</h2>
        <p class="muted">${escapeHtml(workSurface.skillRoutePreview.executionMode)}</p>
        <div class="list">
          ${(selectedPacks.length ? selectedPacks : [{ id: "none", title: "No pack selected", routeRole: "review", firstQualityGate: "clarify request" }]).map((pack) => `
          <div class="item" data-skill-pack="${escapeHtml(pack.id)}">
            <strong>${escapeHtml(pack.title)}</strong>
            <span>${escapeHtml(pack.routeRole)} · ${escapeHtml(pack.firstQualityGate)}</span>
          </div>`).join("")}
        </div>
      </article>
      <article class="panel" data-authority-boundary="closed">
        <h2>Authority / Approval</h2>
        <p class="muted">${escapeHtml(workSurface.authoritySummary.approvalStatus)}</p>
        <div class="authority-strip">
          ${workSurface.authoritySummary.closedActions.slice(0, 8).map((action) => `<span class="lock">${escapeHtml(action)}</span>`).join("")}
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

function stateCard(label, value) {
  return `<div class="state-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || "none")}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
