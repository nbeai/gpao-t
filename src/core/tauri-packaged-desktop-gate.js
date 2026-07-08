import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrowserLocalAppShellContract, verifyBrowserLocalAppShell } from "./browser-local-app-shell.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const FIRST_SLICE_ALLOWED_ACTIONS = [
  "load_loopback_app_shell",
  "read_health",
  "read_control_center_state",
  "read_app_shell_state",
  "navigate_panels",
  "inspect_evidence",
  "show_failure_recovery_state",
  "show_authority_boundary",
  "show_next_safe_action",
  "run_screenshot_qa",
];

const BLOCKED_AUTHORITY_ACTIONS = [
  "POST routes",
  "connector activation",
  "model activation",
  "tool activation",
  "OAuth setup",
  "token or secret storage",
  "external send",
  "install execution",
  "update execution",
  "rollback execution",
  "durable memory promotion",
  "self-growth apply",
  "deployment",
  "messenger surfaces",
  "recurring automation",
  "destructive file operations",
  "public release",
];

const FAILURE_RECOVERY_STATES = [
  {
    id: "tauri_toolchain_missing",
    label: "Tauri toolchain missing",
    recovery: "Keep packaged-shell implementation blocked; use browser-local app-shell checks until Rust/Tauri prerequisites are explicitly installed.",
  },
  {
    id: "loopback_runtime_unavailable",
    label: "Loopback runtime unavailable",
    recovery: "Show a local recovery message and use `gpao-t control serve-check`; do not retry silently or start a persistent daemon.",
  },
  {
    id: "health_not_ready",
    label: "Health not ready",
    recovery: "Show `/health` diagnostics and keep all shell actions read-only or blocked.",
  },
  {
    id: "app_shell_state_invalid",
    label: "App-shell state invalid",
    recovery: "Show `/app-shell/verify` findings and block packaged shell progression.",
  },
  {
    id: "ipc_not_allowed",
    label: "IPC not allowed in first slice",
    recovery: "Keep Tauri commands disabled until each command has authority, audit, replay, and rollback contracts.",
  },
  {
    id: "permission_blocked",
    label: "OS permission blocked",
    recovery: "Show the blocked permission and require manual user approval before any later local capability is opened.",
  },
  {
    id: "overflow_regression",
    label: "Visual overflow regression",
    recovery: "Block packaged-shell quality claims until desktop and mobile screenshot QA pass.",
  },
  {
    id: "authority_hidden",
    label: "Authority boundary hidden",
    recovery: "Block packaged-shell progression until authority boundary text is visible.",
  },
  {
    id: "next_action_hidden",
    label: "Next safe action hidden",
    recovery: "Block packaged-shell progression until the next safe action is visible in desktop and mobile views.",
  },
];

const SCREENSHOT_QA = {
  requiredViewports: [
    { label: "desktop", width: 1440, height: 960 },
    { label: "mobile", width: 390, height: 844 },
  ],
  requiredSignals: [
    "nonblank_viewport",
    "panel_navigation_visible",
    "state_lanes_visible",
    "panel_drilldown_visible",
    "evidence_inspector_visible",
    "failure_recovery_state_visible",
    "no_horizontal_overflow",
    "authority_boundary_visible",
    "next_safe_action_visible",
    "mobile_fixed_topbar_action_or_decision_strip_visible",
    "no_external_activation",
  ],
  blockedSignals: [
    "blank_webview",
    "script_error_blocks_reader",
    "external_navigation",
    "account_connection_prompt",
    "token_prompt",
    "install_update_rollback_prompt",
    "send_or_deploy_prompt",
    "hidden_authority_boundary",
  ],
};

const PLANNING_REVIEW_EVIDENCE = [
  "docs/03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json",
  "docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json",
  "docs/03-verification/evidence/control-center-approval-preview-ux-qa-2026-07-09.json",
];

const CLOSED_READ_ONLY_SURFACES = [
  {
    id: "local_control_center_static_reader",
    status: "closed",
    evidence: "control snapshot, summary, ui-contract, ui-snapshot, ui-validate, static HTML, responsive visual QA",
    authority: "no_script_no_external_activation_no_mutation",
  },
  {
    id: "browser_local_app_shell",
    status: "closed",
    evidence: "GET /health and GET /control-center/* based read-mostly app-shell with desktop/mobile screenshot baseline",
    authority: "GET_only_POST_blocked_read_mostly",
  },
  {
    id: "read_mostly_tauri_shell_source_slice",
    status: "closed",
    evidence: "src-tauri source scaffold, tauri-shell/index.html, packaged-shell visual QA baseline",
    authority: "source_only_no_build_no_ipc_no_packaging",
  },
  {
    id: "install_update_rollback_readiness",
    status: "closed",
    evidence: "readiness gate, prerequisite doctor, dry-run plan/verify/preview, approval storage/write-gate design",
    authority: "readiness_and_preview_only_no_execution",
  },
  {
    id: "approval_preview_user_understanding",
    status: "closed",
    evidence: "Control Center Approval / Preview visual UX QA with five stages and calm locked-state actions",
    authority: "preview_only_no_approval_write_no_dry_run_invocation",
  },
];

const STILL_BLOCKED_DESKTOP_BOUNDARIES = [
  "approval record write",
  "dry-run invocation",
  "command execution from dry-run plans",
  "file mutation from approval or install executors",
  "Tauri build",
  "dependency install",
  "bundle/signing/installer creation",
  "install execution",
  "update execution",
  "rollback execution",
  "local IPC commands",
  "external network/download",
  "connector/model/tool activation",
  "OAuth/token/secret storage",
  "deployment/public release",
  "messenger surfaces",
  "recurring automation",
];

export function buildTauriPackagedDesktopGate({ browserLocalContract = buildBrowserLocalAppShellContract() } = {}) {
  return {
    schema: "gpao_t.tauri_packaged_desktop_gate.v0_1",
    status: "ready",
    gateClosed: true,
    packagedDesktopImplementationStarted: false,
    gateKind: "packaged_desktop_shell_transition",
    targetShell: "tauri",
    goal:
      "Close the safe transition gate from browser-local app-shell to a first read-mostly packaged desktop shell without implementing the full app.",
    entryRequirements: [
      "browser_local_app_shell_contract_ready",
      "app_shell_state_lanes_ready",
      "app_shell_screenshot_baseline_ready",
      "local_git_rollback_substrate_ready",
      "GET_only_read_mostly_invariants_preserved",
      "authority_boundary_visible",
      "next_safe_action_visible",
    ],
    shellBoundary: {
      browserLocal: {
        transport: browserLocalContract.runtimeBoundary.transport,
        role: "proven_read_surface_and_visual_regression_anchor",
        routes: [
          "GET /health",
          "GET /app-shell",
          "GET /app-shell/contract",
          "GET /app-shell/state",
          "GET /app-shell/verify",
          "GET /control-center/*",
        ],
        mutation: "blocked",
      },
      tauriFirstSlice: {
        transport: "packaged_webview_loading_loopback_read_surfaces",
        localIpc: "blocked_in_first_tauri_slice",
        tauriCommands: "disabled_until_per_command_authority_audit_replay_rollback_contract",
        persistentDaemon: "blocked",
        externalNavigation: "blocked",
        mutation: "blocked",
      },
      futureHybrid: {
        readSurfaces: "127.0.0.1_http_or_packaged_static_snapshot",
        localActions: "tauri_command_ipc_only_after_explicit_gate",
        commandRequirements: [
          "human_approval_boundary",
          "audit_record",
          "replay_fixture",
          "rollback_plan",
          "failure_recovery_state",
          "screenshot_or_interaction_qa",
        ],
      },
    },
    firstSlice: {
      name: "tauri_read_mostly_shell_gate",
      implementationAllowedNow: false,
      allowedActions: FIRST_SLICE_ALLOWED_ACTIONS,
      userVisibleBehavior: [
        "Open a packaged desktop window only after the gate is accepted.",
        "Show the same app-shell state lanes and panel drilldowns as the browser-local shell.",
        "Show authority boundary and next safe action before any future command surface.",
        "Show failure/recovery state when loopback runtime, health, app-shell state, permission, or visual QA fails.",
      ],
      allowedRoutes: [
        "GET /health",
        "GET /app-shell",
        "GET /app-shell/contract",
        "GET /app-shell/state",
        "GET /app-shell/verify",
        "GET /control-center",
        "GET /control-center/summary",
        "GET /control-center/ui-validate",
      ],
      blockedRoutes: browserLocalContract.blockedPostRoutes,
    },
    blockedAuthorityActions: BLOCKED_AUTHORITY_ACTIONS,
    authorityBoundary: {
      mutationAuthority: "none_in_first_tauri_slice",
      connectorActivation: "blocked",
      externalModelCall: "blocked",
      externalToolExecution: "blocked",
      oauthTokenSecretStorage: "blocked",
      externalSend: "blocked",
      installUpdateRollback: "blocked",
      durableMemoryPromotion: "blocked",
      selfGrowthApply: "blocked",
      deployment: "blocked",
      messenger: "blocked",
      automation: "blocked",
    },
    sourceControlRollback: {
      sourceRollback: "local_git_required_before_tauri_slice",
      currentBaselineRequired: true,
      runtimeState: ".gpao-t remains ignored and is not packaged as source",
      generatedEvidence: "docs/03-verification/evidence or ignored local QA artifacts",
      rollbackExecutor: "blocked_until_install_update_rollback_executor_gate",
    },
    screenshotQa: SCREENSHOT_QA,
    installUpdateRollbackOrder: [
      "1_browser_local_app_shell_proof",
      "2_tauri_packaged_desktop_gate",
      "3_read_mostly_tauri_shell_slice",
      "4_packaged_shell_screenshot_qa",
      "5_install_update_rollback_readiness_review",
      "6_prerequisite_doctor_dry_run_preview_approval_design",
      "7_approval_preview_ux_integration",
      "8_packaged_desktop_planning_review_stop_line",
      "9_return_to_user_facing_core_work_surface",
      "10_signed_or_distributed_package_gate_after_approval",
      "11_install_update_rollback_executor_gate_after_approval",
    ],
    failureRecoveryStates: FAILURE_RECOVERY_STATES,
    nextSafeAction:
      "After the packaged desktop planning review, return to the user-facing GPAO-T core work surface; do not execute packaged desktop build, IPC, mutation, connectors, models, tools, installer, updater, rollback, self-growth apply, deployment, messenger, or automation until the relevant explicit gate is closed.",
  };
}

export function verifyTauriPackagedDesktopGate({ gate = buildTauriPackagedDesktopGate(), appShellVerification = verifyBrowserLocalAppShell() } = {}) {
  const findings = [];

  if (gate.schema !== "gpao_t.tauri_packaged_desktop_gate.v0_1") findings.push("invalid_gate_schema");
  if (gate.targetShell !== "tauri") findings.push("target_shell_not_tauri");
  if (gate.firstSlice.implementationAllowedNow !== false) findings.push("tauri_implementation_allowed_too_early");
  if (gate.firstSlice.allowedRoutes.some((route) => !route.startsWith("GET "))) findings.push("non_get_route_allowed");
  if (!gate.firstSlice.blockedRoutes.includes("/turn")) findings.push("missing_turn_post_block");
  if (gate.shellBoundary.tauriFirstSlice.localIpc !== "blocked_in_first_tauri_slice") findings.push("local_ipc_not_blocked");
  if (gate.shellBoundary.tauriFirstSlice.mutation !== "blocked") findings.push("tauri_mutation_not_blocked");
  if (!gate.blockedAuthorityActions.includes("OAuth setup")) findings.push("oauth_not_blocked");
  if (!gate.blockedAuthorityActions.includes("token or secret storage")) findings.push("token_storage_not_blocked");
  if (!gate.blockedAuthorityActions.includes("install execution")) findings.push("install_execution_not_blocked");
  if (!gate.blockedAuthorityActions.includes("rollback execution")) findings.push("rollback_execution_not_blocked");
  if (!gate.blockedAuthorityActions.includes("durable memory promotion")) findings.push("durable_memory_promotion_not_blocked");
  if (!gate.blockedAuthorityActions.includes("self-growth apply")) findings.push("self_growth_apply_not_blocked");
  if (gate.authorityBoundary.mutationAuthority !== "none_in_first_tauri_slice") findings.push("mutation_authority_open");
  if (gate.sourceControlRollback.sourceRollback !== "local_git_required_before_tauri_slice") findings.push("source_rollback_not_local_git");
  if (!gate.screenshotQa.requiredSignals.includes("state_lanes_visible")) findings.push("state_lanes_not_required_for_visual_qa");
  if (!gate.screenshotQa.requiredSignals.includes("mobile_fixed_topbar_action_or_decision_strip_visible")) {
    findings.push("mobile_action_line_not_required");
  }
  if (!gate.installUpdateRollbackOrder.includes("5_install_update_rollback_readiness_review")) {
    findings.push("install_update_rollback_order_missing_readiness_review");
  }
  if (!gate.installUpdateRollbackOrder.includes("8_packaged_desktop_planning_review_stop_line")) {
    findings.push("install_update_rollback_order_missing_planning_review_stop_line");
  }
  if (!gate.installUpdateRollbackOrder.includes("9_return_to_user_facing_core_work_surface")) {
    findings.push("install_update_rollback_order_missing_user_facing_core_return");
  }
  if (!gate.failureRecoveryStates.some((state) => state.id === "loopback_runtime_unavailable")) {
    findings.push("missing_loopback_runtime_recovery_state");
  }
  if (!gate.failureRecoveryStates.some((state) => state.id === "ipc_not_allowed")) {
    findings.push("missing_ipc_block_recovery_state");
  }
  if (appShellVerification.status !== "ready") findings.push("browser_local_app_shell_not_ready");

  return {
    schema: "gpao_t.tauri_packaged_desktop_gate_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    appShellVerificationStatus: appShellVerification.status,
    authorityBoundary: gate.authorityBoundary,
    screenshotQa: gate.screenshotQa,
    nextSafeAction: findings.length
      ? "Fix Tauri gate findings before opening any packaged desktop implementation slice."
      : "Return to the user-facing GPAO-T core work surface after the packaged desktop planning review; keep packaged desktop build, IPC, mutation, connectors, models, tools, installer, updater, rollback execution, deployment, messenger, and automation blocked.",
  };
}

export function buildPackagedDesktopPlanningReview({
  root = PROJECT_ROOT,
  tauriGate = buildTauriPackagedDesktopGate(),
  tauriGateVerification = verifyTauriPackagedDesktopGate({ gate: tauriGate }),
} = {}) {
  const evidenceFiles = PLANNING_REVIEW_EVIDENCE.map((path) => ({
    path,
    status: existsSync(resolve(root, path)) ? "present" : "missing",
  }));
  const missingEvidence = evidenceFiles.filter((file) => file.status !== "present").map((file) => file.path);
  const minimumConditions = [
    {
      id: "regression_anchor",
      status: tauriGateVerification.status,
      condition: "Browser-local app-shell and read-mostly Tauri shell remain verified regression anchors.",
    },
    {
      id: "visual_evidence",
      status: missingEvidence.length ? "blocked" : "ready",
      condition: "Desktop/mobile screenshot QA evidence exists for app-shell, packaged shell, and approval/preview UX.",
    },
    {
      id: "authority_boundary",
      status: "ready",
      condition: "Write, invocation, build, install/update/rollback, IPC, network, and activation authority remain blocked.",
    },
    {
      id: "rollback_substrate",
      status: "ready",
      condition: "Source rollback remains local git; runtime rollback remains blocked until snapshot export/import exists.",
    },
    {
      id: "user_facing_core_return",
      status: "ready",
      condition: "Next product work should return to the user-facing core work surface instead of extending meta-gates.",
    },
  ];
  const findings = [
    ...missingEvidence.map((path) => `missing_evidence:${path}`),
  ];

  if (tauriGateVerification.status !== "ready") findings.push("tauri_gate_not_ready");

  return {
    schema: "gpao_t.packaged_desktop_planning_review.v0_1",
    status: findings.length ? "blocked" : "ready",
    reviewKind: "packaged_desktop_planning_review",
    goal:
      "Summarize the Local Control Center, app-shell, and Tauri substrate before moving to the next larger product stage without opening execution authority.",
    closedSurfaces: CLOSED_READ_ONLY_SURFACES,
    stillBlockedBoundaries: STILL_BLOCKED_DESKTOP_BOUNDARIES,
    evidenceFiles,
    minimumConditionsBeforePackagedDesktop: minimumConditions,
    readinessDecision: {
      localControlCenterAppShellTauriSubstrate: findings.length ? "review_blocked" : "ready_for_next_planning_step",
      packagedDesktopBuild: "not_allowed_yet",
      installUpdateRollbackExecution: "not_allowed_yet",
      approvalWriteOrDryRunInvocation: "not_allowed_yet",
      reason:
        "The read-only/preview substrate is coherent enough to stop adding meta-gates, but mutation/build/install authority is still intentionally closed.",
    },
    returnToUserFacingCoreTiming: {
      decision: "return_after_this_review",
      nextProductSurface:
        "user-facing core work surface that feels like the GPAO-T body: workspace thread, state lanes, authority center, memory/context view, model/tool routing view, and next safe action.",
      rationale:
        "The substrate now has enough read-only evidence. More planning gates would delay the product's felt operating surface without improving safety.",
    },
    stopLine: {
      metaGateRepetition: "stop_after_this_review",
      allowedNextMetaWork:
        "Only fix a failing prerequisite or define a narrow authority gate when a real mutating action is explicitly approved.",
      blockedNextMetaWork: [
        "another approval storage/write-gate design",
        "another dry-run invocation meta-gate",
        "another packaged desktop readiness document without user-facing core progress",
      ],
    },
    authorityBoundary: {
      approvalRecordWrite: "blocked",
      dryRunInvocation: "blocked",
      commandExecution: "blocked",
      fileMutationFromExecutors: "blocked",
      tauriBuild: "blocked",
      dependencyInstall: "blocked",
      installUpdateRollbackExecution: "blocked",
      localIpc: "blocked",
      externalNetwork: "blocked",
      connectorModelToolActivation: "blocked",
    },
    findings,
    nextSafeAction:
      "Stop extending meta-gates and move to the user-facing GPAO-T core work surface plan/build, while keeping approval write, dry-run invocation, Tauri build, install/update/rollback, IPC, external network, and connector/model/tool activation blocked.",
  };
}

export function verifyPackagedDesktopPlanningReview({
  review = buildPackagedDesktopPlanningReview(),
} = {}) {
  const findings = [];

  if (review.schema !== "gpao_t.packaged_desktop_planning_review.v0_1") findings.push("invalid_review_schema");
  if (review.status !== "ready") findings.push("planning_review_not_ready");
  if (!review.closedSurfaces.some((surface) => surface.id === "approval_preview_user_understanding")) {
    findings.push("approval_preview_surface_not_recorded");
  }
  if (!review.closedSurfaces.some((surface) => surface.id === "read_mostly_tauri_shell_source_slice")) {
    findings.push("tauri_shell_surface_not_recorded");
  }
  if (!review.stillBlockedBoundaries.includes("approval record write")) findings.push("approval_write_not_blocked");
  if (!review.stillBlockedBoundaries.includes("dry-run invocation")) findings.push("dry_run_invocation_not_blocked");
  if (!review.stillBlockedBoundaries.includes("Tauri build")) findings.push("tauri_build_not_blocked");
  if (!review.stillBlockedBoundaries.includes("install execution")) findings.push("install_execution_not_blocked");
  if (!review.stillBlockedBoundaries.includes("rollback execution")) findings.push("rollback_execution_not_blocked");
  if (!review.stillBlockedBoundaries.includes("connector/model/tool activation")) findings.push("activation_not_blocked");
  if (!review.minimumConditionsBeforePackagedDesktop.some((condition) => condition.id === "user_facing_core_return")) {
    findings.push("missing_user_facing_core_return_condition");
  }
  if (review.readinessDecision.packagedDesktopBuild !== "not_allowed_yet") findings.push("packaged_build_opened");
  if (review.readinessDecision.approvalWriteOrDryRunInvocation !== "not_allowed_yet") {
    findings.push("approval_or_invocation_opened");
  }
  if (review.returnToUserFacingCoreTiming.decision !== "return_after_this_review") {
    findings.push("does_not_return_to_user_facing_core");
  }
  if (review.stopLine.metaGateRepetition !== "stop_after_this_review") findings.push("missing_meta_gate_stop_line");
  if (review.authorityBoundary.localIpc !== "blocked") findings.push("local_ipc_not_blocked");
  if (review.authorityBoundary.externalNetwork !== "blocked") findings.push("external_network_not_blocked");

  return {
    schema: "gpao_t.packaged_desktop_planning_review_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: review.closedSurfaces.map((surface) => surface.id),
    checkedBlockedBoundaries: review.stillBlockedBoundaries,
    stopLine: review.stopLine,
    nextSafeAction: findings.length
      ? "Fix planning review findings before moving to the next product stage."
      : review.nextSafeAction,
  };
}
