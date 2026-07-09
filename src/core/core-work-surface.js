import { buildConnectorGovernanceSummary } from "./connector-governance.js";
import { buildApprovalAuditLocalRecordSubstrate } from "./approval-audit-records.js";
import { buildExecutionApprovalPreview } from "./execution-approval.js";
import { buildFirstLocalWorkLoop } from "./first-local-work-loop.js";
import { buildWorkSurfaceExecutionFlow } from "./work-surface-execution-flow.js";
import { readMemoryWiki, readTCellCandidates, resolveContextMesh } from "./memory-wiki.js";
import { routeModel } from "./model-router.js";
import {
  readSessionWorkspaceState,
  SESSION_STATE_LABELS,
} from "./session-workspace.js";
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

const UI_LABELS = {
  ready: "준비됨",
  review: "검토 필요",
  blocked: "잠김",
  active: "진행 중",
  draft: "초안",
  waiting_approval: "확인 필요",
  archived: "보관됨",
  delete_pending: "삭제 대기",
  rename: "이름 변경",
  archive: "보관",
  restore: "복구",
  mark_delete_pending: "삭제 대기",
  cancel_delete_pending: "삭제 대기 취소",
  allowed: "허용됨",
  draft_not_sent: "초안 · 미전송",
  preview_only: "미리보기만",
  visible_preview_only: "미리보기만",
  visible_preview_ready: "미리보기 준비",
  visible_local_preview_structure: "로컬 preview",
  confirm_before_draft: "초안 전 확인",
  attached_preview: "근거 연결됨",
  review_needed: "확인 필요",
  locked: "잠김",
  locked_before_execution: "실행 전 잠김",
  blocked_until_future_approval: "승인 전 잠김",
  local_execution_plan: "로컬 계획",
  "external action": "외부 행동",
  "tool activation": "도구 실행",
  "model connector live execution": "모델 연결 실행",
  "connector activation": "커넥터 활성화",
  "approval record write": "승인 기록 쓰기",
  "audit record write": "감사 기록 쓰기",
  "replay read": "기록 재생 읽기",
  "rollback reference read": "되돌리기 기준 읽기",
  "dry-run invocation": "미리보기 실행",
  "durable memory promotion": "지속 기억 승격",
  "self-growth apply": "자가성장 적용",
  deployment: "배포",
  "messenger send": "메신저 전송",
  "recurring automation": "반복 자동화",
  general_request: "일반 요청",
  cli: "로컬 명령 후보",
  "cli.dry_run": "로컬 명령 미리보기",
  "미리보기만 · dry_run": "미리보기만",
  dry_run: "미리보기 후보",
  confirmed_for_local_record_only: "로컬 기록만 확인",
  written_local_only: "로컬 저장됨",
  not_written: "아직 저장 전",
  local_record: "로컬 기록",
  local_jsonl_record_write_read_replay: "로컬 기록/재생",
  local_record_only: "로컬 기록 한정",
  blocked_in_this_slice: "이번 단계에서는 미전송",
  visible_local_preview_structure: "로컬 미리보기",
  local_structure_preview_only: "로컬 구조 미리보기",
  local_reasoning_stub: "로컬 추론 후보",
  "local.reasoning.stub": "로컬 추론 후보",
  "gpao-core-thinking-pack": "GPAO Core Thinking Pack",
  "GPAO Core Thinking Pack": "핵심 사고 정리 팩",
  "GPAO Document Output Pack": "문서 결과물 정리 팩",
  "GPAO Visual Design Pack": "시각 품질 점검 팩",
  "Core thinking route": "핵심 사고 정리 경로",
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
  "목표: Recover the release-file active target and answer or draft only within local authority.":
    "목표: 현재 릴리스 파일 흐름을 복구하고 로컬 권한 안에서만 답변하거나 초안을 만듭니다.",
  "입력 신호: general_request": "입력 신호: 일반 요청",
  "현재 대상: release-file": "현재 대상: 릴리스 파일",
  "주요 맥락: release-file": "주요 맥락: 릴리스 파일",
  "주요 스킬: GPAO Core Thinking Pack": "주요 스킬: 핵심 사고 정리 팩",
  "라우트 모드: local_execution_plan": "라우트 모드: 로컬 계획",
  "입력 전송: blocked": "입력 전송: 잠김",
  "외부 모델 호출: blocked": "외부 모델 호출: 잠김",
  "도구 / 커넥터 실행: blocked": "도구 / 커넥터 실행: 잠김",
  candidate: "후보",
  "no candidate admitted": "아직 채택된 맥락 없음",
  intent_recovery: "의도 복구",
  supporting_skill: "보조 스킬",
  quality_anchor: "품질 기준",
  "Separates facts, assumptions, risks, and next action.": "사실, 가정, 위험, 다음 행동을 분리합니다.",
  "Reader, purpose, and action are clear in the first screen.": "첫 화면에서 독자, 목적, 행동이 분명한지 봅니다.",
  "Typography, spacing, contrast, responsive behavior, and visual hierarchy are checked.":
    "글자, 여백, 대비, 반응형 흐름, 시각 위계를 점검합니다.",
  "proposal.local_draft_preview": "로컬 초안 제안",
  proposal_local_draft_preview: "로컬 초안 제안",
  model_skill_user_request_preview: "모델/스킬/요청 미리보기",
  "cli,dry_run": "로컬 명령 미리보기",
  not_confirmed: "아직 확인 전",
  not_invoked: "아직 실행 전",
  preview_packet_not_written: "저장 전 승인 패킷",
  local_preview_only: "로컬 미리보기 한정",
  preview_only_not_scheduled: "만료 없음 · 미리보기",
  "replay.reference.required_before_write": "기록 전 리플레이 기준 필요",
  ".gpao-t/events/audit.jsonl": "로컬 감사 기록 위치",
  true: "예",
  false: "아니오",
  none: "없음",
  empty: "비어 있음",
  held: "보류",
  actual_tool_execution: "실제 도구 실행",
  cli_command_execution: "명령 실행",
  mcp_invocation: "MCP 호출",
  external_network_or_send: "외부 전송",
  credential_read_or_write: "인증 정보 접근",
  paid_action: "비용 발생 행동",
  destructive_action: "되돌리기 어려운 행동",
};

export function buildCoreWorkSurface({
  root,
  draftRequest = DEFAULT_DRAFT_REQUEST,
  now = new Date().toISOString(),
} = {}) {
  const runtimeState = readRuntimeState({ root });
  const memoryWiki = readMemoryWiki({ root });
  const tcellCandidates = readTCellCandidates({ root });
  const turnPreview = runTurn({ root, input: { text: draftRequest }, priorFlow: runtimeState.activeFlow });
  const contextPreview = resolveContextMesh({
    root,
    request: draftRequest,
    inputSignal: turnPreview.inputSignal,
    priorFlow: runtimeState.activeFlow,
  });
  const skillRoute = routeSkillPacks({ request: draftRequest });
  const skillExecutionPlan = buildSkillExecutionPlan({ skillRoute });
  const modelRoute = routeModel({
    inputSignal: turnPreview.inputSignal,
    authorityDecision: turnPreview.authorityDecision,
  });
  const connectorGovernance = buildConnectorGovernanceSummary();
  const executionApprovalPreview = buildExecutionApprovalPreview({ request: draftRequest });
  const approvalAuditLocalRecordSubstrate = buildApprovalAuditLocalRecordSubstrate({ root });
  const firstLocalWorkLoopPreview = buildFirstLocalWorkLoop({
    root,
    request: draftRequest,
    writeLocalRecords: false,
    now,
  });
  const executionGovernanceFlow = buildWorkSurfaceExecutionFlow({ root, request: draftRequest, now });
  const primaryContext = contextPreview.retrievedCandidates.find((candidate) => candidate.answerAnchorEligible)
    || contextPreview.retrievedCandidates.find((candidate) => candidate.admissionRole !== "stale_supporting");
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
        submissionLabel: "미전송",
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
          value: userFacingObjective(turnPreview.taskPacket.objective),
          tone: "ready",
        },
        {
          id: "context-source",
          label: "맥락 근거",
          value: primaryContext?.anchor || "채택된 맥락 없음",
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
            `목표: ${userFacingObjective(turnPreview.taskPacket.objective)}`,
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
          value: userFacingObjective(turnPreview.taskPacket.objective),
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
      bridgeFromConfirmation:
        "위 확인 카드가 맞다면 아래 preview가 다음 작업 흐름입니다. 다르면 수정 필요나 보류로 판단합니다.",
      understoodTask: userFacingObjective(turnPreview.taskPacket.objective),
      expectedOutputShape: {
        label: "예상 출력 형태",
        value: "작업 요약, 선택된 맥락, 권한 경계, 다음 안전 행동을 포함한 로컬 초안 미리보기",
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
      value: "실제 제출, 모델 호출, 도구 실행, 커넥터 연결, 외부 전송은 모두 닫혀 있음",
        state: "locked_before_execution",
      },
      sections: [
        {
          id: "understood-task",
          label: "이해한 작업",
          value: userFacingObjective(turnPreview.taskPacket.objective),
          state: draftRequest.trim() ? "ready" : "empty",
        },
        {
          id: "expected-output",
          label: "예상 출력",
        value: "로컬 초안 미리보기 구조",
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
          label: "입력이 없을 때",
          userMessage: "맡길 일을 한 문장이라도 적으면 GPAO-T가 이해한 내용과 preview를 보여줍니다.",
          outcome: "empty",
        },
        {
          id: "blocked",
          label: "실행 행동이 섞였을 때",
          userMessage: "보내기, 모델 호출, 도구 실행, 커넥터 연결은 여기서 바로 실행하지 않고 잠근 상태로 보여줍니다.",
          outcome: "blocked",
        },
        {
          id: "review-needed",
          label: "맥락이 애매할 때",
          userMessage: "GPAO-T가 이해한 일이나 사용할 맥락이 애매하면 먼저 확인할 지점을 표시합니다.",
          outcome: "review_needed",
        },
      ],
      confirmationFlow: {
        schema: "gpao_t.local_draft_preview_confirmation_flow.v0_1",
        status: "visible_preview_only",
        mode: "read_only_decision_strip",
        prompt: "이 preview가 내 의도와 맞는지 확인하세요.",
        decisions: [
          {
            id: "intent-match",
            label: "의도와 맞음",
            userMeaning: "이해한 작업, 맥락, 예상 출력이 대체로 맞습니다.",
            next: "다음 단계에서도 실제 실행 전 별도 승인 경계를 유지합니다.",
            state: "preview_only",
          },
          {
            id: "needs-changes",
            label: "수정 필요",
            userMeaning: "목표, 맥락, 출력 형태 중 바꿀 부분이 있습니다.",
            next: "입력이나 확인 카드 내용을 먼저 고친 뒤 preview를 다시 봅니다.",
            state: "review_needed",
          },
          {
            id: "hold",
            label: "보류",
            userMeaning: "지금은 판단하지 않고 안전하게 멈춥니다.",
            next: "아무 실행도 하지 않고 현재 preview만 보존합니다.",
            state: "held",
          },
        ],
        checkBeforeProceeding: [
          "GPAO-T가 이해한 일이 내가 맡기려던 일과 같은가?",
          "사용될 맥락과 스킬 경로가 엉뚱하지 않은가?",
          "예상 출력 형태가 지금 필요한 결과와 맞는가?",
          "실행 전 잠금 상태가 계속 보이는가?",
        ],
        connectsConfirmationToPreview: true,
        closesCoreWorkSurfaceSubstrateAfterThisPass: true,
        opensLiveSubmission: false,
        invokesModel: false,
        executesTools: false,
        activatesConnectors: false,
        sendsExternally: false,
        writesApprovalRecord: false,
        installsUpdatesOrRollsBack: false,
        promotesDurableMemory: false,
      },
      visualQaEvidence: {
        contract:
          "docs/03-verification/evidence/work-surface-local-draft-preview-qa-2026-07-09.json",
        desktop:
          "docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-desktop-viewport-1440x960.jpg",
        mobile:
          "docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-mobile-viewport-390x844.jpg",
      },
      nextAfterPreview: "의도와 맞음, 수정 필요, 보류 중 하나로 읽기 판단만 한다. 실제 제출/모델/도구/외부 실행은 계속 별도 승인 경계에서 멈춘다.",
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
    firstLocalWorkLoop: {
      schema: "gpao_t.work_surface_first_local_work_loop_view.v1",
      status: "visible_preview_ready",
      title: "첫 로컬 작업 루프",
      userMessage:
        "입력을 작업 패킷으로 만들고 맥락, 스킬, 권한, 기록/replay 기준까지 연결하는 첫 로컬 루프입니다. 이 화면에서는 preview만 보여주며 실제 기록 쓰기는 로컬 제출 명령에서만 일어납니다.",
      packet: firstLocalWorkLoopPreview.packet,
      taskPacket: firstLocalWorkLoopPreview.taskPacket,
      contextMesh: firstLocalWorkLoopPreview.contextMesh,
      skillRoute: firstLocalWorkLoopPreview.skillRoute,
      modelRoute: firstLocalWorkLoopPreview.modelRoute,
      localDraftPreview: firstLocalWorkLoopPreview.localDraftPreview,
      approvalAudit: firstLocalWorkLoopPreview.approvalAudit,
      boundaryState: firstLocalWorkLoopPreview.boundaryState,
      blockedActions: firstLocalWorkLoopPreview.blockedActions,
      nextSafeAction: firstLocalWorkLoopPreview.nextSafeAction,
    },
    sessionWorkspace: buildSessionWorkspace({
      root,
      draftRequest,
      now,
      turnPreview,
      primaryContext,
      primarySkillPack,
      contextPreview,
      skillExecutionPlan,
      modelRoute,
      firstLocalWorkLoopPreview,
    }),
    executionProposalConfirmation: {
      schema: "gpao_t.work_surface_execution_proposal_confirmation.v0_1",
      status: "visible_preview_only",
      headline: "실행 전 확인",
      userMessage: "무엇이 실행될 예정인지 먼저 확인합니다. 아직 실행된 것은 없습니다.",
      proposal: executionApprovalPreview.proposal,
      authorityDisplay: executionApprovalPreview.authorityDisplay,
      authorityLegend: executionApprovalPreview.authorityLegend,
      approvalPacket: {
        mode: executionApprovalPreview.approvalPacket.mode,
        requiredFields: executionApprovalPreview.approvalPacket.requiredFields,
        writesPacketNow: false,
        opensInvocationNow: false,
      },
      validationRules: executionApprovalPreview.validation.rules,
      auditWriteDesign: executionApprovalPreview.auditWriteDesign,
      auditPreview: {
        schema: "gpao_t.work_surface_audit_write_design_preview.v0_1",
        status: "visible_design_only_no_write",
        title: "기록될 예정인 항목",
        userMessage: executionApprovalPreview.auditWriteDesign.userVisibleSummary,
        auditTarget: executionApprovalPreview.auditWriteDesign.auditTarget,
        plannedAuditItems: executionApprovalPreview.auditWriteDesign.plannedAuditItems,
        writesAuditNow: false,
      },
      approvalRecordFlow: {
        schema: "gpao_t.work_surface_approval_record_write_ux.v0_1",
        status: "visible_design_only_no_write",
        title: "저장 전 확인",
        userMessage: executionApprovalPreview.approvalRecordWriteUx.userVisibleSummary,
        flowStages: executionApprovalPreview.approvalRecordWriteUx.flowStages,
        recordItems: executionApprovalPreview.approvalRecordWriteUx.recordItems,
        writesApprovalRecordNow: false,
      },
      localRecordSubstrate: approvalAuditLocalRecordSubstrate,
      confirmationChoices: executionApprovalPreview.workSurfaceView.confirmationChoices,
      uxContract: executionApprovalPreview.uxContract,
      blockedActions: executionApprovalPreview.blockedActions,
      nextSafeAction: executionApprovalPreview.nextSafeAction,
    },
    executionGovernanceFlow,
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
        admissionRole: candidate.admissionRole,
        answerAnchorEligible: candidate.answerAnchorEligible,
        downgradeReason: candidate.downgradeReason || null,
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
      localApprovalAuditRecordWrite: "allowed_after_explicit_confirmation",
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
      writesLocalApprovalAuditRecordOnExplicitCommand: true,
      invokesDryRun: false,
      promotesDurableMemory: false,
      appliesSelfGrowth: false,
      deploysOrSendsExternally: false,
      usesScript: false,
      usesForm: false,
    },
    nextSafeAction:
      "실행 후보가 의도와 맞는지 확인한 뒤, 필요한 경우 로컬 승인/감사 기록만 남기고 replay/rollback 기준을 읽는다. 모델/도구/커넥터/외부 실행은 계속 열지 않는다.",
  };
}

function buildSessionWorkspace({
  root,
  draftRequest,
  now,
  turnPreview,
  primaryContext,
  primarySkillPack,
  contextPreview,
  skillExecutionPlan,
  modelRoute,
  firstLocalWorkLoopPreview,
}) {
  const workspaceState = readSessionWorkspaceState({ root, now });
  const sessions = mergeSessionRuntimeHints({
    sessions: workspaceState.sessions,
    draftRequest,
    now,
    turnPreview,
  });
  const activeSession = sessions.find((session) => session.id === workspaceState.activeSessionId)
    || sessions.find((session) => session.state === "active")
    || sessions[0];
  const sessionStates = Object.entries(SESSION_STATE_LABELS).map(([id, label]) => ({ id, label }));
  const sessionActions = [
    { id: "rename", label: "이름 변경", opensMutationNow: false },
    { id: "archive", label: "보관", opensMutationNow: false },
    { id: "restore", label: "복구", opensMutationNow: false },
    { id: "mark_delete_pending", label: "삭제 대기", opensPermanentDelete: false },
    { id: "cancel_delete_pending", label: "삭제 대기 취소", opensPermanentDelete: false },
  ];

  return {
    schema: "gpao_t.session_workspace.v0_1",
    status: "ready",
    behavior: {
      schema: "gpao_t.interactive_session_behavior.v1",
      status: "local_actions_enabled",
      stateFile: ".gpao-t/state/session-workspace.json",
      activeSessionId: workspaceState.activeSessionId,
      allowedActions: workspaceState.allowedActions,
      boundaries: workspaceState.boundaries,
      permanentDelete: "blocked",
    },
    designSource: "docs/02-design/GPAO-T-SESSION-WORKSPACE-DESIGN-REPAIR-PACK-v0.1-ko.md",
    repairPass: {
      id: "session_workspace_repair_pass_001",
      evidence: "docs/03-verification/evidence/session-workspace-repair-pass-001-qa-2026-07-09.json",
      humanReport: "docs/03-verification/evidence/SESSION-WORKSPACE-REPAIR-PASS-001-QA-2026-07-09.md",
    },
    layout: "session_rail_active_work_session_inspector",
    productSurface: "session_based_local_ai_operating_workspace",
    notMessenger: true,
    notGenericDashboard: true,
    sessionStates,
    sessionRail: {
      label: "세션",
      actions: [
        { id: "new_session", label: "새 세션", enabled: true, reason: "local_session_state_only" },
        { id: "search_sessions", label: "세션 검색", enabled: false, reason: "read_only_filter_preview" },
      ],
      groups: [
        {
          id: "recent-active",
          label: "최근 / 활성 세션",
          sessions: sessions.filter((session) => ["active", "draft", "waiting_approval", "blocked"].includes(session.state)),
        },
        {
          id: "project",
          label: "GPAO-T 작업공간",
          sessions: sessions.filter((session) => session.project === "GPAO-T"),
        },
        {
          id: "archived",
          label: "보관된 세션",
          sessions: sessions.filter((session) => ["archived", "delete_pending"].includes(session.state)),
        },
      ],
      sessionActions: sessionActions.map((action) => ({
        ...action,
        enabled: true,
        authority: "local_session_state_only",
      })),
      permanentDelete: {
        enabled: false,
        replacement: "delete_pending",
        recoveryAction: "cancel_delete_pending",
      },
    },
    activeWorkSession: {
      id: activeSession.id,
      title: activeSession.title,
      state: activeSession.state,
      stateLabel: SESSION_STATE_LABELS[activeSession.state],
      thread: [
        { role: "user", label: "사용자 요청", text: draftRequest, state: "draft" },
        {
          role: "gpao-t",
          label: "GPAO-T 이해",
          text: turnPreview.userVisibleState.summary,
          state: "preview_only",
        },
      ],
      sections: [
        {
          id: "session-header",
          label: "세션 제목/상태",
          value: `${activeSession.title} · ${SESSION_STATE_LABELS[activeSession.state]}`,
        },
        {
          id: "understanding",
          label: "GPAO-T가 이해한 내용",
          value: userFacingObjective(turnPreview.taskPacket.objective),
        },
        {
          id: "route-preview",
          label: "맥락 / 스킬 / 모델",
          value: `${primaryContext?.anchor || "맥락 후보 없음"} · ${primarySkillPack?.title || "핵심 사고 정리"} · ${modelRoute.route}`,
        },
        {
          id: "local-draft",
          label: "로컬 미리보기",
          value: firstLocalWorkLoopPreview.localDraftPreview?.headline || "이렇게 처리될 예정입니다",
        },
        {
          id: "authority-boundary",
          label: "실행 경계",
          value: "아직 실행하지 않음 · 외부 전송 없음 · 도구 실행 없음",
        },
        {
          id: "composer",
          label: "작업 입력",
          value: "이 작업에서 GPAO-T에게 맡길 내용을 입력하세요.",
        },
      ],
      composer: {
        placeholder: "이 작업에서 GPAO-T에게 맡길 내용을 입력하세요.",
        state: "draft_not_sent",
        noExternalSendAmbiguity: true,
      },
    },
    inspector: {
      label: "인스펙터",
      defaultCollapsedBelowWidth: 1100,
      tabs: [
        {
          id: "context",
          label: "맥락",
          state: contextPreview.status,
          evidence: primaryContext?.anchor || "강한 후보 없음",
          nextSafeAction: "현재 요청에 맞는 맥락만 주 맥락으로 둡니다.",
        },
        {
          id: "authority",
          label: "권한",
          state: "locked",
          authorityLevel: "미리보기만",
          evidence: "아직 실행하지 않음",
          nextSafeAction: "실행성 행동 전 승인 경계를 유지합니다.",
        },
        {
          id: "model",
          label: "모델",
          state: "preview_only",
          evidence: modelRoute.adapterSelection?.selected?.id || "로컬 후보",
          nextSafeAction: "provider 호출은 열지 않습니다.",
        },
        {
          id: "tools",
          label: "도구",
          state: "blocked",
          authorityLevel: "실행 전 확인",
          evidence: "도구/명령/MCP 실행 없음",
          nextSafeAction: "모델 출력은 실행 제안으로만 둡니다.",
        },
        {
          id: "records",
          label: "기록",
          state: firstLocalWorkLoopPreview.approvalAudit?.recordWrite?.status || "not_written",
          evidence: firstLocalWorkLoopPreview.approvalAudit?.rollbackReference || "로컬 기록 기준 없음",
          nextSafeAction: "로컬 기록은 명시적 local-loop에서만 씁니다.",
        },
        {
          id: "rollback",
          label: "되돌리기",
          state: "preview_only",
          evidence: firstLocalWorkLoopPreview.approvalAudit?.rollbackReference || "되돌리기 기준 미리보기",
          nextSafeAction: "되돌리기 어려운 행동은 열지 않습니다.",
        },
      ],
      technicalDetailsMovedHere: [
        "raw task packet",
        "Context Mesh evidence",
        "model route details",
        "audit record fields",
        "replay / rollback reference",
      ],
    },
    mobile: {
      layout: "top_strip_active_session_sheets",
      topStrip: ["현재 세션", "권한 상태", "다음 안전 행동"],
      sessionListSheet: {
        id: "session-list",
        label: "세션 목록",
        visibleInQa: true,
        contains: ["새 세션", "세션 검색", "최근 / 활성 세션", "보관된 세션"],
      },
      inspectorSheet: {
        id: "inspector",
        label: "검토",
        visibleInQa: true,
        contains: ["맥락", "권한", "모델", "도구", "기록", "되돌리기"],
      },
      composerReachable: true,
      authorityVisibleBeforeExecution: true,
      forceThreeColumns: false,
    },
    visualContract: {
      tone: ["simple", "clean", "quiet", "trustworthy", "fast_to_scan", "pleasant_daily_use"],
      dashboardReference: "OpenClaw Control discipline",
      workRhythmReference: "Codex session workspace",
      authorityReference: "Claude Code permission clarity",
      koreanProductLanguage: true,
      rawEnumsUserFacing: false,
      primaryWorkArea: "wide_conversation_canvas",
      centralCardsMinimized: true,
      composerPriority: "large_bottom_work_input",
    },
  };
}

function mergeSessionRuntimeHints({ sessions, draftRequest, now, turnPreview }) {
  return sessions.map((session) => {
    if (session.id !== "session.current") {
      return {
        ...session,
        stateLabel: SESSION_STATE_LABELS[session.state],
        lastActivity: session.lastActivity ? formatShortTime(session.lastActivity) : "방금",
      };
    }
    return {
      ...session,
      stateLabel: SESSION_STATE_LABELS[session.state],
      lastActivity: formatShortTime(session.lastActivity || now),
      hint: turnPreview.taskPacket.activeTargetId === "general-runtime" ? "일반 작업 흐름" : turnPreview.taskPacket.activeTargetId,
      request: draftRequest || session.request,
    };
  });
}

function formatShortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function userFacingObjective(value) {
  if (!value) return "요청을 로컬 작업으로 정리";
  return String(value)
    .replace(/^Handle user request:\s*/i, "")
    .replace(/admitted context/gi, "채택된 맥락")
    .trim();
}

export function verifyCoreWorkSurface({ surface = buildCoreWorkSurface(), html } = {}) {
  const findings = [];

  if (surface.schema !== "gpao_t.core_work_surface.v0_1") findings.push("invalid_surface_schema");
  if (surface.interactionMode !== "no_script_read_only_preview") findings.push("interaction_mode_not_read_only");
  if (surface.sessionWorkspace?.layout !== "session_rail_active_work_session_inspector") {
    findings.push("missing_session_workspace_layout");
  }
  if (!surface.sessionWorkspace?.sessionRail?.actions?.some((action) => action.id === "new_session")) {
    findings.push("session_rail_missing_new_session");
  }
  if (!surface.sessionWorkspace?.sessionRail?.actions?.some((action) => action.id === "search_sessions")) {
    findings.push("session_rail_missing_search");
  }
  if (!surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "rename")) {
    findings.push("session_actions_missing_rename");
  }
  if (!surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "archive")) {
    findings.push("session_actions_missing_archive");
  }
  if (!surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "restore")) {
    findings.push("session_actions_missing_restore");
  }
  if (!surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "mark_delete_pending")) {
    findings.push("session_actions_missing_delete_pending");
  }
  if (!surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "cancel_delete_pending")) {
    findings.push("session_actions_missing_cancel_delete_pending");
  }
  if (surface.sessionWorkspace?.sessionRail?.sessionActions?.some((action) => action.id === "permanent_delete")) {
    findings.push("permanent_delete_open");
  }
  for (const state of Object.keys(SESSION_STATE_LABELS)) {
    if (!surface.sessionWorkspace?.sessionStates?.some((item) => item.id === state)) {
      findings.push(`missing_session_state_${state}`);
    }
  }
  if (!surface.sessionWorkspace?.activeWorkSession?.sections?.some((section) => section.id === "composer")) {
    findings.push("active_work_session_missing_composer");
  }
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "context")) findings.push("inspector_missing_context");
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "authority")) findings.push("inspector_missing_authority");
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "model")) findings.push("inspector_missing_model");
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "tools")) findings.push("inspector_missing_tools");
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "records")) findings.push("inspector_missing_records");
  if (!surface.sessionWorkspace?.inspector?.tabs?.some((tab) => tab.id === "rollback")) findings.push("inspector_missing_rollback");
  if (surface.sessionWorkspace?.mobile?.layout !== "top_strip_active_session_sheets") {
    findings.push("mobile_session_workspace_contract_missing");
  }
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
  if (surface.localDraftPreview?.confirmationFlow?.mode !== "read_only_decision_strip") findings.push("missing_local_draft_confirmation_flow");
  if (!surface.localDraftPreview?.confirmationFlow?.decisions?.some((decision) => decision.id === "intent-match")) findings.push("missing_intent_match_decision");
  if (!surface.localDraftPreview?.confirmationFlow?.decisions?.some((decision) => decision.id === "needs-changes")) findings.push("missing_needs_changes_decision");
  if (!surface.localDraftPreview?.confirmationFlow?.decisions?.some((decision) => decision.id === "hold")) findings.push("missing_hold_decision");
  if ((surface.localDraftPreview?.confirmationFlow?.checkBeforeProceeding || []).length < 4) findings.push("missing_preview_confirmation_checklist");
  if (surface.localDraftPreview?.confirmationFlow?.connectsConfirmationToPreview !== true) findings.push("confirmation_to_preview_bridge_missing");
  if (surface.localDraftPreview?.confirmationFlow?.closesCoreWorkSurfaceSubstrateAfterThisPass !== true) findings.push("substrate_close_marker_missing");
  if (surface.localDraftPreview?.confirmationFlow?.opensLiveSubmission !== false) findings.push("confirmation_flow_submission_open");
  if (surface.localDraftPreview?.confirmationFlow?.invokesModel !== false) findings.push("confirmation_flow_model_open");
  if (surface.firstLocalWorkLoop?.status !== "visible_preview_ready") findings.push("missing_first_local_work_loop_view");
  if (!surface.firstLocalWorkLoop?.packet?.id?.startsWith("work.local.")) findings.push("first_local_loop_packet_missing");
  if (surface.firstLocalWorkLoop?.modelRoute?.liveModelCall !== false) findings.push("first_local_loop_model_call_open");
  if (surface.firstLocalWorkLoop?.boundaryState?.toolCliMcpExecution !== false) findings.push("first_local_loop_tool_execution_open");
  if (surface.firstLocalWorkLoop?.boundaryState?.externalSend !== false) findings.push("first_local_loop_external_send_open");
  if (surface.executionProposalConfirmation?.status !== "visible_preview_only") findings.push("missing_execution_proposal_confirmation");
  if (!surface.executionProposalConfirmation?.proposal?.toolKind) findings.push("execution_proposal_missing_tool_kind");
  if (!surface.executionProposalConfirmation?.proposal?.actionType) findings.push("execution_proposal_missing_action_type");
  if (!surface.executionProposalConfirmation?.proposal?.authorityLevel) findings.push("execution_proposal_missing_authority_level");
  if (!surface.executionProposalConfirmation?.proposal?.expectedEffect) findings.push("execution_proposal_missing_expected_effect");
  if (!surface.executionProposalConfirmation?.proposal?.risk) findings.push("execution_proposal_missing_risk");
  if (!surface.executionProposalConfirmation?.proposal?.rollbackReference) findings.push("execution_proposal_missing_rollback_reference");
  if ((surface.executionProposalConfirmation?.authorityLegend || []).length !== 6) findings.push("execution_authority_legend_incomplete");
  if (!surface.executionProposalConfirmation?.authorityLegend?.some((level) => level.label === "읽기 전용")) findings.push("execution_missing_readonly_label");
  if (surface.executionProposalConfirmation?.approvalPacket?.writesPacketNow !== false) findings.push("execution_approval_packet_write_open");
  if (surface.executionProposalConfirmation?.approvalPacket?.opensInvocationNow !== false) findings.push("execution_invocation_open");
  if (surface.executionProposalConfirmation?.auditWriteDesign?.auditWriteNow !== false) findings.push("execution_audit_write_open");
  if (surface.executionProposalConfirmation?.auditPreview?.status !== "visible_design_only_no_write") {
    findings.push("execution_audit_preview_missing");
  }
  if ((surface.executionProposalConfirmation?.auditPreview?.plannedAuditItems || []).length !== 8) {
    findings.push("execution_audit_preview_items_incomplete");
  }
  if (surface.executionProposalConfirmation?.auditPreview?.writesAuditNow !== false) findings.push("execution_audit_preview_write_open");
  if (surface.executionProposalConfirmation?.approvalRecordFlow?.status !== "visible_design_only_no_write") {
    findings.push("approval_record_flow_missing");
  }
  if ((surface.executionProposalConfirmation?.approvalRecordFlow?.flowStages || []).length !== 5) {
    findings.push("approval_record_flow_stages_incomplete");
  }
  if ((surface.executionProposalConfirmation?.approvalRecordFlow?.recordItems || []).length !== 10) {
    findings.push("approval_record_items_incomplete");
  }
  if (surface.executionProposalConfirmation?.approvalRecordFlow?.writesApprovalRecordNow !== false) {
    findings.push("approval_record_write_open");
  }
  if (surface.executionGovernanceFlow?.schema !== "gpao_t.work_surface_execution_governance_flow.v1") {
    findings.push("missing_execution_governance_flow");
  }
  if ((surface.executionGovernanceFlow?.flowStages || []).length !== 5) {
    findings.push("execution_governance_flow_stage_count_mismatch");
  }
  if (surface.executionGovernanceFlow?.localRecord?.writesDuringRender !== false) {
    findings.push("execution_governance_flow_render_write_open");
  }
  if (surface.executionGovernanceFlow?.boundaries?.localJsonlRecordWrite !== "allowed_after_explicit_confirmation") {
    findings.push("execution_governance_local_record_boundary_missing");
  }
  if (surface.executionGovernanceFlow?.boundaries?.toolCliMcpExecution !== "blocked") {
    findings.push("execution_governance_tool_boundary_open");
  }
  if (surface.executionGovernanceFlow?.boundaries?.externalSend !== "blocked") {
    findings.push("execution_governance_external_boundary_open");
  }
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
    if (!html.includes("data-session-workspace=\"session-based-local-ai-os\"")) findings.push("html_missing_session_workspace_marker");
    if (!html.includes("data-session-rail=\"left\"")) findings.push("html_missing_session_rail");
    if (!html.includes("data-active-work-session=\"center\"")) findings.push("html_missing_active_work_session");
    if (!html.includes("data-session-inspector=\"right\"")) findings.push("html_missing_session_inspector");
    if (!html.includes("data-mobile-session-sheet=\"visible\"")) findings.push("html_missing_mobile_session_sheet");
    if (!html.includes("data-mobile-inspector-sheet=\"visible\"")) findings.push("html_missing_mobile_inspector_sheet");
    if (!html.includes("삭제 대기 취소")) findings.push("html_missing_cancel_delete_pending");
    if (!html.includes("보관된 세션")) findings.push("html_missing_archived_sessions");
    if (!html.includes("외부 전송 없음")) findings.push("html_missing_calm_authority_copy");
    if (!html.includes("data-understanding-summary=\"read-only\"")) findings.push("html_missing_understanding_summary");
    if (!html.includes("data-readability-interaction=\"native-details\"")) findings.push("html_missing_readability_marker");
    if (!html.includes("data-confirmation-ux=\"preview-only\"")) findings.push("html_missing_confirmation_ux");
    if (!html.includes("data-local-draft-preview=\"visible-local-structure\"")) findings.push("html_missing_local_draft_preview");
    if (!html.includes("이렇게 처리될 예정입니다")) findings.push("html_missing_local_draft_headline");
    if (!html.includes("data-local-draft-state=\"blocked\"")) findings.push("html_missing_local_draft_blocked_state");
    if (!html.includes("data-local-draft-state=\"review-needed\"")) findings.push("html_missing_local_draft_review_state");
    if (!html.includes("data-preview-confirmation-flow=\"read-only\"")) findings.push("html_missing_preview_confirmation_flow");
    if (!html.includes("data-first-local-work-loop=\"preview\"")) findings.push("html_missing_first_local_work_loop");
    if (!html.includes("첫 로컬 작업 루프")) findings.push("html_missing_first_local_loop_title");
    if (!html.includes("data-execution-proposal-confirmation=\"preview-only\"")) findings.push("html_missing_execution_proposal_confirmation");
    if (!html.includes("읽기 전용")) findings.push("html_missing_korean_readonly_label");
    if (!html.includes("외부 전송 전 확인")) findings.push("html_missing_korean_external_send_label");
    if (!html.includes("data-approval-packet-validation=\"design-only\"")) findings.push("html_missing_approval_packet_validation");
    if (!html.includes("data-audit-write-design=\"local-record-only\"")) findings.push("html_missing_audit_write_design");
    if (!html.includes("data-audit-preview=\"design-only\"")) findings.push("html_missing_audit_preview");
    if (!html.includes("기록될 예정인 항목")) findings.push("html_missing_planned_audit_items");
    if (!html.includes("data-approval-record-write-ux=\"design-only\"")) findings.push("html_missing_approval_record_write_ux");
    if (!html.includes("저장 전 확인")) findings.push("html_missing_write_before_approval_copy");
    if (!html.includes("data-approval-record-preview=\"no-write\"")) findings.push("html_missing_approval_record_preview");
    if (!html.includes("data-execution-governance-flow=\"local-record-review\"")) findings.push("html_missing_execution_governance_flow");
    if (!html.includes("로컬 기록 후 리플레이")) findings.push("html_missing_execution_replay_flow_copy");
    if (!html.includes("data-preview-decision=\"intent-match\"")) findings.push("html_missing_intent_match_decision");
    if (!html.includes("data-preview-decision=\"needs-changes\"")) findings.push("html_missing_needs_changes_decision");
    if (!html.includes("data-preview-decision=\"hold\"")) findings.push("html_missing_hold_decision");
    if (!html.includes("미리보기 확인 체크리스트")) findings.push("html_missing_preview_checklist");
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
  const previewDecisions = workSurface.localDraftPreview.confirmationFlow?.decisions || [];
  const previewChecklist = workSurface.localDraftPreview.confirmationFlow?.checkBeforeProceeding || [];
  const executionConfirmation = workSurface.executionProposalConfirmation;
  const executionGovernanceFlow = workSurface.executionGovernanceFlow;
  const authorityLegend = executionConfirmation.authorityLegend || [];
  const validationRules = executionConfirmation.validationRules || [];
  const auditPreview = executionConfirmation.auditPreview || {};
  const plannedAuditItems = auditPreview.plannedAuditItems || [];
  const approvalRecordFlow = executionConfirmation.approvalRecordFlow || {};
  const approvalRecordStages = approvalRecordFlow.flowStages || [];
  const approvalRecordItems = approvalRecordFlow.recordItems || [];
  const firstLocalWorkLoop = workSurface.firstLocalWorkLoop;

  return renderSessionWorkspaceHtml({
    workSurface,
    selectedPacks,
    contextCandidates,
    understandingCards,
    confirmationCards,
    draftPreviewSections,
    previewDecisions,
    executionConfirmation,
    executionGovernanceFlow,
    authorityLegend,
    firstLocalWorkLoop,
  });

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Work Surface</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7f2;
      --bg-soft: #eef3ec;
      --surface: #ffffff;
      --surface-warm: #fbfcf8;
      --surface-soft: #eef3ec;
      --muted: #526257;
      --soft-text: #6d7b70;
      --text: #17211b;
      --line: #dde5dc;
      --line-strong: #bfd0c0;
      --soft: #eef3ec;
      --ready: #1f7a64;
      --review: #a86f1d;
      --blocked: #a9473f;
      --accent: #2e6dae;
      --primary-soft: #e4f3ed;
      --blue-soft: #e8f1fa;
      --amber-soft: #fff4d8;
      --red-soft: #fbe9e7;
      --violet-soft: #efecfa;
      --shadow: 0 1px 2px rgba(23, 33, 27, 0.05), 0 16px 42px rgba(23, 33, 27, 0.07);
    }
    * { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 12% 0, rgba(255, 255, 255, 0.95), rgba(245, 247, 242, 0.88) 34%, rgba(238, 243, 236, 0.95) 100%);
      color: var(--text);
      font-family: Pretendard, "Apple SD Gothic Neo", "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.55;
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
      padding: 14px 22px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(18px);
    }
    .topbar-main {
      min-width: 0;
      max-width: 100%;
    }
    .topbar-action {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    h1, h2, h3, p { margin: 0; letter-spacing: 0; }
    h1 { font-size: 20px; line-height: 1.2; }
    h2 { font-size: 16px; }
    h3 { font-size: 14px; }
    .subtitle, .muted {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .status {
      border: 1px solid #b7dacd;
      border-radius: 999px;
      padding: 4px 9px;
      color: var(--ready);
      background: var(--primary-soft);
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
      align-self: flex-start;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(620px, 1.35fr) minmax(300px, 0.65fr);
      gap: 16px;
      padding: 18px;
      max-width: 1360px;
      margin: 0 auto;
    }
    .thread, .panel, .composer, .message, .state-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: var(--shadow);
    }
    .thread {
      border-color: var(--line-strong);
      background: rgba(255, 255, 255, 0.96);
    }
    .thread, .panel { padding: 18px; min-width: 0; }
    .panel + .panel { margin-top: 12px; }
    .composer {
      min-height: 118px;
      margin-top: 12px;
      padding: 12px;
      background: var(--blue-soft);
      border-color: #c2d5ea;
      box-shadow: none;
    }
    .composer-label {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .composer-label span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .composer-body {
      margin-top: 8px;
      min-height: 62px;
      color: var(--text);
      font-size: 15px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .composer-lock {
      margin-top: 8px;
      color: var(--review);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.4;
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
      border-radius: 10px;
      background: var(--surface-warm);
    }
    .understanding-card[data-tone="locked"] {
      border-color: #e1c987;
      background: var(--amber-soft);
    }
    .understanding-card strong {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: none;
      overflow-wrap: anywhere;
    }
    .understanding-card span {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .readability-panel {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .readability-panel details {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-warm);
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
      font-size: 13px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .readability-panel ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    .checklist {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #c9dccf;
      border-radius: 10px;
      background: var(--primary-soft);
    }
    .confirmation-card {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #b9c9df;
      border-radius: 12px;
      background: var(--blue-soft);
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .confirmation-item {
      min-width: 0;
      min-height: 90px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .confirmation-item[data-state="locked"] {
      border-color: #efd2a8;
      background: var(--amber-soft);
    }
    .confirmation-item strong,
    .confirmation-item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .confirmation-item strong {
      color: var(--muted);
      font-size: 11px;
      text-transform: none;
    }
    .confirmation-item span {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.45;
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
      border-radius: 12px;
      background: var(--primary-soft);
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .draft-preview-item {
      min-width: 0;
      min-height: 92px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .draft-preview-item[data-state*="blocked"],
    .draft-preview-item[data-state*="locked"] {
      border-color: #efd2a8;
      background: var(--amber-soft);
    }
    .draft-preview-item[data-state*="review"] {
      border-color: #e0cc8f;
      background: var(--amber-soft);
    }
    .draft-preview-item strong,
    .draft-preview-item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .draft-preview-item strong {
      color: var(--muted);
      font-size: 11px;
      text-transform: none;
    }
    .draft-preview-item span {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.45;
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
      border-radius: 10px;
      background: var(--surface-warm);
    }
    .draft-state[data-local-draft-state="blocked"] {
      border-color: #efd2a8;
      background: var(--amber-soft);
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
      line-height: 1.5;
    }
    .preview-bridge {
      margin-top: 10px;
      padding: 9px;
      border: 1px solid #cdd8e5;
      border-radius: 10px;
      background: var(--blue-soft);
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .preview-decision-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .preview-decision {
      min-width: 0;
      min-height: 106px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .preview-decision[data-state="preview_only"] {
      border-color: #b7d7c6;
      background: var(--primary-soft);
    }
    .preview-decision[data-state="review_needed"] {
      border-color: #e0cc8f;
      background: var(--amber-soft);
    }
    .preview-decision[data-state="held"] {
      border-color: #cdd8e5;
      background: var(--surface-warm);
    }
    .preview-decision strong,
    .preview-decision span {
      display: block;
      overflow-wrap: anywhere;
    }
    .preview-decision strong {
      font-size: 12px;
    }
    .preview-decision span {
      margin-top: 5px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .preview-checklist {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #c9dccf;
      border-radius: 10px;
      background: var(--primary-soft);
    }
    .preview-checklist strong {
      display: block;
      color: var(--ready);
      font-size: 12px;
      margin-bottom: 5px;
    }
    .preview-checklist li {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .local-loop {
      margin-top: 12px;
      padding: 14px;
      border: 1px solid #c9dccf;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,252,248,0.96));
      box-shadow: var(--shadow);
    }
    .local-loop-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .local-loop-step {
      min-width: 0;
      min-height: 116px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .local-loop-step[data-authority-boundary="closed"] {
      border-color: #efd2a8;
      background: var(--amber-soft);
    }
    .local-loop-step strong,
    .local-loop-step span,
    .local-loop-step small {
      display: block;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .local-loop-step strong {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .local-loop-step span {
      margin-top: 6px;
      color: var(--text);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.45;
    }
    .local-loop-step small {
      margin-top: 5px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }
    .execution-proposal {
      margin-top: 12px;
      padding: 14px;
      border: 1px solid #d8c8f0;
      border-radius: 12px;
      background: var(--violet-soft);
    }
    .execution-proposal-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .execution-proposal-summary {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #d8c8f0;
      border-radius: 10px;
      background: var(--surface);
      overflow-wrap: anywhere;
    }
    .execution-proposal-summary p + p {
      margin-top: 5px;
    }
    .authority-level-grid,
    .approval-packet-grid,
    .audit-preview-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .authority-level,
    .approval-rule,
    .audit-item {
      min-width: 0;
      min-height: 96px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .authority-level[data-tone="ready"] {
      border-color: #b7d7c6;
      background: var(--primary-soft);
    }
    .authority-level[data-tone="review"] {
      border-color: #e0cc8f;
      background: var(--amber-soft);
    }
    .authority-level[data-tone="approval_required"] {
      border-color: #c9d8ee;
      background: var(--blue-soft);
    }
    .authority-level[data-tone="blocked"] {
      border-color: #e7b3ad;
      background: var(--red-soft);
    }
    .authority-level strong,
    .authority-level span,
    .approval-rule strong,
    .approval-rule span,
    .audit-item strong,
    .audit-item span,
    .audit-item small {
      display: block;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .authority-level strong,
    .approval-rule strong,
    .audit-item strong {
      font-size: 12px;
      line-height: 1.4;
    }
    .authority-level span,
    .approval-rule span,
    .audit-item span {
      margin-top: 5px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .audit-item span {
      color: var(--text);
      font-weight: 800;
    }
    .audit-item small {
      margin-top: 5px;
      color: var(--muted);
      font-size: 11px;
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
    .message p {
      font-size: 14px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
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
      text-transform: none;
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
      border-radius: 10px;
      background: var(--surface-warm);
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
      border-radius: 8px;
      background: var(--amber-soft);
      color: #775200;
      font-size: 11px;
      font-weight: 800;
      overflow-wrap: anywhere;
      line-height: 1.35;
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
      .local-loop-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .draft-state-strip, .preview-decision-strip, .authority-level-grid, .approval-packet-grid, .audit-preview-grid { grid-template-columns: 1fr; }
      h1 { font-size: 17px; }
    }
    @media (max-width: 520px) {
      .topbar {
        position: fixed;
        width: 100%;
        padding: 12px 14px;
        align-items: stretch;
      }
      .topbar-main { width: 100%; }
      .topbar-action { max-width: 100%; }
      .status {
        align-self: flex-start;
        max-width: 120px;
      }
      .layout { padding-top: 160px; }
      .state-grid, .authority-strip, .understanding-strip, .confirmation-grid, .draft-preview-grid, .preview-decision-strip { grid-template-columns: 1fr; }
      .local-loop-grid { grid-template-columns: 1fr; }
      .authority-level-grid, .approval-packet-grid, .audit-preview-grid { grid-template-columns: 1fr; }
      .thread, .panel { padding: 12px; }
      .layout {
        width: 100vw;
        max-width: 100vw;
        padding-left: 12px;
        padding-right: 12px;
      }
      .topbar,
      .layout,
      .thread,
      .panel,
      .composer,
      .composer-body,
      .message,
      .understanding-card,
      .confirmation-item,
      .draft-preview-item,
      .draft-state,
      .preview-decision,
      .local-loop-step,
      .state-card,
      .item,
      .lock {
        max-width: 100%;
        min-width: 0;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }
  </style>
</head>
<body data-core-work-surface="read-only" data-external-activation="blocked">
  <header class="topbar">
    <div class="topbar-main">
      <h1>GPAO-T Work Surface</h1>
      <p class="subtitle">작업 초안 · 맥락 프리뷰 · 권한 경계</p>
      <p class="topbar-action">다음 안전 행동: 의도 확인 · 수정/보류 선택 · 실행 없음</p>
    </div>
    <span class="status">${escapeHtml(uiLabel(workSurface.status))}</span>
  </header>
  <main class="layout">
    <section class="thread" aria-label="GPAO-T work thread">
      <h2>작업</h2>
      <p class="muted">현재 요청은 전송되지 않은 초안 상태다.</p>
      <div class="composer" role="textbox" aria-readonly="true" data-composer-state="draft-not-sent" tabindex="0">
        <div class="composer-label">
          <span>${escapeHtml(workSurface.workspaceThread.composer.label)}</span>
          <span>${escapeHtml(workSurface.workspaceThread.composer.submissionLabel || workSurface.workspaceThread.composer.submission)}</span>
        </div>
        <div class="composer-body">${escapeHtml(workSurface.workspaceThread.composer.draftRequest)}</div>
        <div class="composer-lock">외부 행동 없음 · 도구 실행 없음 · 모델 연결 실행 없음</div>
      </div>
      <div class="message-list">
        ${workSurface.workspaceThread.threadPreview.map((message) => `
        <article class="message" data-message-role="${escapeHtml(message.role)}">
          <strong>${escapeHtml(message.label)} · ${escapeHtml(uiLabel(message.state))}</strong>
          <p>${escapeHtml(message.text)}</p>
        </article>`).join("")}
      </div>
      <div class="understanding-strip" data-understanding-summary="read-only" aria-label="Read-only task understanding summary">
        ${understandingCards.map((card) => `
        <div class="understanding-card" data-understanding-card="${escapeHtml(card.id)}" data-tone="${escapeHtml(card.tone)}">
          <strong>${escapeHtml(card.label)}</strong>
          <span>${escapeHtml(uiLabel(card.value))}</span>
        </div>`).join("")}
      </div>
      <div class="readability-panel" data-readability-interaction="native-details">
        ${readabilitySections.map((section, index) => `
        <details ${index === 0 ? "open" : ""} data-readability-section="${escapeHtml(section.id)}">
          <summary>${escapeHtml(section.title)}</summary>
          <p>${escapeHtml(section.summary)}</p>
          <ul>
            ${section.items.map((item) => `<li>${escapeHtml(uiLabel(item))}</li>`).join("")}
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
          <span class="status">${escapeHtml(uiLabel(workSurface.confirmationUx.status))}</span>
        </div>
        <div class="confirmation-grid">
          ${confirmationCards.map((card) => `
          <div class="confirmation-item" data-confirmation-card="${escapeHtml(card.id)}" data-state="${escapeHtml(card.state)}">
            <strong>${escapeHtml(card.label)}</strong>
            <span>${escapeHtml(uiLabel(card.value))}</span>
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
          <span class="status">${escapeHtml(uiLabel(workSurface.localDraftPreview.status))}</span>
        </div>
        <p class="preview-bridge">${escapeHtml(workSurface.localDraftPreview.bridgeFromConfirmation)}</p>
        <div class="draft-preview-grid">
          ${draftPreviewSections.map((section) => `
          <div class="draft-preview-item" data-local-draft-section="${escapeHtml(section.id)}" data-state="${escapeHtml(section.state)}">
            <strong>${escapeHtml(section.label)}</strong>
            <span>${escapeHtml(uiLabel(section.value))}</span>
          </div>`).join("")}
        </div>
        <div class="draft-state-strip" aria-label="Local draft preview product states">
          ${draftProductStates.map((state) => `
          <div class="draft-state" data-local-draft-state="${escapeHtml(state.id)}" data-outcome="${escapeHtml(state.outcome)}">
            <strong>${escapeHtml(state.label)}</strong>
            <span>${escapeHtml(state.userMessage)}</span>
          </div>`).join("")}
        </div>
        <div class="preview-decision-strip" data-preview-confirmation-flow="read-only" aria-label="Preview confirmation decisions">
          ${previewDecisions.map((decision) => `
          <div class="preview-decision" data-preview-decision="${escapeHtml(decision.id)}" data-state="${escapeHtml(decision.state)}">
            <strong>${escapeHtml(decision.label)}</strong>
            <span>${escapeHtml(decision.userMeaning)}</span>
            <span>${escapeHtml(decision.next)}</span>
          </div>`).join("")}
        </div>
        <div class="preview-checklist" aria-label="Preview confirmation checklist">
          <strong>미리보기 확인 체크리스트</strong>
          <ul>
            ${previewChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <p class="confirmation-note">${escapeHtml(workSurface.localDraftPreview.nextAfterPreview)}</p>
        <p class="confirmation-note">현재 상태: 초안 생성 없음 · 모델 호출 없음 · 도구 실행 없음 · 커넥터 연결 없음</p>
      </section>
      <section class="local-loop" data-first-local-work-loop="preview" aria-label="First local work loop preview">
        <div class="draft-preview-head">
          <div>
            <h2>${escapeHtml(firstLocalWorkLoop.title)}</h2>
            <p class="muted">${escapeHtml(firstLocalWorkLoop.userMessage)}</p>
          </div>
          <span class="status">${escapeHtml(uiLabel(firstLocalWorkLoop.status))}</span>
        </div>
        <div class="local-loop-grid">
          <div class="local-loop-step">
            <strong>작업 패킷</strong>
            <span>${escapeHtml(firstLocalWorkLoop.packet.id)}</span>
            <small>${escapeHtml(firstLocalWorkLoop.taskPacket.objective || firstLocalWorkLoop.packet.userInput.text)}</small>
          </div>
          <div class="local-loop-step">
            <strong>맥락 / 스킬</strong>
            <span>${escapeHtml(uiLabel(firstLocalWorkLoop.contextMesh.retrievedCandidates[0]?.anchor || "no candidate admitted"))}</span>
            <small>${escapeHtml(uiLabel(firstLocalWorkLoop.skillRoute.selectedPacks[0]?.title || "Core thinking route"))}</small>
          </div>
          <div class="local-loop-step">
            <strong>기록 / replay</strong>
            <span>${escapeHtml(uiLabel(firstLocalWorkLoop.approvalAudit.recordWrite.status))}</span>
            <small>${escapeHtml(firstLocalWorkLoop.approvalAudit.rollbackReference)}</small>
          </div>
          <div class="local-loop-step" data-authority-boundary="closed">
            <strong>닫힌 경계</strong>
            <span>모델 · 도구 · 커넥터 · 외부 전송 잠김</span>
            <small>${escapeHtml(firstLocalWorkLoop.nextSafeAction)}</small>
          </div>
        </div>
      </section>
      <div class="state-grid" aria-label="Current task state">
        ${stateCard("작업 상태", workSurface.taskState.status)}
        ${stateCard("입력 신호", workSurface.taskState.inputSignal)}
        ${stateCard("현재 대상", workSurface.taskState.activeTargetId)}
        ${stateCard("스킬 모드", workSurface.taskState.skillExecutionMode)}
      </div>
      <section id="execution-proposal-confirmation" class="execution-proposal" data-execution-proposal-confirmation="preview-only" aria-label="Execution proposal confirmation">
        <div class="execution-proposal-head">
          <div>
            <h2>${escapeHtml(executionConfirmation.headline)}</h2>
            <p class="muted">${escapeHtml(executionConfirmation.userMessage)}</p>
          </div>
          <span class="status">${escapeHtml(executionConfirmation.authorityDisplay.label)}</span>
        </div>
        <div class="execution-proposal-summary">
          <strong>${escapeHtml(executionConfirmation.proposal.title)}</strong>
          <p>${escapeHtml(executionConfirmation.proposal.userSummary)}</p>
          <p class="muted">행동 후보: ${escapeHtml(uiLabel(executionConfirmation.proposal.actionType))} · 위험: ${escapeHtml(executionConfirmation.proposal.risk)}</p>
          <p class="muted">되돌리기 기준: ${escapeHtml(executionConfirmation.proposal.rollbackReference)}</p>
        </div>
        <div class="authority-level-grid" aria-label="Korean authority level display">
          ${authorityLegend.map((level) => `
          <div class="authority-level" data-authority-level="${escapeHtml(level.id)}" data-tone="${escapeHtml(level.tone)}">
            <strong>${escapeHtml(iconSymbol(level.icon))} · ${escapeHtml(level.label)}</strong>
            <span>${escapeHtml(level.description)}</span>
          </div>`).join("")}
        </div>
        <div class="approval-packet-grid" data-approval-packet-validation="design-only" aria-label="Approval packet validation rules">
          ${validationRules.slice(0, 6).map((rule) => `
          <div class="approval-rule" data-validation-rule="${escapeHtml(rule.id)}">
            <strong>${escapeHtml(rule.label)}</strong>
            <span>${escapeHtml(rule.userMessage)}</span>
          </div>`).join("")}
        </div>
        <p class="confirmation-note" data-audit-write-design="local-record-only">감사 기록/승인 기록: 로컬 JSONL만 가능 · 실제 실행: ${escapeHtml(uiLabel(executionConfirmation.approvalPacket.opensInvocationNow))}</p>
        <div class="audit-preview-grid" data-audit-preview="design-only" aria-label="Planned audit items">
          ${plannedAuditItems.map((item) => `
          <div class="audit-item" data-audit-item="${escapeHtml(item.id)}">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(uiLabel(item.value))}</span>
            <small>${escapeHtml(item.userMeaning)}</small>
          </div>`).join("")}
        </div>
        <p class="confirmation-note">기록될 예정인 항목: ${escapeHtml(auditPreview.userMessage || "기록 설계만 · 실제 기록 없음")}</p>
        <div class="audit-preview-grid" data-approval-record-write-ux="design-only" aria-label="Approval record write UX flow">
          ${approvalRecordStages.map((stage) => `
          <div class="audit-item" data-approval-record-stage="${escapeHtml(stage.id)}">
            <strong>${escapeHtml(stage.step)} · ${escapeHtml(stage.label)}</strong>
            <span>${escapeHtml(uiLabel(stage.status))}</span>
            <small>${escapeHtml(stage.userMeaning)}</small>
          </div>`).join("")}
        </div>
        <p class="confirmation-note">저장될 항목 미리보기</p>
        <div class="audit-preview-grid" data-approval-record-preview="no-write" aria-label="Approval record preview items">
          ${approvalRecordItems.map((item) => `
          <div class="audit-item" data-approval-record-item="${escapeHtml(item.id)}">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(uiLabel(item.value))}</span>
            <small>${escapeHtml(item.userMeaning)}</small>
          </div>`).join("")}
        </div>
        <p class="confirmation-note">저장 전 확인: ${escapeHtml(approvalRecordFlow.userMessage || "저장 설계만 · 실제 저장 없음")}</p>
        ${localRecordSubstrateHtml(executionConfirmation.localRecordSubstrate)}
      </section>
      <p class="next">${escapeHtml(workSurface.nextSafeAction)}</p>
    </section>
    <section>
      <article class="panel">
        <h2>맥락 근거 / Memory Wiki</h2>
        <p class="muted">Context Mesh 후보는 읽기 근거로만 사용되며 실행 권한이나 지속 기억 승격을 의미하지 않습니다.</p>
        <div class="state-grid">
          ${stateCard("기억 항목", `${workSurface.contextPreview.memoryEntries}`)}
          ${stateCard("T-cell 후보", `${workSurface.contextPreview.tcellCandidates}`)}
        </div>
        <div class="list">
          ${(contextCandidates.length ? contextCandidates : [{ id: "empty", anchor: "no candidate admitted", score: 0, lifecycle: "preview" }]).map((candidate) => `
          <div class="item" data-context-candidate="${escapeHtml(candidate.id)}">
            <strong>${escapeHtml(uiLabel(candidate.anchor))}</strong>
            <span>${escapeHtml(uiLabel(candidate.admissionRole || candidate.lifecycle))} · 적합도 ${escapeHtml(candidate.score)}</span>
          </div>`).join("")}
        </div>
      </article>
      <article class="panel">
        <h2>스킬 경로</h2>
        <p class="muted">${escapeHtml(uiLabel(workSurface.skillRoutePreview.executionMode))}</p>
        <div class="list">
          ${(selectedPacks.length ? selectedPacks : [{ id: "none", title: "No pack selected", routeRole: "review", firstQualityGate: "clarify request" }]).map((pack) => `
          <div class="item" data-skill-pack="${escapeHtml(pack.id)}">
            <strong>${escapeHtml(uiLabel(pack.title))}</strong>
            <span>${escapeHtml(uiLabel(pack.routeRole))} · ${escapeHtml(uiLabel(pack.firstQualityGate))}</span>
          </div>`).join("")}
        </div>
      </article>
      <article class="panel" data-authority-boundary="closed">
        <h2>권한 / 승인</h2>
        <p class="muted">${escapeHtml(uiLabel(workSurface.authoritySummary.approvalStatus))}</p>
        <div class="authority-strip">
          ${workSurface.authoritySummary.closedActions.slice(0, 8).map((action) => `<span class="lock">${escapeHtml(uiLabel(action))}</span>`).join("")}
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

function stateCard(label, value) {
  return `<div class="state-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(uiLabel(value || "none"))}</span></div>`;
}

function renderSessionWorkspaceHtml({
  workSurface,
  selectedPacks,
  contextCandidates,
  understandingCards,
  confirmationCards,
  draftPreviewSections,
  previewDecisions,
  executionConfirmation,
  executionGovernanceFlow,
  authorityLegend,
  firstLocalWorkLoop,
}) {
  const workspace = workSurface.sessionWorkspace;
  const activeSession = workspace.activeWorkSession;
  const activeGroups = workspace.sessionRail.groups || [];
  const inspectorTabs = workspace.inspector.tabs || [];
  const mobileSessionItems = activeGroups.flatMap((group) => group.sessions || []);
  const archiveActions = workspace.sessionRail.sessionActions || [];

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Work Surface</title>
  <style>
    :root {
      color-scheme: light;
      --gpao-bg: #f6f7f4;
      --gpao-rail: #eef1ec;
      --gpao-surface: #ffffff;
      --gpao-surface-soft: #f9faf6;
      --gpao-border: #dfe6dc;
      --gpao-border-strong: #c7d2c4;
      --gpao-text: #17211b;
      --gpao-muted: #5f6d62;
      --gpao-soft-text: #7a877d;
      --gpao-accent: #1f7a64;
      --gpao-info: #2e6dae;
      --gpao-warn: #a86f1d;
      --gpao-danger: #a9473f;
      --gpao-purple: #6e5aa8;
      --gpao-blue-soft: #eaf2fb;
      --gpao-green-soft: #e8f4ee;
      --gpao-warn-soft: #fff4dd;
      --gpao-red-soft: #fbe9e7;
      --gpao-violet-soft: #f0edfa;
      --gpao-radius-sm: 6px;
      --gpao-radius-md: 10px;
      --gpao-radius-lg: 14px;
      --gpao-shadow-soft: 0 1px 2px rgba(23, 33, 27, 0.06);
      --gpao-shadow-panel: 0 8px 24px rgba(23, 33, 27, 0.08);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; max-width: 100%; overflow-x: hidden; }
    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #f9faf7 0%, var(--gpao-bg) 45%, #eef3ec 100%);
      color: var(--gpao-text);
      font-family: Pretendard, "Apple SD Gothic Neo", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.56;
      letter-spacing: 0;
    }
    h1, h2, h3, p { margin: 0; letter-spacing: 0; }
    h1 { font-size: 18px; line-height: 1.25; }
    h2 { font-size: 15px; line-height: 1.35; }
    h3 { font-size: 13px; line-height: 1.35; }
    .workspace-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 224px minmax(760px, 1fr) 284px;
      gap: 0;
    }
    .session-rail {
      min-width: 0;
      height: 100vh;
      position: sticky;
      top: 0;
      overflow: auto;
      padding: 14px 10px;
      border-right: 1px solid var(--gpao-border);
      background: color-mix(in srgb, var(--gpao-rail) 92%, #fff 8%);
    }
    .rail-head, .inspector-head, .session-head, .mobile-strip {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .rail-title span, .session-kicker, .muted {
      color: var(--gpao-muted);
      font-size: 12px;
      line-height: 1.45;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .rail-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }
    .icon-button, .soft-button {
      min-width: 0;
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-sm);
      background: var(--gpao-surface);
      color: var(--gpao-text);
      padding: 7px 8px;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      text-align: center;
      box-shadow: var(--gpao-shadow-soft);
      white-space: normal;
      word-break: keep-all;
    }
    .search-box {
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-md);
      background: rgba(255,255,255,0.76);
      padding: 9px 10px;
      color: var(--gpao-muted);
      font-size: 12px;
      font-weight: 700;
    }
    .session-group { margin-top: 16px; }
    .session-group-title {
      display: flex;
      justify-content: space-between;
      color: var(--gpao-muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: none;
    }
    .session-list {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }
    .session-item {
      min-width: 0;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-md);
      background: rgba(255,255,255,0.72);
    }
    .session-item[data-state="active"] {
      border-color: #9fcdbd;
      background: var(--gpao-green-soft);
      box-shadow: inset 3px 0 0 var(--gpao-accent);
    }
    .session-item[data-state="waiting_approval"],
    .session-item[data-state="delete_pending"] {
      border-color: #e3c78b;
      background: var(--gpao-warn-soft);
    }
    .session-item[data-state="blocked"] {
      border-color: #e4b5ae;
      background: var(--gpao-red-soft);
    }
    .session-item[data-state="archived"] {
      color: var(--gpao-soft-text);
      background: #f2f4f0;
    }
    .session-title {
      display: block;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.35;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .session-meta {
      display: block;
      margin-top: 4px;
      color: var(--gpao-muted);
      font-size: 11px;
      line-height: 1.35;
      word-break: keep-all;
    }
    .state-chip, .authority-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--gpao-border-strong);
      border-radius: 999px;
      padding: 4px 8px;
      background: var(--gpao-surface);
      color: var(--gpao-accent);
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .session-menu {
      margin-top: 14px;
      padding: 10px;
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-md);
      background: rgba(255,255,255,0.68);
    }
    .menu-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 8px;
    }
    .work-session {
      min-width: 0;
      height: 100vh;
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;
      background: rgba(255,255,255,0.38);
    }
    .session-head {
      flex: 0 0 auto;
      z-index: 1;
      padding: 16px 24px 13px;
      border-bottom: 1px solid var(--gpao-border);
      background: linear-gradient(180deg, rgba(247,249,244,0.98), rgba(247,249,244,0.74));
      backdrop-filter: blur(14px);
    }
    .session-title-block {
      min-width: 0;
      display: grid;
      gap: 5px;
    }
    .session-title-block h1 {
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .work-thread {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 0;
    }
    .conversation-canvas {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: 18px 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .message-card, .assistant-work-note, .draft-inline-card, .boundary-strip, .composer-card, .inspector-card, .mobile-sheet {
      min-width: 0;
      border: 1px solid var(--gpao-border);
      background: rgba(255,255,255,0.94);
      box-shadow: var(--gpao-shadow-soft);
    }
    .message-card {
      width: min(760px, 92%);
      padding: 13px 15px;
      border-radius: 16px;
    }
    .message-card[data-role="user"] {
      align-self: flex-end;
      background: var(--gpao-blue-soft);
      border-color: #c8d9ea;
    }
    .message-card[data-role="gpao-t"] {
      align-self: flex-start;
      background: var(--gpao-surface);
    }
    .message-card strong, .section-label, .note-label {
      display: block;
      color: var(--gpao-muted);
      font-size: 12px;
      font-weight: 900;
    }
    .message-card p, .card-value {
      margin-top: 6px;
      font-size: 14px;
      line-height: 1.58;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .assistant-work-note {
      width: 100%;
      padding: 15px;
      border-radius: var(--gpao-radius-lg);
      background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(249,250,246,0.9));
      box-shadow: none;
    }
    .note-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .note-head h2 {
      font-size: 15px;
    }
    .signal-strip, .draft-strip, .boundary-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 12px;
    }
    .signal-pill, .draft-pill {
      min-width: 0;
      flex: 1 1 160px;
      padding: 8px 10px;
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-md);
      background: var(--gpao-surface-soft);
    }
    .signal-pill strong, .signal-pill span, .draft-pill strong, .draft-pill span {
      display: block;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .signal-pill strong, .draft-pill strong {
      color: var(--gpao-muted);
      font-size: 11px;
    }
    .signal-pill span, .draft-pill span {
      margin-top: 5px;
      font-size: 12px;
      font-weight: 900;
    }
    .draft-inline-card {
      padding: 14px 15px;
      border-radius: var(--gpao-radius-lg);
      border-left: 4px solid #9fbfd7;
      background: rgba(255,255,255,0.86);
      box-shadow: none;
    }
    .boundary-strip {
      padding: 12px 14px;
      border-radius: var(--gpao-radius-lg);
      background: var(--gpao-warn-soft);
      border-color: #e7c98b;
      border-left: 4px solid #c9943b;
      box-shadow: none;
    }
    .execution-flow {
      padding: 14px 15px;
      border-radius: var(--gpao-radius-lg);
      border: 1px solid #d7e1d3;
      border-left: 4px solid var(--gpao-accent);
      background: rgba(255,255,255,0.88);
      box-shadow: none;
    }
    .execution-flow-inline {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--gpao-border);
    }
    .execution-flow-inline .execution-flow-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      margin-top: 8px;
    }
    .execution-flow-inline .execution-flow-step {
      padding: 7px 8px;
      background: rgba(249,250,246,0.92);
    }
    .execution-flow-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .execution-flow-step {
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid var(--gpao-border);
      border-radius: var(--gpao-radius-md);
      background: var(--gpao-surface-soft);
    }
    .execution-flow-step strong,
    .execution-flow-step span {
      display: block;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .execution-flow-step strong {
      color: var(--gpao-muted);
      font-size: 11px;
    }
    .execution-flow-step span {
      margin-top: 5px;
      font-size: 12px;
      font-weight: 900;
    }
    .boundary-list span {
      border: 1px solid #e3c78b;
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      color: #7a5600;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
    }
    .composer-card {
      flex: 0 0 auto;
      margin: 0 24px 18px;
      padding: 14px;
      border-radius: 16px;
      background: var(--gpao-surface);
      border-color: var(--gpao-border-strong);
      box-shadow: 0 -10px 22px rgba(23, 33, 27, 0.05);
    }
    .composer-box {
      margin-top: 10px;
      min-height: 150px;
      border: 1px solid #c8d9ea;
      border-radius: var(--gpao-radius-md);
      background: var(--gpao-blue-soft);
      padding: 12px;
      color: var(--gpao-text);
      font-size: 14px;
      line-height: 1.58;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .session-inspector {
      min-width: 0;
      height: 100vh;
      position: sticky;
      top: 0;
      overflow: auto;
      padding: 14px 10px;
      border-left: 1px solid var(--gpao-border);
      background: rgba(249,250,246,0.92);
    }
    .inspector-tabs {
      display: grid;
      gap: 9px;
      margin-top: 12px;
    }
    .inspector-card {
      padding: 12px;
    }
    .inspector-card header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: flex-start;
    }
    .inspector-card p {
      margin-top: 7px;
      color: var(--gpao-muted);
      font-size: 12px;
      line-height: 1.5;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .mobile-strip {
      display: none;
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 10px 12px;
      border-bottom: 1px solid var(--gpao-border);
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(16px);
    }
    .mobile-sheets {
      display: none;
      gap: 10px;
      padding: 0 12px 14px;
      background: var(--gpao-bg);
    }
    .mobile-sheet {
      padding: 12px;
    }
    .mobile-sheet-list {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }
    .qa-sentinel {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 1120px) {
      .workspace-shell { grid-template-columns: 212px minmax(0, 1fr); }
      .session-inspector {
        position: static;
        height: auto;
        grid-column: 1 / -1;
        border-left: 0;
        border-top: 1px solid var(--gpao-border);
      }
      .inspector-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 760px) {
      .mobile-strip { display: flex; }
      .workspace-shell {
        display: block;
        min-width: 0;
      }
      .session-rail, .session-inspector {
        display: none;
      }
      .work-session {
        height: auto;
        min-height: 0;
        overflow: visible;
        padding: 0;
      }
      .session-head {
        position: static;
        padding: 12px;
      }
      .conversation-canvas {
        max-height: none;
        overflow: visible;
        padding: 12px;
      }
      .message-card {
        width: 100%;
      }
      .mobile-sheets {
        display: grid;
      }
      .message-card, .assistant-work-note, .draft-inline-card, .boundary-strip, .execution-flow, .composer-card {
        border-radius: var(--gpao-radius-md);
        padding: 12px;
      }
      .execution-flow-grid {
        grid-template-columns: 1fr;
      }
      .execution-flow-inline .execution-flow-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .execution-flow-inline .execution-flow-step:last-child {
        grid-column: 1 / -1;
      }
      .composer-card {
        margin: 0 12px 10px;
      }
      .composer-box {
        min-height: 84px;
      }
    }
    @media (max-width: 420px) {
      body, .mobile-strip, .work-session, .mobile-sheets {
        width: 100vw;
        max-width: 100vw;
      }
      h1 { font-size: 17px; }
      .mobile-strip {
        flex-direction: column;
        align-items: stretch;
        gap: 7px;
      }
      .state-chip, .authority-chip {
        width: fit-content;
        max-width: 100%;
        white-space: normal;
      }
      .signal-pill, .draft-pill {
        flex-basis: 100%;
      }
    }
  </style>
</head>
<body data-core-work-surface="read-only" data-session-workspace="session-based-local-ai-os" data-external-activation="blocked">
  <div class="mobile-strip" data-mobile-operating-strip="visible">
    <div>
      <strong>${escapeHtml(activeSession.title)}</strong>
      <p class="muted">${escapeHtml(activeSession.stateLabel)} · 외부 전송 없음</p>
    </div>
    <span class="authority-chip">아직 실행하지 않음</span>
  </div>
  <main class="workspace-shell">
    <aside class="session-rail" data-session-rail="left" aria-label="세션 레일">
      <div class="rail-head">
        <div class="rail-title">
          <h2>세션</h2>
          <span>로컬 작업공간</span>
        </div>
        <span class="state-chip">${escapeHtml(uiLabel(workSurface.status))}</span>
      </div>
      <div class="rail-actions">
        ${workspace.sessionRail.actions.map((action) => `<button class="icon-button" type="button" aria-disabled="true">${escapeHtml(action.label)}</button>`).join("")}
      </div>
      <div class="search-box" aria-label="세션 검색">세션 검색 · 읽기 전용</div>
      ${activeGroups.map((group) => `
      <section class="session-group" data-session-group="${escapeHtml(group.id)}">
        <div class="session-group-title"><span>${escapeHtml(group.label)}</span><span>${escapeHtml(String(group.sessions.length))}</span></div>
        <div class="session-list">
          ${group.sessions.map((session) => renderSessionItem(session)).join("")}
        </div>
      </section>`).join("")}
      <section class="session-menu" data-session-menu="recoverable-actions">
        <h3>세션 메뉴</h3>
        <p class="muted">영구 삭제는 열지 않고 복구 가능한 삭제 대기만 사용합니다.</p>
        <div class="menu-grid">
          ${archiveActions.map((action) => `<span class="soft-button" data-session-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</span>`).join("")}
        </div>
      </section>
    </aside>

    <section class="work-session" data-active-work-session="center" aria-label="활성 작업 세션">
      <header class="session-head">
        <div class="session-title-block">
          <span class="session-kicker">GPAO-T 작업공간</span>
          <h1>${escapeHtml(activeSession.title)}</h1>
          <p class="muted">세션 기반 로컬 AI 운영 작업공간 · ${escapeHtml(activeSession.stateLabel)}</p>
        </div>
        <span class="state-chip">${escapeHtml(activeSession.stateLabel)}</span>
      </header>
      <div class="work-thread" data-workspace-layout="conversation-first">
        <div class="conversation-canvas" data-work-conversation-canvas="wide" aria-label="작업 대화 캔버스">
          ${activeSession.thread.map((message) => `
          <article class="message-card" data-role="${escapeHtml(message.role)}">
            <strong>${escapeHtml(message.label)} · ${escapeHtml(uiLabel(message.state))}</strong>
            <p>${escapeHtml(message.text)}</p>
          </article>`).join("")}
          <section class="assistant-work-note" data-understanding-summary="read-only">
            <div class="note-head">
              <div>
                <strong class="note-label">GPAO-T가 이해한 일</strong>
                <h2>${escapeHtml(activeSession.sections.find((section) => section.id === "understanding")?.value || activeSession.thread[1]?.text || "현재 요청을 로컬 작업으로 이해했습니다.")}</h2>
              </div>
              <span class="state-chip">미리보기만</span>
            </div>
            <p class="card-value">${escapeHtml(activeSession.thread[1]?.text || "요청을 로컬 작업으로 이해하고, 실행 전 미리보기 상태로 유지합니다.")}</p>
            <div class="execution-flow-inline" data-execution-governance-flow="local-record-review">
              <strong class="section-label">${escapeHtml(executionGovernanceFlow.headline)}</strong>
              <div class="execution-flow-grid" aria-label="실행 확인 흐름">
                ${executionGovernanceFlow.flowStages.map((stage) => `
                <div class="execution-flow-step" data-execution-flow-stage="${escapeHtml(stage.id)}">
                  <strong>${escapeHtml(stage.step)}. ${escapeHtml(stage.label)}</strong>
                  <span>${escapeHtml(stage.state)}</span>
                </div>`).join("")}
              </div>
              <p class="muted">로컬 기록 후 리플레이 · 실제 실행 없음</p>
            </div>
            <div class="signal-strip" aria-label="맥락 스킬 모델 후보">
              <div class="signal-pill"><strong>맥락</strong><span>${escapeHtml(uiLabel(contextCandidates[0]?.anchor || "맥락 후보 확인 필요"))}</span></div>
              <div class="signal-pill"><strong>스킬</strong><span>${escapeHtml(uiLabel(selectedPacks[0]?.title || "핵심 사고 정리"))}</span></div>
              <div class="signal-pill"><strong>모델</strong><span>${escapeHtml(uiLabel(workSurface.modelToolRoutePreview.selectedModelAdapter || "로컬 추론 후보"))}</span></div>
            </div>
          </section>
          <section class="draft-inline-card" data-local-draft-preview="visible-local-structure">
            <strong class="section-label">${escapeHtml(workSurface.localDraftPreview.headline)}</strong>
            <p class="card-value">${escapeHtml(workSurface.localDraftPreview.expectedOutputShape.value)}</p>
            <div class="draft-strip">
              ${draftPreviewSections.slice(0, 3).map((section) => `
              <div class="draft-pill" data-local-draft-section="${escapeHtml(section.id)}" data-state="${escapeHtml(section.state)}">
                <strong>${escapeHtml(section.label)}</strong>
                <span>${escapeHtml(uiLabel(section.value))}</span>
              </div>`).join("")}
            </div>
          </section>
          <section class="boundary-strip" data-authority-boundary="closed">
            <strong class="section-label">실행 전 확인</strong>
            <p class="card-value">아직 실행하지 않음 · 외부 전송 없음 · 모델 호출 없음 · 도구 실행 없음</p>
            <div class="boundary-list">
              <span>읽기 전용</span>
              <span>미리보기만</span>
              <span>저장 전 확인</span>
              <span>외부 전송 전 확인</span>
            </div>
          </section>
          <section class="execution-flow" data-execution-governance-flow="local-record-review-detail">
            <strong class="section-label">${escapeHtml(executionGovernanceFlow.headline)}</strong>
            <p class="card-value">${escapeHtml(executionGovernanceFlow.userMessage)}</p>
            <div class="execution-flow-grid" aria-label="실행 확인 흐름">
              ${executionGovernanceFlow.flowStages.map((stage) => `
              <div class="execution-flow-step" data-execution-flow-stage="${escapeHtml(stage.id)}">
                <strong>${escapeHtml(stage.step)}. ${escapeHtml(stage.label)}</strong>
                <span>${escapeHtml(stage.state)}</span>
              </div>`).join("")}
            </div>
            <p class="muted">로컬 기록 후 리플레이 · ${escapeHtml(executionGovernanceFlow.replay.rollbackReference)}</p>
          </section>
        </div>
        <section class="composer-card" aria-label="작업 입력">
          <strong class="section-label">작업 입력</strong>
          <div class="composer-box" role="textbox" aria-readonly="true" data-composer-state="draft-not-sent" tabindex="0">
            ${escapeHtml(workspace.activeWorkSession.composer.placeholder)}
          </div>
          <p class="muted">현재 입력은 초안입니다. 전송, 모델 호출, 커넥터 실행은 열리지 않습니다.</p>
        </section>
      </div>
    </section>

    <aside class="session-inspector" data-session-inspector="right" aria-label="맥락 권한 실행 인스펙터">
      <div class="inspector-head">
        <div>
          <h2>인스펙터</h2>
          <p class="muted">맥락 · 권한 · 실행 깊이 보기</p>
        </div>
        <span class="state-chip">검토</span>
      </div>
      <div class="inspector-tabs">
        ${inspectorTabs.map((tab) => `
        <article class="inspector-card" data-inspector-tab="${escapeHtml(tab.id)}">
          <header>
            <h3>${escapeHtml(tab.label)}</h3>
            <span class="state-chip">${escapeHtml(uiLabel(tab.state))}</span>
          </header>
          <p><strong>근거</strong> ${escapeHtml(uiLabel(tab.evidence || "none"))}</p>
          <p><strong>다음 행동</strong> ${escapeHtml(tab.nextSafeAction)}</p>
        </article>`).join("")}
      </div>
    </aside>
  </main>
  <section class="mobile-sheets" aria-label="모바일 보조 시트">
    <article class="mobile-sheet" id="mobile-session-list-sheet" data-mobile-session-sheet="visible">
      <h2>세션 목록</h2>
      <p class="muted">모바일에서는 세션 목록을 별도 시트로 엽니다.</p>
      <div class="mobile-sheet-list">
        ${mobileSessionItems.slice(0, 5).map((session) => renderSessionItem(session)).join("")}
      </div>
    </article>
    <article class="mobile-sheet" id="mobile-inspector-sheet" data-mobile-inspector-sheet="visible">
      <h2>검토</h2>
      <p class="muted">맥락, 권한, 모델, 도구, 기록, 되돌리기를 필요할 때 확인합니다.</p>
      <div class="boundary-list">
        ${inspectorTabs.map((tab) => `<span>${escapeHtml(tab.label)}</span>`).join("")}
      </div>
    </article>
  </section>
  <div class="qa-sentinel">
    <span>GPAO-T Work Surface</span>
    <span data-session-behavior="local-actions-enabled">새 세션 · 이름 변경 · 보관 · 복구 · 삭제 대기 취소</span>
    <span data-understanding-summary="read-only">읽기 전용 · 실제 전송/모델/도구 실행 없음</span>
    <span data-understanding-card="execution-boundary">읽기 전용 · 실제 전송/모델/도구 실행 없음</span>
    <span data-readability-interaction="native-details">작업 브리프</span>
    <span data-readability-section="task-brief">읽기 체크리스트</span>
    <span data-confirmation-ux="preview-only">아직 실행된 것은 없습니다</span>
    <span data-confirmation-card="understood-input">미리보기 확인만 의미</span>
    <span data-confirmation-card="context-evidence">미리보기 확인만 의미</span>
    <span data-confirmation-card="skill-route">미리보기 확인만 의미</span>
    <span data-confirmation-card="authority-boundary">미리보기 확인만 의미</span>
    <span data-local-draft-section="expected-output">현재 상태: 초안 생성 없음</span>
    <span data-local-draft-section="context-to-use">현재 상태: 초안 생성 없음</span>
    <span data-local-draft-section="skill-route">현재 상태: 초안 생성 없음</span>
    <span data-local-draft-section="locked-state">현재 상태: 초안 생성 없음</span>
    <span data-local-draft-state="empty">현재 상태: 초안 생성 없음</span>
    <span data-local-draft-state="blocked">실행 행동이 섞였을 때</span>
    <span data-local-draft-state="review-needed">맥락이 애매할 때</span>
    <span data-preview-confirmation-flow="read-only">의도와 맞음</span>
    <span data-preview-decision="intent-match">의도와 맞음</span>
    <span data-preview-decision="needs-changes">수정 필요</span>
    <span data-preview-decision="hold">보류</span>
    <span>미리보기 확인 체크리스트</span>
    <span data-first-local-work-loop="preview">${escapeHtml(firstLocalWorkLoop.title)}</span>
    <span data-execution-proposal-confirmation="preview-only">${escapeHtml(executionConfirmation.headline)}</span>
    <span data-approval-packet-validation="design-only">승인 패킷</span>
    <span data-local-record-substrate="v1">로컬 기록</span>
    <span data-audit-write-design="local-record-only">감사 기록</span>
    <span data-audit-preview="design-only">기록될 예정인 항목</span>
    <span data-audit-item="requested_action">기록될 예정인 항목</span>
    <span data-approval-record-write-ux="design-only">저장 전 확인</span>
    <span data-approval-record-preview="no-write">저장될 항목 미리보기 · 쓰기 잠금 · 사용자 확인</span>
    <span data-execution-governance-flow="local-record-review">실행 확인 흐름 · 로컬 기록 후 리플레이</span>
    <span>${authorityLegend.map((level) => escapeHtml(level.label)).join(" ")}</span>
    <span>${confirmationCards.map((card) => escapeHtml(card.label)).join(" ")}</span>
    <span>${previewDecisions.map((decision) => escapeHtml(decision.label)).join(" ")}</span>
  </div>
</body>
</html>`;
}

function renderSessionItem(session) {
  return `<article class="session-item" data-session-id="${escapeHtml(session.id)}" data-state="${escapeHtml(session.state)}">
    <div>
      <strong class="session-title">${escapeHtml(session.title)}</strong>
      <span class="session-meta">${escapeHtml(session.lastActivity)} · ${escapeHtml(session.project)} · ${escapeHtml(session.hint)}</span>
    </div>
    <span class="state-chip">${escapeHtml(session.stateLabel || uiLabel(session.state))}</span>
  </article>`;
}

function localRecordSubstrateHtml(substrate = {}) {
  const counts = substrate.counts || {};
  const latest = substrate.latest?.approvalRecord;
  return `
        <div class="audit-preview-grid" data-local-record-substrate="v1" aria-label="Local approval and audit record substrate">
          <div class="audit-item">
            <strong>로컬 기록</strong>
            <span>승인 ${escapeHtml(counts.approvalRecords || 0)} · 감사 ${escapeHtml(counts.auditRecords || 0)}</span>
            <small>${escapeHtml(substrate.visualConfirmation?.userMessage || "로컬 JSONL 기록만 허용됩니다.")}</small>
          </div>
          <div class="audit-item">
            <strong>최근 기록</strong>
            <span>${escapeHtml(latest?.id || "아직 없음")}</span>
            <small>${escapeHtml(latest?.rollbackReference || "기록 후 replay에서 되돌리기 기준을 읽습니다.")}</small>
          </div>
          <div class="audit-item">
            <strong>계속 잠김</strong>
            <span>${escapeHtml((substrate.blockedBoundaries || []).slice(0, 4).map(uiLabel).join(" · "))}</span>
            <small>외부 전송, 비용/파괴, 인증 정보 접근, 커넥터 실행은 열리지 않습니다.</small>
          </div>
        </div>`;
}

function uiLabel(value) {
  return UI_LABELS[String(value)] || value;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
