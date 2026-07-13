import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLiveTurnAbsorptionPolicy } from "./live-turn-absorption-bridge.js";

const SOURCE_AUTHORITY = [
  "current_user_instruction",
  "live_openclaw_state",
  "pure_openclaw_source_anatomy",
  "nbeai_source_library",
  "tcell_canon_and_calculus",
  "context_mesh_hits",
  "older_documents",
];

const AUTHORITY_STOP_LINES = [
  "live_openclaw_mutation",
  "gateway_restart",
  "live_model_or_telegram_turn",
  "credential_or_token_change",
  "connector_or_automation_activation",
  "durable_memory_promotion",
  "github_push_or_public_release",
  "publish_or_deploy",
  "unknown_user_work_deletion",
  "live_gpao_rule_mutation",
];

const DEFAULT_LIVE_DIST = "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const DEFAULT_LAB_DIST = "openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist";

export function buildMemoryKnowledgeControlArchitecture() {
  return {
    schema: "gpao_t.memory_knowledge_control_architecture.v0_1",
    status: "architecture_ready",
    sequence: [
      "openclaw_memory",
      "raw_data_vault",
      "source_record",
      "llm_wiki_compiler",
      "context_mesh",
      "tcell_admission",
      "knowledge_loop",
      "task_packet",
    ],
    principle: [
      "OpenClaw memory recalls candidate material.",
      "Raw Data Vault preserves source truth.",
      "Source Record binds origin, time, owner, confidence, and freshness.",
      "LLM Wiki Compiler organizes source-linked pages without replacing raw data.",
      "Context Mesh connects only relevant candidates to the current request.",
      "T-cell Admission decides what may act in the current turn.",
      "Knowledge Loop captures growth candidates for review, not auto-promotion.",
      "Task Packet is the only action-bearing work unit.",
    ],
    stateBoundaries: [
      {
        id: "raw_data",
        mayDo: ["preserve", "quote_with_source_limits", "recompile"],
        mayNotDo: ["act_as_memory_truth", "mutate_runtime_behavior"],
      },
      {
        id: "wiki_page",
        mayDo: ["summarize", "link", "help_retrieval"],
        mayNotDo: ["replace_source", "become_answer_anchor_without_admission"],
      },
      {
        id: "context_hit",
        mayDo: ["support_current_turn", "explain_provenance"],
        mayNotDo: ["override_current_user_instruction", "skip_tcell_admission"],
      },
      {
        id: "admitted_tcell",
        mayDo: ["guide_current_action", "carry_trace", "set_invalid_conditions"],
        mayNotDo: ["self_promote", "execute_external_action"],
      },
      {
        id: "knowledge_loop_candidate",
        mayDo: ["enter_review_queue", "propose_replay"],
        mayNotDo: ["durable_memory_promotion", "live_rule_mutation"],
      },
    ],
    openClawReuse: {
      keep: [
        "memory-state plugin slot and persistence discipline",
        "memory search as fast candidate recall",
        "memory-wiki source/entity/concept/synthesis/report vault",
        "context-engine delegate/registry contract",
        "after-turn hook position as capture candidate point",
      ],
      reframe: [
        "OpenClaw memory is candidate recall, not operating authority.",
        "Context engine assembly must be preceded by Context Mesh and T-cell admission.",
        "Memory promotion must be review/replay/authority gated.",
      ],
      landingZones: [
        "src/plugins/memory-state.ts",
        "src/agents/memory-search.ts",
        "extensions/memory-wiki/README.md",
        "src/context-engine/registry.ts",
        "src/context-engine/types.ts",
        "src/agents/embedded-agent-runner/run/attempt.ts",
      ],
    },
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildMemoryReplayApplyGate() {
  return {
    schema: "gpao_t.memory_replay_apply_gate.v0_1",
    status: "read_only_gate_ready",
    sequence: [
      "source_truth",
      "memory_candidate",
      "replay_evidence",
      "apply_request",
      "rollback_receipt",
    ],
    gates: [
      {
        id: "source_truth",
        mayPassWhen: [
          "candidate is linked to an OpenClaw session row, checkpoint, or raw source record",
          "source can be inspected without mutating live session state",
        ],
        blocks: ["source-less summary memory", "stale context overriding the current user target"],
      },
      {
        id: "memory_candidate",
        mayPassWhen: [
          "candidate is review-only",
          "candidate explains its current-turn benefit and invalid condition",
        ],
        blocks: ["automatic durable promotion", "identity or rule mutation without replay"],
      },
      {
        id: "replay_evidence",
        mayPassWhen: [
          "before/after replay improves current-task accuracy, speed, or safety",
          "failure mode and rollback path are recorded",
        ],
        blocks: ["belief-only improvement claims", "unverified self-growth mutation"],
      },
      {
        id: "apply_request",
        mayPassWhen: [
          "scope is narrow and user-authority boundary is explicit",
          "session write, durable memory, or runtime rule mutation is separated by request type",
        ],
        blocks: ["bundled all-power approval", "external send or automation activation by implication"],
      },
      {
        id: "rollback_receipt",
        mayPassWhen: [
          "changed files or records are known",
          "rollback command or restoration path is documented before mutation",
        ],
        blocks: ["live mutation without recoverable evidence"],
      },
    ],
    currentLivePolicy: {
      sourceRead: "allowed",
      candidateReview: "allowed",
      replayEvidence: "required_before_apply",
      sessionWrite: "blocked_until_scoped_apply_request",
      durableMemoryPromotion: "blocked_until_user_approval_and_rollback",
      externalSend: "blocked",
    },
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildOpenClawSourceCallPathPass() {
  return {
    schema: "gpao_t.openclaw_source_call_path_pass.v0_1",
    status: "mapped_from_pure_source",
    path: [
      {
        step: "ui_submit",
        files: [
          "ui/src/pages/chat/chat-pane.ts",
          "ui/src/pages/chat/chat-state.ts",
          "ui/src/pages/chat/chat-send.ts",
          "ui/src/pages/chat/components/chat-composer.ts",
        ],
        evidence:
          "ChatPane owns per-pane state; chat-state wires handleSendChat; requestChatSend calls state.client.request('chat.send', ...).",
      },
      {
        step: "gateway_chat_send",
        files: ["src/gateway/server-methods/chat.ts", "src/gateway/call.ts"],
        evidence:
          "chatHandlers['chat.send'] is the WebChat turn boundary before admission, transcript recording, and dispatch.",
      },
      {
        step: "agent_dispatch",
        files: [
          "src/auto-reply/dispatch.ts",
          "src/agents/embedded-agent-runner/run.ts",
          "src/agents/embedded-agent-runner/run/attempt.ts",
        ],
        evidence:
          "dispatchInboundMessage and runEmbeddedAgent lead into attempt.ts where context-engine bootstrap/assemble/afterTurn are called.",
      },
      {
        step: "context_engine",
        files: [
          "src/context-engine/registry.ts",
          "src/context-engine/delegate.ts",
          "src/context-engine/types.ts",
          "src/context-engine/legacy.ts",
        ],
        evidence:
          "Context engine is pluggable, but the legacy engine is mostly pass-through; GPAO-T semantics belong here.",
      },
      {
        step: "tool_and_approval",
        files: [
          "src/gateway/server-methods/exec-approval.ts",
          "src/gateway/operator-approvals-client.ts",
          "src/security/dangerous-tools.ts",
          "src/gateway/method-scopes.ts",
        ],
        evidence:
          "Approval exists but must be upgraded from method/tool-level control to GPAO-T authority classes.",
      },
      {
        step: "transcript_and_session",
        files: [
          "src/gateway/cli-session-history.ts",
          "src/sessions/session-key-utils.ts",
          "ui/src/pages/chat/chat-history.ts",
          "ui/src/pages/chat/chat-gateway.ts",
          "ui/src/pages/chat/session-message-cache.ts",
        ],
        evidence:
          "Transcript/session surfaces are chat-centric and should become Task Packet plus conversation trace.",
      },
    ],
    mutationCandidates: [
      "insert GpaoTaskPacket read model before requestChatSend payload is built",
      "add GpaoControlClient wrapper over GatewayBrowserClient.request",
      "add GpaoAppContext state derived from session, context, authority, and progress",
      "render active target strip and progress lane inside ChatPane without breaking composer",
      "add right inspector as a pane-adjacent surface in ChatPage split layout",
    ],
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildDashboardForkMap() {
  return {
    schema: "gpao_t.dashboard_fork_map.v0_1",
    status: "lab_patch_ready",
    keep: [
      "OpenClaw Gateway Dashboard shell",
      "left navigation and session list primitives",
      "ChatPage split layout",
      "ChatPane per-pane lifecycle",
      "composer, queue, retry, abort, reconnect, model controls",
      "session drag/drop and persisted split layout",
    ],
    introduce: [
      {
        component: "GpaoControlClient",
        target: "ui/src/pages/chat/gpao-control-client.ts",
        purpose: "Typed wrapper over GatewayBrowserClient.request for GPAO-T read models.",
      },
      {
        component: "GpaoAppContext",
        target: "ui/src/pages/chat/gpao-app-context.ts",
        purpose: "Pane/session/task/context/authority/progress read-model builder.",
      },
      {
        component: "GpaoWorkPane",
        target: "ui/src/pages/chat/chat-pane.ts",
        purpose: "Reinterpret ChatPane as work pane without replacing composer or run lifecycle.",
      },
      {
        component: "GpaoInspector",
        target: "ui/src/pages/chat/components/gpao-inspector.ts",
        purpose: "Right inspector tabs for Context, Authority, Progress, Sources, Trace.",
      },
    ],
    firstSlice: [
      "active_target_strip",
      "compact_progress_lane",
      "right_inspector_context_authority_progress",
      "local_first_latency_signal",
    ],
    visualRules: [
      "Do not turn the OS surface into nested cards.",
      "Use planes, strips, lanes, tabs, drawers, sheets, and inspectors.",
      "Keep the composer bound to the active pane.",
      "Text must fit on desktop and mobile.",
      "Multi-pane work rhythm must remain visible on desktop and compact on mobile.",
    ],
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildLabUiSlicePackage() {
  return {
    schema: "gpao_t.openclaw_lab_ui_slice_package.v0_1",
    status: "patch_package_ready",
    patchFile: "docs/03-engineering/patches/openclaw-dashboard-gpao-workpane-slice-001.patch",
    targetFiles: [
      "ui/src/pages/chat/gpao-app-context.ts",
      "ui/src/pages/chat/gpao-control-client.ts",
      "ui/src/pages/chat/components/gpao-inspector.ts",
      "ui/src/pages/chat/chat-pane.ts",
      "ui/src/pages/chat/chat-page.ts",
      "ui/src/styles.css",
    ],
    acceptance: [
      "Active target strip visible per active pane.",
      "Progress lane shows current goal, Context Mesh, authority, and latency state.",
      "Right inspector exposes Context / Authority / Progress without hiding composer.",
      "No live OpenClaw mutation is required to inspect the patch.",
      "Patch can be reviewed and applied to a lab/fork before live.",
    ],
    liveApplyPackage: {
      status: "approval_ready_after_lab_qa",
      requires: [
        "apply patch to a fork or lab copy",
        "run OpenClaw UI checks",
        "desktop screenshot QA",
        "mobile screenshot QA",
        "rollback path",
        "live file path confirmation",
      ],
      stopLines: AUTHORITY_STOP_LINES,
    },
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildOpenClawAbsorptionOneStopPackage() {
  return {
    schema: "gpao_t.openclaw_absorption_one_stop_package.v0_1",
    status: "local_package_ready_live_not_mutated",
    phases: [
      buildMemoryKnowledgeControlArchitecture(),
      buildMemoryReplayApplyGate(),
      buildOpenClawSourceCallPathPass(),
      buildDashboardForkMap(),
      buildLabUiSlicePackage(),
    ],
    flowKeeper: {
      status: "on-track",
      driftCheck: {
        openClawInternalAbsorption: "pass",
        labBeforeLive: "pass",
        sidecarMockDrift: "pass",
        currentUserInstructionPreserved: "pass",
      },
      evidence: [
        "memory knowledge architecture contract",
        "memory replay apply gate",
        "source call-path pass",
        "dashboard fork map",
        "lab UI slice patch package",
      ],
      missingBeforeLive: [
        "patch applied to lab/fork",
        "OpenClaw UI test run",
        "desktop/mobile visual QA after patch",
        "confirmed live OpenClaw file path",
      ],
      nextAction: "apply patch package to a lab/fork, run UI checks, then prepare live apply diff.",
    },
    authority: {
      sourceAuthority: SOURCE_AUTHORITY,
      stopLines: AUTHORITY_STOP_LINES,
      liveMutationAllowed: false,
    },
  };
}

export function buildOpenClawLiveTurnHookReadinessGate({
  root = process.cwd(),
  liveDist = DEFAULT_LIVE_DIST,
  labDist = resolve(root, "..", DEFAULT_LAB_DIST),
} = {}) {
  const bridgePolicy = buildLiveTurnAbsorptionPolicy();
  const applyScript = "tools/apply-openclaw-live-gpao-bridge-patch.mjs";
  const applyScriptPath = resolve(root, applyScript);
  const applyScriptText = existsSync(applyScriptPath) ? readFileSync(applyScriptPath, "utf8") : "";
  const livePatchExecutorContract = {
    dryRunDefaultRequired: applyScriptText.includes("dry_run_manifest_ready_live_not_mutated"),
    applyFlagRequired: applyScriptText.includes("--apply"),
    approvalTokenRequired: applyScriptText.includes("REQUIRED_APPROVAL_TOKEN"),
    preApplyManifestRequired: applyScriptText.includes("pre-apply-manifest.json"),
    currentHashGuardRequired: applyScriptText.includes("assertCurrentHash"),
    postApplyReadbackRequired: applyScriptText.includes("applied_readback_recorded"),
  };
  const findings = [];

  if (bridgePolicy.status !== "ready") findings.push("live_turn_absorption_policy_not_ready");
  if (!existsSync(applyScriptPath)) findings.push("live_patch_apply_script_missing");
  if (!livePatchExecutorContract.dryRunDefaultRequired) findings.push("live_patch_dry_run_default_missing");
  if (!livePatchExecutorContract.applyFlagRequired) findings.push("live_patch_apply_flag_missing");
  if (!livePatchExecutorContract.approvalTokenRequired) findings.push("live_patch_approval_token_missing");
  if (!livePatchExecutorContract.preApplyManifestRequired) findings.push("live_patch_pre_apply_manifest_missing");
  if (!livePatchExecutorContract.currentHashGuardRequired) findings.push("live_patch_current_hash_guard_missing");
  if (!livePatchExecutorContract.postApplyReadbackRequired) findings.push("live_patch_readback_missing");

  return {
    schema: "gpao_t.openclaw_live_turn_hook_readiness_gate.v0_1",
    status: findings.length ? "review" : "ready_for_authorized_live_hook_stage",
    generatedAt: new Date().toISOString(),
    purpose:
      "Prepare the narrow live OpenClaw/Telegram hook stage without executing live mutation in this slice.",
    bridgeContract: {
      policy: bridgePolicy.schema,
      originalMessageMutation: bridgePolicy.invariants.originalMessageMutation,
      providerBehaviorChange: bridgePolicy.invariants.providerBehaviorChange,
      postAnswerReplay: bridgePolicy.invariants.postAnswerReplay,
      autoGrowth: bridgePolicy.invariants.autoGrowth,
      durableMemoryPromotion: bridgePolicy.invariants.durableMemoryPromotion,
    },
    targetPaths: {
      liveDist,
      labDist,
      applyScript,
      likelyLiveFiles: [
        `${liveDist}/server-methods-*.js`,
        `${liveDist}/core-descriptors-*.js`,
        `${liveDist}/gpao-t-*.js`,
        `${liveDist}/control-ui/`,
      ],
      sourceCallPath: buildOpenClawSourceCallPathPass().path.map((item) => ({
        step: item.step,
        files: item.files,
      })),
    },
    livePatchExecutorContract,
    hookSequence: [
      {
        id: "pre_send_preflight",
        hostBoundary: "chat.send before provider dispatch",
        requiredAction:
          "Call GPAO-T live-turn bridge with original message, session key, run id, and source=openclaw_web or telegram_direct.",
        invariant: "Original message payload is sent unchanged.",
      },
      {
        id: "post_answer_replay",
        hostBoundary: "assistant answer completed or failed",
        requiredAction:
          "Call the same bridge trace with answerText and ackStatus so post-answer replay and local growth can be recorded.",
        invariant: "Durable memory and OpenClaw memory writes remain blocked.",
      },
      {
        id: "control_center_trace",
        hostBoundary: "Control Center latest live-turn lane",
        requiredAction:
          "Expose bridge id, run id, session key, source kind, preflight id, answer replay id, and auto-growth id.",
        invariant: "A tester can see whether the live turn passed through GPAO-T.",
      },
    ],
    diffPlan: {
      mode: "preview_first",
      requiredBeforeApply: [
        "confirm live dist hash/readback",
        "create timestamped backup directory",
        "generate file-level diff against staged hook patch",
        "verify search guards before replacement",
        "write patch manifest with changed files and hashes",
      ],
      forbiddenInThisGate: [
        "write live OpenClaw files",
        "restart Gateway",
        "send Telegram message",
        "change model/provider behavior",
      ],
    },
    rollbackPlan: {
      requiredBeforeApply: [
        "backup every touched live file",
        "record SHA-256 before and after",
        "document restore command",
        "verify post-rollback health and dashboard load",
      ],
      rollbackMustRestore: [
        "server methods bundle",
        "core descriptors bundle",
        "GPAO-T bridge bundle",
        "control-ui directory",
      ],
    },
    restartPlan: {
      status: "approval_required",
      allowedNow: false,
      stepsAfterApproval: [
        "stop only the OpenClaw Gateway process or LaunchAgent identified by readback",
        "start it with the same profile/state-dir",
        "verify /health or dashboard load",
        "verify no duplicate Gateway process remains",
      ],
    },
    visualQaPlan: {
      status: "required_after_authorized_apply",
      viewports: ["desktop dashboard", "mobile/narrow dashboard"],
      requiredEvidence: [
        "Safari dashboard screenshot after restart",
        "Control Center live-turn lane screenshot",
        "browser console check with no new bridge errors",
        "one controlled live-turn smoke trace visible in Control Center",
      ],
    },
    smokePlan: {
      localBeforeLive: [
        "gpao-t live-turn run-answer <message> ::: <answer>",
        "GET /live-turn/absorption/summary",
        "GET /live-turn/absorption/verify",
      ],
      afterAuthorizedLiveHook: [
        "send one controlled OpenClaw web chat turn",
        "send or observe one controlled Telegram direct turn only if user approves real Telegram path",
        "confirm same run id links preflight, answer replay, and local auto-growth",
      ],
    },
    authorityBoundary: {
      liveMutationExecuted: false,
      liveMutationAllowedByThisGate: false,
      requiresExplicitOwnerApprovalBeforeApply: true,
      gatewayRestartAllowedNow: false,
      telegramExternalSendAllowedNow: false,
      providerBehaviorChangeAllowedNow: false,
      durableMemoryPromotionAllowedNow: false,
      compatibilityMemoryWriteAllowedNow: false,
      publicReleaseAllowedNow: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Repair readiness findings before preparing the live hook patch."
      : "Prepare a preview diff and rollback manifest; do not write live OpenClaw files until explicit apply approval.",
  };
}

export function verifyOpenClawLiveTurnHookReadinessGate({
  root = process.cwd(),
  liveDist,
  labDist,
} = {}) {
  const gate = buildOpenClawLiveTurnHookReadinessGate({ root, liveDist, labDist });
  const findings = [...gate.findings];
  if (gate.bridgeContract.originalMessageMutation !== false) findings.push("original_message_mutation_open");
  if (gate.bridgeContract.providerBehaviorChange !== "blocked_in_v1") {
    findings.push("provider_behavior_change_open");
  }
  if (gate.authorityBoundary.liveMutationExecuted !== false) findings.push("live_mutation_already_executed");
  if (gate.authorityBoundary.liveMutationAllowedByThisGate !== false) {
    findings.push("live_mutation_allowed_by_readiness_gate");
  }
  if (gate.authorityBoundary.gatewayRestartAllowedNow !== false) findings.push("gateway_restart_open");
  if (gate.authorityBoundary.telegramExternalSendAllowedNow !== false) {
    findings.push("telegram_external_send_open");
  }
  if (!gate.diffPlan.requiredBeforeApply.includes("create timestamped backup directory")) {
    findings.push("backup_requirement_missing");
  }
  if (!gate.visualQaPlan.requiredEvidence.includes("Control Center live-turn lane screenshot")) {
    findings.push("visual_qa_live_turn_lane_missing");
  }
  return {
    schema: "gpao_t.openclaw_live_turn_hook_readiness_gate_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "live turn bridge contract",
      "OpenClaw source call path",
      "diff and backup plan",
      "rollback plan",
      "restart approval boundary",
      "visual QA plan",
      "controlled smoke plan",
    ],
    liveMutationAllowed: gate.authorityBoundary.liveMutationAllowedByThisGate,
    gatewayRestartAllowedNow: gate.authorityBoundary.gatewayRestartAllowedNow,
    telegramExternalSendAllowedNow: gate.authorityBoundary.telegramExternalSendAllowedNow,
    nextSafeAction: gate.nextSafeAction,
  };
}

export function verifyOpenClawAbsorptionOneStopPackage(
  pkg = buildOpenClawAbsorptionOneStopPackage(),
) {
  const phaseSchemas = new Set(pkg.phases?.map((phase) => phase.schema) || []);
  const requiredSchemas = [
    "gpao_t.memory_knowledge_control_architecture.v0_1",
    "gpao_t.memory_replay_apply_gate.v0_1",
    "gpao_t.openclaw_source_call_path_pass.v0_1",
    "gpao_t.dashboard_fork_map.v0_1",
    "gpao_t.openclaw_lab_ui_slice_package.v0_1",
  ];
  const missing = requiredSchemas.filter((schema) => !phaseSchemas.has(schema));
  const liveMutationAllowed =
    pkg.authority?.liveMutationAllowed === true ||
    pkg.phases?.some((phase) => phase.authority?.liveMutationAllowed === true);
  return {
    schema: "gpao_t.openclaw_absorption_one_stop_verification.v0_1",
    status: missing.length === 0 && !liveMutationAllowed ? "ready" : "blocked",
    missing,
    liveMutationAllowed,
    nextAction:
      missing.length === 0 && !liveMutationAllowed
        ? "lab/fork patch application and visual QA"
        : "repair package before any lab or live step",
  };
}
