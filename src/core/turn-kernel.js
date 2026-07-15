import { buildAdapterPlan } from "./adapter-boundary.js";
import { buildAdmissionPacket } from "./admission.js";
import { buildAuthorityDecision } from "./authority.js";
import { hasFollowUpSignal } from "./context-admission-policy.js";
import { buildContextRuntime } from "./context-runtime.js";
import { routeModel } from "./model-router.js";
import { buildSessionOverlay } from "./session-overlay.js";
import { buildSkillExecutionPlan, routeSkillPacks } from "./skill-ecosystem.js";
import { buildToolPlan } from "./tool-runtime.js";

export function runTurn({ input, priorFlow, root } = {}) {
  if (!input?.text) {
    throw new Error("runTurn requires input.text");
  }

  const inputSignal = classifyInputSignal(input.text);
  const sessionOverlay = buildSessionOverlay({ input, priorFlow, inputSignal });
  const contextRuntime = buildContextRuntime({ input, sessionOverlay, inputSignal, root });
  const admissionPacket = buildAdmissionPacket({ inputSignal, sessionOverlay, contextRuntime });
  const authorityDecision = buildAuthorityDecision({ input, admissionPacket });
  const skillRoute = routeSkillPacks({ request: input.text });
  const skillExecutionPlan = buildSkillExecutionPlan({ skillRoute });
  const modelRoute = routeModel({ inputSignal, authorityDecision });
  const toolPlan = buildToolPlan({ inputSignal, authorityDecision });
  const adapterPlan = buildAdapterPlan({ modelRoute, toolPlan });
  const taskPacket = buildTaskPacket({
    input,
    inputSignal,
    sessionOverlay,
    admissionPacket,
    authorityDecision,
    skillRoute,
    skillExecutionPlan,
    modelRoute,
    toolPlan,
    adapterPlan,
  });

  return {
    schema: "gpao_t.turn_result.v0_1",
    status: authorityDecision.status === "needs_approval" ? "needs_approval" : "ready",
    inputSignal,
    sessionOverlay,
    contextRuntime,
    admissionPacket,
    authorityDecision,
    skillRoute,
    skillExecutionPlan,
    modelRoute,
    toolPlan,
    adapterPlan,
    taskPacket,
    userVisibleState: buildUserVisibleState({ taskPacket, authorityDecision }),
  };
}

export function classifyInputSignal(text) {
  if (hasFollowUpSignal(text)) {
    return { kind: "follow_up", confidence: 0.78 };
  }
  if (/파일|문서|package|release|배포/.test(text)) {
    return { kind: "artifact_request", confidence: 0.82 };
  }
  if (/삭제|토큰|secret|oauth|전송|자동/.test(text)) {
    return { kind: "authority_request", confidence: 0.86 };
  }
  return { kind: "general_request", confidence: 0.55 };
}

function buildTaskPacket({
  input,
  inputSignal,
  sessionOverlay,
  admissionPacket,
  authorityDecision,
  skillRoute,
  skillExecutionPlan,
  modelRoute,
  toolPlan,
  adapterPlan,
}) {
  return {
    schema: "gpao_t.task_packet.v0_1",
    id: `task.${sessionOverlay.flowKey}.${inputSignal.kind}`,
    objective: inferObjective({ input, sessionOverlay }),
    activeTargetId: sessionOverlay.activeTargetId,
    requestType: sessionOverlay.requestType,
    targetSource: sessionOverlay.targetSource,
    activeReferent: sessionOverlay.activeReferent,
    continuityHandoff: sessionOverlay.continuityHandoff,
    stalePriorTarget: sessionOverlay.stalePriorTarget,
    staleReason: sessionOverlay.staleReason,
    admittedTCells: admissionPacket.admittedCells
      .filter((item) => item.admitted && (item.role === "anchor" || item.role === "support"))
      .map((item) => ({
        id: item.id,
        role: item.role,
        reason: item.reason,
      })),
    authority: {
      status: authorityDecision.status,
      requiredApprovals: authorityDecision.requiredApprovals,
    },
    skillRoute: {
      status: skillRoute.status,
      intentProfile: skillRoute.intentProfile,
      selectedPacks: skillRoute.selectedPacks.map((pack) => ({
        id: pack.id,
        routeRole: pack.routeRole,
        score: pack.score,
        intentReasons: pack.intentReasons,
        firstQualityGate: pack.firstQualityGate,
      })),
      routeQuality: skillRoute.routeQuality,
    },
    skillExecutionPlan: {
      status: skillExecutionPlan.status,
      executionMode: skillExecutionPlan.executionMode,
      selectedSkills: skillExecutionPlan.selectedSkills.map((skill) => ({
        id: skill.id,
        routeRole: skill.routeRole,
        executionSteps: skill.executionSteps.map((step) => step.id),
        requiredQualityGates: skill.requiredQualityGates,
        outputArtifacts: skill.outputArtifacts,
      })),
      artifactContract: skillExecutionPlan.artifactContract,
      qualityGateContract: skillExecutionPlan.qualityGateContract,
      authorityContract: skillExecutionPlan.authorityContract,
      replayContract: skillExecutionPlan.replayContract,
    },
    modelRoute: modelRoute.route,
    toolPlan: toolPlan.status,
    adapterPlan: adapterPlan.status,
    selectedModelAdapter: modelRoute.adapterSelection?.selected?.id || null,
    admittedToolAdapters: toolPlan.adapterSelection?.admitted.map((adapter) => adapter.id) || [],
    trace: [
      "receive_input",
      "classify_input_signal",
      "recover_session_overlay",
      "retrieve_context_runtime",
      "admit_t_cells",
      "check_authority",
      "route_skill_packs",
      "build_skill_execution_plan",
      "route_model",
      "plan_tools",
      "plan_adapters",
      "build_task_packet",
    ],
  };
}

function inferObjective({ input, sessionOverlay }) {
  if (sessionOverlay.activeReferent?.entity && sessionOverlay.continuityHandoff?.decision === "auto_carry") {
    return `Continue from recent referent: ${sessionOverlay.activeReferent.entity}`;
  }
  if (sessionOverlay.activeTargetId === "release-file") {
    return "Recover the release-file active target and answer or draft only within local authority.";
  }
  return `Handle user request: ${input.text}`;
}

function buildUserVisibleState({ taskPacket, authorityDecision }) {
  const selectedSkillIds = taskPacket.skillRoute.selectedPacks.map((pack) => pack.id);
  return {
    language: "ko",
    summary: authorityDecision.status === "needs_approval"
      ? "요청의 맥락은 복구했지만 실제 배포/외부 실행은 승인 전까지 로컬 초안으로만 다룹니다."
      : taskPacket.continuityHandoff?.decision === "auto_carry"
      ? `${taskPacket.activeReferent.entity} 맥락을 새 세션에서도 이어받았습니다.`
      : "요청의 맥락을 복구했고 로컬 작업으로 진행할 수 있습니다.",
    activeTarget: taskPacket.activeTargetId,
    activeReferent: taskPacket.activeReferent,
    continuityHandoff: taskPacket.continuityHandoff
      ? {
        decision: taskPacket.continuityHandoff.decision,
        confidence: taskPacket.continuityHandoff.confidence,
        userFacingHint: taskPacket.continuityHandoff.userFacingHint,
      }
      : null,
    selectedSkills: taskPacket.skillRoute.selectedPacks.map((pack) => ({
      id: pack.id,
      role: pack.routeRole,
      firstQualityGate: pack.firstQualityGate,
    })),
    skillExecutionMode: taskPacket.skillExecutionPlan.executionMode,
    nextSafeAction: authorityDecision.status === "needs_approval"
      ? "로컬 초안과 검증 계획을 먼저 제시합니다."
      : selectedSkillIds.length
      ? `선택된 스킬팩(${selectedSkillIds.join(", ")})의 품질 게이트를 적용해 로컬 검증 가능한 작업 계획을 실행합니다.`
      : "로컬 검증 가능한 작업 계획을 실행합니다.",
  };
}
