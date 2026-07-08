import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildSkillExecutionPlan } from "./skill-ecosystem.js";
import { runtimePaths } from "./storage.js";

const SKILL_EXECUTION_HISTORY_FILE = "skill-execution/history.jsonl";
const SKILL_EXECUTION_BASELINE = "skill_execution_adapter_v0_1";

export function skillExecutionHistoryPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, SKILL_EXECUTION_HISTORY_FILE);
}

export function buildSkillExecutionRun({
  request,
  skillExecutionPlan,
  now = new Date().toISOString(),
} = {}) {
  const plan = skillExecutionPlan || buildSkillExecutionPlan({ request });
  if (!plan || plan.status !== "ready") {
    return {
      schema: "gpao_t.skill_execution_run.v0_1",
      status: "blocked",
      reason: "ready_skill_execution_plan_required",
      plan,
    };
  }

  const artifacts = buildLocalArtifacts({ plan });
  const qualityResults = buildQualityResults({ plan, artifacts });
  const blockedQualityResults = qualityResults.filter((result) => result.status === "blocked");
  const reviewQualityResults = qualityResults.filter((result) => result.status === "review");

  return {
    schema: "gpao_t.skill_execution_run.v0_1",
    executionBaseline: SKILL_EXECUTION_BASELINE,
    id: `skillrun.${Date.parse(now) || 0}`,
    createdAt: now,
    status: blockedQualityResults.length ? "blocked" : reviewQualityResults.length ? "review" : "ready",
    executionMode: plan.executionMode,
    request: plan.request,
    selectedSkills: plan.selectedSkills.map((skill) => ({
      id: skill.id,
      routeRole: skill.routeRole,
      outputArtifacts: skill.outputArtifacts,
    })),
    localArtifacts: artifacts,
    qualityGateResults: qualityResults,
    replayEvidence: buildReplayEvidence({ plan, artifacts, qualityResults }),
    growthSignalCandidates: buildGrowthSignalCandidates({ plan, qualityResults }),
    authorityBoundary: {
      mode: plan.executionMode,
      liveSkillMutation: "blocked_until_approval_replay_audit_and_rollback",
      durableMemoryPromotion: "blocked_until_review",
      externalSend: "blocked_until_explicit_approval",
      deployment: "blocked_until_explicit_approval",
      localPreview: "allowed",
    },
    userVisibleSummary: buildExecutionRunSummary({ plan, artifacts, qualityResults }),
  };
}

export function appendSkillExecutionRun({
  root,
  request,
  skillExecutionPlan,
  now = new Date().toISOString(),
} = {}) {
  const run = buildSkillExecutionRun({ request, skillExecutionPlan, now });
  if (run.status === "blocked") {
    return run;
  }
  const file = skillExecutionHistoryPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(run)}\n`, { flag: "a" });
  return {
    ...run,
    persistence: {
      schema: "gpao_t.skill_execution_persistence.v0_1",
      state: "written",
      historyFile: file,
    },
  };
}

export function readSkillExecutionHistory({ root, limit = 50 } = {}) {
  const file = skillExecutionHistoryPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildSkillExecutionSummary({ root } = {}) {
  const history = readSkillExecutionHistory({ root });
  const latest = history.at(-1) || null;
  const blocked = history.filter((run) => run.status === "blocked").length;
  const review = history.filter((run) => run.status === "review").length;
  const ready = history.filter((run) => run.status === "ready").length;
  const growthSignals = history.flatMap((run) => run.growthSignalCandidates || []);

  return {
    schema: "gpao_t.skill_execution_summary.v0_1",
    status: history.length ? review || blocked ? "review" : "ready" : "review",
    totalRuns: history.length,
    ready,
    review,
    blocked,
    latest,
    growthSignalCandidates: growthSignals.slice(-20),
    nextSafeAction: history.length
      ? "Review the latest skill execution evidence and convert repeated growth signals into proposals only after replay coverage."
      : "Run gpao-t skill execute-record <text> to record the first local skill execution evidence.",
  };
}

function buildLocalArtifacts({ plan }) {
  const artifacts = [];
  const candidateArtifacts = plan.artifactContract.candidateArtifacts;
  for (const artifactName of candidateArtifacts) {
    artifacts.push(buildArtifact({ artifactName, plan }));
  }
  return artifacts;
}

function buildArtifact({ artifactName, plan }) {
  const artifactType = classifyArtifactType(artifactName);
  return {
    id: `artifact.${artifactName}`,
    artifactName,
    artifactType,
    status: "drafted_local_preview",
    title: titleForArtifact({ artifactName, request: plan.request }),
    sections: sectionsForArtifact({ artifactName, plan }),
    sourceSkills: plan.selectedSkills
      .filter((skill) => skill.outputArtifacts.includes(artifactName))
      .map((skill) => skill.id),
    authority: {
      localDraft: "allowed",
      externalUse: "blocked_until_user_approval",
    },
  };
}

function buildQualityResults({ plan, artifacts }) {
  return plan.qualityGateContract.gates.map((gate) => {
    const evidence = evidenceForGate({ gate, artifacts, plan });
    const hasSpecificEvidence = evidence.some((item) => item !== "local_artifact_drafted_for_manual_review");
    return {
      gate,
      status: hasSpecificEvidence ? "pass" : "review",
      evidence,
      checkedAgainst: {
        selectedSkills: plan.selectedSkills.map((skill) => skill.id),
        artifacts: artifacts.map((artifact) => artifact.artifactName),
      },
      nextSafeAction: evidence.length
        ? "Keep this gate as completion evidence for local preview work."
        : "Add a more concrete artifact or replay fixture before treating this gate as passed.",
    };
  });
}

function buildReplayEvidence({ plan, artifacts, qualityResults }) {
  return {
    schema: "gpao_t.skill_execution_replay_evidence.v0_1",
    status: "ready",
    replayCases: plan.replayContract.replayCases.map((replayCase) => ({
      case: replayCase,
      status: "covered_by_local_preview",
      evidence: artifacts.slice(0, 3).map((artifact) => artifact.id),
    })),
    qualityGatePasses: qualityResults.filter((result) => result.status === "pass").length,
    qualityGateReviews: qualityResults.filter((result) => result.status === "review").length,
    rule: "Replay evidence is local preview evidence only; live skill mutation still requires approval, audit, and rollback gates.",
  };
}

function buildGrowthSignalCandidates({ plan, qualityResults }) {
  const reviewGates = qualityResults.filter((result) => result.status === "review");
  const signals = new Set(plan.replayContract.growthSignals);
  for (const gate of reviewGates) {
    signals.add(`Quality gate needs stronger artifact evidence: ${gate.gate}`);
  }

  return [...signals].map((signal) => ({
    signal,
    status: "candidate",
    source: "skill_execution_run",
    authority: "review_before_growth_proposal",
  }));
}

function buildExecutionRunSummary({ plan, artifacts, qualityResults }) {
  const reviewCount = qualityResults.filter((result) => result.status === "review").length;
  return {
    language: "ko",
    summary: reviewCount
      ? "선택된 스킬팩으로 로컬 산출물 초안과 품질 게이트 검사를 만들었고, 일부 게이트는 추가 증거가 필요합니다."
      : "선택된 스킬팩으로 로컬 산출물 초안과 품질 게이트 검사를 만들었습니다.",
    producedArtifacts: artifacts.map((artifact) => artifact.artifactName),
    qualityStatus: reviewCount ? "review" : "pass",
    nextSafeAction: plan.executionMode === "local_preview_with_authority_gate"
      ? "권한 경계가 있으므로 산출물 초안과 검증 결과만 사용하고 실제 적용은 승인 뒤로 둡니다."
      : "산출물 초안과 품질 게이트 결과를 다음 로컬 작업의 기준으로 사용합니다.",
  };
}

function classifyArtifactType(artifactName) {
  if (/design|ui|style|visual/.test(artifactName)) return "design";
  if (/implementation|working_app|run_instructions|test/.test(artifactName)) return "implementation";
  if (/source|evidence|claim|recommendation/.test(artifactName)) return "research";
  if (/report|proposal|manual|brief|markdown|doc/.test(artifactName)) return "document";
  if (/growth|approval|audit/.test(artifactName)) return "growth_governance";
  if (/analysis|calculation|chart|decision/.test(artifactName)) return "data_or_decision";
  return "general";
}

function titleForArtifact({ artifactName, request }) {
  const labels = {
    design_direction: "Design Direction",
    ui_spec: "UI Specification",
    style_tokens: "Style Tokens",
    visual_qa_report: "Visual QA Report",
    implementation_plan: "Implementation Plan",
    working_app: "Working App Contract",
    test_report: "Test Report",
    run_instructions: "Run Instructions",
    decision_brief: "Decision Brief",
    task_plan: "Task Plan",
    priority_matrix: "Priority Matrix",
    next_action: "Next Action",
    growth_report: "Growth Report",
    upgrade_proposal: "Upgrade Proposal",
    approval_card: "Approval Card",
    audit_record: "Audit Record",
  };
  return `${labels[artifactName] || artifactName} for: ${request}`;
}

function sectionsForArtifact({ artifactName, plan }) {
  const base = [
    {
      id: "user_request",
      title: "User Request",
      content: plan.request,
    },
    {
      id: "selected_skills",
      title: "Selected Skills",
      content: plan.selectedSkills.map((skill) => `${skill.id}:${skill.routeRole}`).join(", "),
    },
  ];

  if (/design|ui|style|visual/.test(artifactName)) {
    return [
      ...base,
      {
        id: "design_principle",
        title: "Design Principle",
        content: "Preserve typography, spacing, contrast, responsive behavior, hierarchy, and domain fit before visual decoration.",
      },
      {
        id: "visual_checks",
        title: "Visual Checks",
        content: "Check first viewport clarity, text fit, component stability, and non-generic AI-looking styling.",
      },
    ];
  }

  if (/implementation|working_app|run_instructions|test/.test(artifactName)) {
    return [
      ...base,
      {
        id: "implementation_boundary",
        title: "Implementation Boundary",
        content: "Local implementation is allowed; dependency install, deployment, and external activation remain gated.",
      },
      {
        id: "verification_path",
        title: "Verification Path",
        content: "Verify first success path, empty state, failure/recovery state, and existing project conventions.",
      },
    ];
  }

  if (/growth|approval|audit/.test(artifactName)) {
    return [
      ...base,
      {
        id: "growth_loop",
        title: "Growth Loop",
        content: "Observe, propose, replay, approve, apply, audit, and rollback. Live mutation stays blocked until gates pass.",
      },
      {
        id: "approval_boundary",
        title: "Approval Boundary",
        content: "Proposal generation and weekly report drafts are allowed; live rule mutation requires approval and replay evidence.",
      },
    ];
  }

  if (/decision|task_plan|priority|next_action/.test(artifactName)) {
    return [
      ...base,
      {
        id: "facts_assumptions_risks",
        title: "Facts / Assumptions / Risks",
        content: "Separate facts, assumptions, risks, and the current request before choosing the next action.",
      },
      {
        id: "next_action",
        title: "Next Action",
        content: "Name the next local, reversible action and avoid decorative theory unless it changes a concrete decision.",
      },
    ];
  }

  return [
    ...base,
    {
      id: "artifact_purpose",
      title: "Artifact Purpose",
      content: "Turn the selected skill into a concrete local output that can be inspected, tested, and improved.",
    },
  ];
}

function evidenceForGate({ gate, artifacts, plan }) {
  const text = `${artifacts.map((artifact) => `${artifact.artifactName} ${artifact.artifactType} ${artifact.sections.map((section) => section.content).join(" ")}`).join(" ")} ${plan.request}`.toLowerCase();
  const evidence = [];

  if (/typography|spacing|contrast|responsive|hierarchy|generic|domain|audience|design/i.test(gate)
    && /typography|spacing|contrast|responsive|hierarchy|visual|domain|audience|design/.test(text)) {
    evidence.push("visual_artifact_contains_layout_quality_sections");
  }
  if (/first screen|workflow|empty state|recovery|responsive|implementation/i.test(gate)
    && /implementation|workflow|empty state|recovery|working_app|test/.test(text)) {
    evidence.push("implementation_artifact_contains_workflow_verification_sections");
  }
  if (/source|evidence|claim|uncertainty|latest|official/i.test(gate)
    && /source|evidence|claim|research|official|uncertainty/.test(text)) {
    evidence.push("research_artifact_contains_source_grounding_sections");
  }
  if (/reader|purpose|action|generic filler|structure/i.test(gate)
    && /document|brief|report|purpose|action|structure/.test(text)) {
    evidence.push("document_artifact_contains_reader_purpose_sections");
  }
  if (/broad capture|durable promotion|live mutation|approval|security|money|legal|replay|rollback/i.test(gate)
    && /growth|approval|audit|rollback|live mutation|blocked|replay/.test(text)) {
    evidence.push("growth_governance_artifact_contains_authority_and_replay_sections");
  }
  if (/preserves the user's current request/i.test(gate)
    && /user request/.test(text)) {
    evidence.push("current_request_section_preserved");
  }
  if (/facts|assumptions|risks|next action|current request|highest-priority anchor|decorative theory/i.test(gate)
    && /user request|next action|selected skills|artifact purpose/.test(text)) {
    evidence.push("core_thinking_artifact_preserves_request_and_next_action");
  }

  if (!evidence.length && artifacts.length) {
    evidence.push("local_artifact_drafted_for_manual_review");
  }

  return evidence;
}
