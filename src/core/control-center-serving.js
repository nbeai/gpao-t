import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import {
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellHtml,
  buildBrowserLocalAppShellState,
  verifyBrowserLocalAppShell,
} from "./browser-local-app-shell.js";
import {
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  verifyCoreWorkSurface,
} from "./core-work-surface.js";
import {
  buildWorkSurfaceSubmissionDecisionGate,
  verifyWorkSurfaceSubmissionDecisionGate,
} from "./work-surface-submission-gate.js";
import {
  buildWorkSurfaceSubmissionValidationGate,
  verifyWorkSurfaceSubmissionValidationGate,
} from "./work-surface-submission-validation-gate.js";
import {
  buildWorkSurfaceExecutionConfirmationControl,
  buildWorkSurfaceExecutionFlow,
  recordWorkSurfaceExecutionFlow,
  verifyWorkSurfaceExecutionFlow,
} from "./work-surface-execution-flow.js";
import {
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "./session-workspace.js";
import { renderControlCenterHtml } from "./control-center-renderer.js";
import { buildControlCenterSnapshot, buildControlCenterSummary } from "./control-center.js";
import {
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  validateControlCenterUiSnapshot,
} from "./control-center-ui-contract.js";
import {
  buildGpaoTDesignReferenceGate,
  buildLocalControlCenterDesignContract,
  verifyGpaoTDesignReferenceGate,
} from "./design-contract.js";
import { runDoctor } from "./doctor.js";
import {
  buildPackagedDesktopPlanningReview,
  buildTauriPackagedDesktopGate,
  verifyPackagedDesktopPlanningReview,
  verifyTauriPackagedDesktopGate,
} from "./tauri-packaged-desktop-gate.js";
import {
  buildTauriInstallReadinessGate,
  verifyTauriInstallReadinessGate,
} from "./tauri-install-readiness-gate.js";
import {
  buildTauriInstallDryRunPlan,
  buildTauriInstallDryRunApprovalRecordStorageDesign,
  buildTauriInstallDryRunApprovalRecordWriteGateDesign,
  buildTauriInstallDryRunExecutorContract,
  buildTauriInstallDryRunImplementationDesign,
  buildTauriInstallDryRunInvocationApprovalContract,
  buildTauriInstallPrerequisiteDoctor,
  renderTauriInstallDryRunPreview,
  verifyTauriInstallDryRunPlan,
  verifyTauriInstallDryRunApprovalRecordStorageDesign,
  verifyTauriInstallDryRunApprovalRecordWriteGateDesign,
  verifyTauriInstallDryRunExecutorContract,
  verifyTauriInstallDryRunImplementationDesign,
  verifyTauriInstallDryRunInvocationApprovalContract,
  verifyTauriInstallDryRunPreview,
  verifyTauriInstallPrerequisiteDoctor,
} from "./tauri-install-execution-contracts.js";
import {
  buildTauriReadOnlyShellHtml,
  buildTauriReadOnlyShellSlice,
  verifyTauriReadOnlyShellSlice,
} from "./tauri-readonly-shell.js";
import {
  buildStage4ProductionHardening,
  buildStage4ProductionHardeningHtml,
  verifyStage4ProductionHardening,
} from "./stage-4-production-hardening.js";
import {
  buildModelProviderRegistry,
  invokeModelLocally,
  verifyModelInvocation,
} from "./model-invocation.js";
import {
  buildExecutionRuntimePlan,
  inspectReadOnlyConnector,
  invokeExecutionRuntimeDryRun,
  verifyExecutionRuntimeInvocation,
  verifyExecutionRuntimePlan,
} from "./execution-runtime.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 0;

export function buildControlCenterServingContract({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  route = "/",
} = {}) {
  return {
    schema: "gpao_t.control_center_serving_contract.v0_1",
    status: "ready",
    servingMode: "browser_safe_loopback_preview",
    host,
    port,
    routes: [
      { path: "/", content: "static_control_center_html" },
      { path: "/control-center", content: "static_control_center_html" },
      { path: "/control-center.html", content: "static_control_center_html" },
      { path: "/health", content: "local_json_health" },
      { path: "/work-surface", content: "core_work_surface_html" },
      { path: "/work-surface.html", content: "core_work_surface_html" },
      { path: "/work-surface/state", content: "core_work_surface_state" },
      { path: "/work-surface/verify", content: "core_work_surface_verification" },
      { path: "/work-surface/submission-gate", content: "work_surface_submission_decision_gate" },
      { path: "/work-surface/submission-gate/verify", content: "work_surface_submission_decision_gate_verification" },
      { path: "/work-surface/submission-validation-gate", content: "work_surface_submission_validation_gate" },
      { path: "/work-surface/submission-validation-gate/verify", content: "work_surface_submission_validation_gate_verification" },
      { path: "/work-surface/execution-flow", content: "work_surface_execution_governance_flow" },
      { path: "/work-surface/execution-flow/confirmation", content: "work_surface_execution_confirmation_control" },
      { path: "/work-surface/execution-flow/verify", content: "work_surface_execution_governance_flow_verification" },
      { path: "/sessions", content: "session_workspace_state" },
      { path: "/sessions/verify", content: "session_workspace_behavior_verification" },
      { path: "/app-shell", content: "browser_local_app_shell_html" },
      { path: "/app-shell.html", content: "browser_local_app_shell_html" },
      { path: "/app-shell/contract", content: "browser_local_app_shell_contract" },
      { path: "/app-shell/state", content: "browser_local_app_shell_state" },
      { path: "/app-shell/verify", content: "browser_local_app_shell_verification" },
      { path: "/app-shell/tauri-gate", content: "tauri_packaged_desktop_gate" },
      { path: "/app-shell/tauri-gate/verify", content: "tauri_packaged_desktop_gate_verification" },
      { path: "/app-shell/packaged-desktop-review", content: "packaged_desktop_planning_review" },
      { path: "/app-shell/packaged-desktop-review/verify", content: "packaged_desktop_planning_review_verification" },
      { path: "/app-shell/tauri-install-gate", content: "tauri_install_update_rollback_readiness_gate" },
      { path: "/app-shell/tauri-install-gate/verify", content: "tauri_install_update_rollback_readiness_gate_verification" },
      { path: "/app-shell/tauri-prerequisite-doctor", content: "tauri_install_prerequisite_doctor" },
      { path: "/app-shell/tauri-prerequisite-doctor/verify", content: "tauri_install_prerequisite_doctor_verification" },
      { path: "/app-shell/tauri-dry-run-contract", content: "tauri_install_dry_run_executor_contract" },
      { path: "/app-shell/tauri-dry-run-contract/verify", content: "tauri_install_dry_run_executor_contract_verification" },
      { path: "/app-shell/tauri-dry-run-design", content: "tauri_install_dry_run_implementation_design" },
      { path: "/app-shell/tauri-dry-run-design/verify", content: "tauri_install_dry_run_implementation_design_verification" },
      { path: "/app-shell/tauri-dry-run-plan", content: "tauri_install_dry_run_plan" },
      { path: "/app-shell/tauri-dry-run-plan/verify", content: "tauri_install_dry_run_plan_verification" },
      { path: "/app-shell/tauri-dry-run-preview", content: "tauri_install_dry_run_preview" },
      { path: "/app-shell/tauri-dry-run-preview/verify", content: "tauri_install_dry_run_preview_verification" },
      { path: "/app-shell/tauri-dry-run-invocation-approval", content: "tauri_install_dry_run_invocation_approval_contract" },
      { path: "/app-shell/tauri-dry-run-invocation-approval/verify", content: "tauri_install_dry_run_invocation_approval_contract_verification" },
      { path: "/app-shell/tauri-dry-run-approval-storage", content: "tauri_install_dry_run_approval_record_storage_design" },
      { path: "/app-shell/tauri-dry-run-approval-storage/verify", content: "tauri_install_dry_run_approval_record_storage_design_verification" },
      { path: "/app-shell/tauri-dry-run-approval-write-gate", content: "tauri_install_dry_run_approval_record_write_gate_design" },
      { path: "/app-shell/tauri-dry-run-approval-write-gate/verify", content: "tauri_install_dry_run_approval_record_write_gate_design_verification" },
      { path: "/app-shell/tauri-shell", content: "tauri_readonly_shell_html" },
      { path: "/app-shell/tauri-shell.html", content: "tauri_readonly_shell_html" },
      { path: "/app-shell/tauri-shell/slice", content: "tauri_readonly_shell_slice" },
      { path: "/app-shell/tauri-shell/verify", content: "tauri_readonly_shell_slice_verification" },
      { path: "/app-shell/production-hardening", content: "stage_4_production_hardening_html" },
      { path: "/app-shell/production-hardening/state", content: "stage_4_production_hardening_state" },
      { path: "/app-shell/production-hardening/verify", content: "stage_4_production_hardening_verification" },
      { path: "/control-center/summary", content: "local_json_control_center_summary" },
      { path: "/control-center/design", content: "local_json_control_center_design" },
      { path: "/control-center/design-reference-gate", content: "local_json_gpao_t_design_reference_gate" },
      { path: "/control-center/design-reference-gate/verify", content: "local_json_gpao_t_design_reference_gate_verification" },
      { path: "/control-center/ui-contract", content: "local_json_control_center_ui_contract" },
      { path: "/control-center/ui-snapshot", content: "local_json_control_center_ui_snapshot" },
      { path: "/control-center/ui-validate", content: "local_json_control_center_ui_validation" },
      { path: "/adapters/model-providers", content: "model_provider_registry" },
      { path: "/adapters/model-invocation/local", content: "local_model_invocation_proof" },
      { path: "/adapters/model-invocation/verify", content: "model_invocation_verification" },
      { path: "/connectors/execution-runtime", content: "execution_runtime_plan" },
      { path: "/connectors/execution-runtime/verify", content: "execution_runtime_verification" },
      { path: "/connectors/execution-runtime/invoke-dry-run", content: "execution_runtime_dry_run_invocation" },
      { path: "/connectors/execution-runtime/invocation/verify", content: "execution_runtime_invocation_verification" },
      { path: "/connectors/read-only-inspect", content: "read_only_connector_inspection" },
    ],
    defaultRoute: route,
    renderBeforeServe: true,
    previewLifecycle: {
      serveCheck: "ephemeral_start_verify_stop",
      serve: "explicit_manual_preview_until_signal",
      persistentDaemon: false,
      installOrUpdateHook: false,
    },
    screenshotVerification: {
      status: "required_before_richer_behavior",
      requiredViewports: [
        { label: "desktop", width: 1440, height: 960 },
        { label: "mobile", width: 390, height: 844 },
      ],
      requiredVisibleText: [
        "GPAO-T Local Control Center",
        "다음 안전 행동",
        "권한 경계",
        "디자인 게이트",
      ],
      requiredSelectors: [
        ".topbar",
        ".focus-strip",
        ".decision-strip",
        ".mobile-next-action",
        "[data-panel=\"memory\"]",
        "[data-group=\"권한\"]",
      ],
      requiredInteractionSignals: [
        "nonblank_viewport",
        "panel_anchor_navigation",
        "panel_inspector_expansion",
        "no_horizontal_overflow",
        "next_safe_action_visible",
        "authority_boundary_visible",
        "mobile_sticky_topbar_or_decision_strip_visible",
      ],
      blockedSignals: [
        "blank_page",
        "script_tag",
        "external_network_request",
        "daemon_required",
        "account_connection_prompt",
        "deployment_prompt",
      ],
    },
    authorityBoundary: {
      loopbackOnly: true,
      startsPersistentDaemon: false,
      opensExternalNetwork: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      deploysOrPublishes: false,
    },
    nextSafeAction:
      "Start the loopback preview, capture desktop and mobile screenshots, and keep interactivity blocked until screenshots pass visible-state checks.",
  };
}

export async function startControlCenterPreviewServer({
  root,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  html,
  now,
} = {}) {
  const render = renderControlCenterHtml({
    root,
    outputPath: ".gpao-t/control-center/index.html",
    now,
  });
  const pageHtml = html || readFileSync(render.outputPath, "utf8");
  const contract = buildControlCenterServingContract({ host, port });

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${host}`);
    if (request.method === "POST" && url.pathname === "/work-surface/execution-flow/record") {
      const body = await readRequestBody(request);
      const parsedBody = parseRecordRequestBody(body, request.headers["content-type"]);
      const result = recordWorkSurfaceExecutionFlow({
        root,
        request: parsedBody.request,
        confirmationChoice: parsedBody.confirmationChoice,
        confirmationState: parsedBody.confirmationState,
        now,
      });
      const wantsJson = String(request.headers.accept || "").includes("application/json");
      if (wantsJson) {
        respondJson(response, result.status === "blocked" ? 409 : 200, result);
        return;
      }
      respondHtml(response, result.status === "blocked" ? 409 : 200, renderWorkSurfaceExecutionRecordResultHtml({
        result,
        requestText: parsedBody.request,
      }), {
        "x-gpao-t-surface": "work-surface-local-record-result",
      });
      return;
    }

    if (request.method !== "GET") {
      respondJson(response, 405, {
        schema: "gpao_t.browser_local_app_shell_blocked_route.v0_1",
        status: "blocked",
        method: request.method,
        path: url.pathname,
        reason: "browser_local_app_shell_first_slice_is_get_only",
        blockedActions: buildBrowserLocalAppShellContract().blockedActions,
        nextSafeAction: "Use GET-only app-shell and control-center read routes.",
      });
      return;
    }

    if (url.pathname === "/health") {
      respondJson(response, 200, {
        schema: "gpao_t.control_center_serving_health.v0_1",
        status: "ready",
        servingMode: contract.servingMode,
        authorityBoundary: contract.authorityBoundary,
      });
      return;
    }

    if (url.pathname === "/control-center/summary") {
      respondJson(response, 200, buildControlCenterSummary({ root }));
      return;
    }

    if (url.pathname === "/control-center/design") {
      respondJson(response, 200, buildLocalControlCenterDesignContract());
      return;
    }

    if (url.pathname === "/control-center/design-reference-gate") {
      respondJson(response, 200, buildGpaoTDesignReferenceGate());
      return;
    }

    if (url.pathname === "/control-center/design-reference-gate/verify") {
      respondJson(response, 200, verifyGpaoTDesignReferenceGate());
      return;
    }

    if (url.pathname === "/control-center/ui-contract") {
      respondJson(response, 200, buildControlCenterUiContract());
      return;
    }

    if (url.pathname === "/control-center/ui-snapshot") {
      const snapshot = buildControlCenterSnapshot({ root });
      respondJson(response, 200, buildControlCenterUiSnapshot({
        snapshot,
        designContract: buildLocalControlCenterDesignContract(),
      }));
      return;
    }

    if (url.pathname === "/control-center/ui-validate") {
      const snapshot = buildControlCenterSnapshot({ root });
      const uiSnapshot = buildControlCenterUiSnapshot({
        snapshot,
        designContract: buildLocalControlCenterDesignContract(),
      });
      respondJson(response, 200, validateControlCenterUiSnapshot({ uiSnapshot }));
      return;
    }

    if (url.pathname === "/adapters/model-providers") {
      respondJson(response, 200, buildModelProviderRegistry());
      return;
    }

    if (url.pathname === "/adapters/model-invocation/local") {
      respondJson(response, 200, invokeModelLocally({
        request: url.searchParams.get("request") || undefined,
      }));
      return;
    }

    if (url.pathname === "/adapters/model-invocation/verify") {
      respondJson(response, 200, verifyModelInvocation());
      return;
    }

    if (url.pathname === "/connectors/execution-runtime") {
      respondJson(response, 200, buildExecutionRuntimePlan({ root }));
      return;
    }

    if (url.pathname === "/connectors/execution-runtime/verify") {
      const plan = buildExecutionRuntimePlan({ root });
      respondJson(response, 200, verifyExecutionRuntimePlan({ plan }));
      return;
    }

    if (url.pathname === "/connectors/execution-runtime/invoke-dry-run") {
      const commandId = url.searchParams.get("commandId") || "model-invocation-check";
      respondJson(response, 200, invokeExecutionRuntimeDryRun({
        root,
        commandId,
        approval: {
          confirmed: true,
          commandId,
          authorityTier: "dry_run",
          allowMutation: false,
        },
      }));
      return;
    }

    if (url.pathname === "/connectors/execution-runtime/invocation/verify") {
      respondJson(response, 200, verifyExecutionRuntimeInvocation({ root }));
      return;
    }

    if (url.pathname === "/connectors/read-only-inspect") {
      respondJson(response, 200, inspectReadOnlyConnector({
        root,
        connectorId: url.searchParams.get("connectorId") || "local.filesystem",
      }));
      return;
    }

    if (url.pathname === "/work-surface" || url.pathname === "/work-surface.html") {
      const surface = buildCoreWorkSurface({ root, now });
      respondHtml(response, 200, buildCoreWorkSurfaceHtml({ surface }), {
        "x-gpao-t-surface": "core-work-surface",
      });
      return;
    }

    if (url.pathname === "/work-surface/state") {
      respondJson(response, 200, buildCoreWorkSurface({ root, now }));
      return;
    }

    if (url.pathname === "/work-surface/verify") {
      const surface = buildCoreWorkSurface({ root, now });
      respondJson(response, 200, verifyCoreWorkSurface({
        surface,
        html: buildCoreWorkSurfaceHtml({ surface }),
      }));
      return;
    }

    if (url.pathname === "/work-surface/submission-gate") {
      respondJson(response, 200, buildWorkSurfaceSubmissionDecisionGate({ root, now }));
      return;
    }

    if (url.pathname === "/work-surface/submission-gate/verify") {
      const gate = buildWorkSurfaceSubmissionDecisionGate({ root, now });
      respondJson(response, 200, verifyWorkSurfaceSubmissionDecisionGate({ gate }));
      return;
    }

    if (url.pathname === "/work-surface/submission-validation-gate") {
      respondJson(response, 200, buildWorkSurfaceSubmissionValidationGate({ root, now }));
      return;
    }

    if (url.pathname === "/work-surface/submission-validation-gate/verify") {
      const gate = buildWorkSurfaceSubmissionValidationGate({ root, now });
      respondJson(response, 200, verifyWorkSurfaceSubmissionValidationGate({ gate }));
      return;
    }

    if (url.pathname === "/work-surface/execution-flow") {
      respondJson(response, 200, buildWorkSurfaceExecutionFlow({ root, now }));
      return;
    }

    if (url.pathname === "/work-surface/execution-flow/confirmation") {
      respondJson(response, 200, buildWorkSurfaceExecutionConfirmationControl({ now }));
      return;
    }

    if (url.pathname === "/work-surface/execution-flow/verify") {
      respondJson(response, 200, verifyWorkSurfaceExecutionFlow({ root }));
      return;
    }

    if (url.pathname === "/sessions") {
      respondJson(response, 200, readSessionWorkspaceState({ root, now }));
      return;
    }

    if (url.pathname === "/sessions/verify") {
      respondJson(response, 200, verifySessionWorkspaceBehavior({ root }));
      return;
    }

    if (url.pathname === "/app-shell/contract") {
      respondJson(response, 200, buildBrowserLocalAppShellContract());
      return;
    }

    if (url.pathname === "/app-shell/state") {
      respondJson(response, 200, buildBrowserLocalAppShellState({ root, now }));
      return;
    }

    if (url.pathname === "/app-shell/verify") {
      respondJson(response, 200, verifyBrowserLocalAppShell({
        state: buildBrowserLocalAppShellState({ root, now }),
      }));
      return;
    }

    if (url.pathname === "/app-shell/tauri-gate") {
      respondJson(response, 200, buildTauriPackagedDesktopGate());
      return;
    }

    if (url.pathname === "/app-shell/tauri-gate/verify") {
      respondJson(response, 200, verifyTauriPackagedDesktopGate({
        appShellVerification: verifyBrowserLocalAppShell({
          state: buildBrowserLocalAppShellState({ root, now }),
        }),
      }));
      return;
    }

    if (url.pathname === "/app-shell/packaged-desktop-review") {
      respondJson(response, 200, buildPackagedDesktopPlanningReview());
      return;
    }

    if (url.pathname === "/app-shell/packaged-desktop-review/verify") {
      respondJson(response, 200, verifyPackagedDesktopPlanningReview({
        review: buildPackagedDesktopPlanningReview(),
      }));
      return;
    }

    if (url.pathname === "/app-shell/tauri-install-gate") {
      respondJson(response, 200, buildTauriInstallReadinessGate());
      return;
    }

    if (url.pathname === "/app-shell/tauri-install-gate/verify") {
      respondJson(response, 200, verifyTauriInstallReadinessGate());
      return;
    }

    if (url.pathname === "/app-shell/tauri-prerequisite-doctor") {
      respondJson(response, 200, buildTauriInstallPrerequisiteDoctor());
      return;
    }

    if (url.pathname === "/app-shell/tauri-prerequisite-doctor/verify") {
      respondJson(response, 200, verifyTauriInstallPrerequisiteDoctor());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-contract") {
      respondJson(response, 200, buildTauriInstallDryRunExecutorContract());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-contract/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunExecutorContract());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-design") {
      respondJson(response, 200, buildTauriInstallDryRunImplementationDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-design/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunImplementationDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-plan") {
      respondJson(response, 200, buildTauriInstallDryRunPlan());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-plan/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunPlan());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-preview") {
      respondJson(response, 200, renderTauriInstallDryRunPreview());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-preview/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunPreview());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-invocation-approval") {
      respondJson(response, 200, buildTauriInstallDryRunInvocationApprovalContract());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-invocation-approval/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunInvocationApprovalContract());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-approval-storage") {
      respondJson(response, 200, buildTauriInstallDryRunApprovalRecordStorageDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-approval-storage/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunApprovalRecordStorageDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-approval-write-gate") {
      respondJson(response, 200, buildTauriInstallDryRunApprovalRecordWriteGateDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-dry-run-approval-write-gate/verify") {
      respondJson(response, 200, verifyTauriInstallDryRunApprovalRecordWriteGateDesign());
      return;
    }

    if (url.pathname === "/app-shell/tauri-shell/slice") {
      respondJson(response, 200, buildTauriReadOnlyShellSlice());
      return;
    }

    if (url.pathname === "/app-shell/tauri-shell/verify") {
      respondJson(response, 200, verifyTauriReadOnlyShellSlice());
      return;
    }

    if (url.pathname === "/app-shell/production-hardening/state") {
      respondJson(response, 200, buildStage4ProductionHardening({ root, now }));
      return;
    }

    if (url.pathname === "/app-shell/production-hardening/verify") {
      const state = buildStage4ProductionHardening({ root, now });
      respondJson(response, 200, verifyStage4ProductionHardening({
        state,
        html: buildStage4ProductionHardeningHtml({ state }),
      }));
      return;
    }

    if (url.pathname === "/app-shell/production-hardening") {
      const state = buildStage4ProductionHardening({ root, now });
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "stage-4-production-hardening",
      });
      response.end(buildStage4ProductionHardeningHtml({ state }));
      return;
    }

    if (["/app-shell/tauri-shell", "/app-shell/tauri-shell.html"].includes(url.pathname)) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "tauri-readonly-shell-preview",
      });
      response.end(buildTauriReadOnlyShellHtml());
      return;
    }

    if (["/app-shell", "/app-shell.html"].includes(url.pathname)) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "browser-local-app-shell",
      });
      response.end(buildBrowserLocalAppShellHtml({
        state: buildBrowserLocalAppShellState({ root, now }),
      }));
      return;
    }

    if (["/", "/control-center", "/control-center.html"].includes(url.pathname)) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "local-control-center-preview",
      });
      response.end(pageHtml);
      return;
    }

    respondJson(response, 404, {
      error: "not_found",
      nextSafeAction: "Use /, /control-center, /control-center.html, or /health.",
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}/control-center`;

  return {
    schema: "gpao_t.control_center_preview_server.v0_1",
    status: "serving",
    server,
    url,
    host,
    port: actualPort,
    render,
    contract: buildControlCenterServingContract({ host, port: actualPort }),
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

export async function verifyControlCenterPreviewServing({
  root,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  now,
} = {}) {
  const preview = await startControlCenterPreviewServer({ root, host, port, now });
  try {
    const health = await fetchJson(`http://${host}:${preview.port}/health`);
    const page = await fetchText(preview.url);
    const workSurface = await fetchText(`http://${host}:${preview.port}/work-surface`);
    const workSurfaceState = await fetchJson(`http://${host}:${preview.port}/work-surface/state`);
    const workSurfaceVerify = await fetchJson(`http://${host}:${preview.port}/work-surface/verify`);
    const workSurfaceSubmissionGate = await fetchJson(`http://${host}:${preview.port}/work-surface/submission-gate`);
    const workSurfaceSubmissionGateVerify = await fetchJson(`http://${host}:${preview.port}/work-surface/submission-gate/verify`);
    const workSurfaceSubmissionValidationGate = await fetchJson(`http://${host}:${preview.port}/work-surface/submission-validation-gate`);
    const workSurfaceSubmissionValidationGateVerify = await fetchJson(`http://${host}:${preview.port}/work-surface/submission-validation-gate/verify`);
    const workSurfaceExecutionFlow = await fetchJson(`http://${host}:${preview.port}/work-surface/execution-flow`);
    const workSurfaceExecutionConfirmation = await fetchJson(`http://${host}:${preview.port}/work-surface/execution-flow/confirmation`);
    const workSurfaceExecutionFlowVerify = await fetchJson(`http://${host}:${preview.port}/work-surface/execution-flow/verify`);
    const workSurfaceExecutionRecord = await fetchJson(`http://${host}:${preview.port}/work-surface/execution-flow/record`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        request: "serve-check local record",
        confirmationChoice: "matches_intent",
        confirmationState: "confirmed_for_local_record_only",
      }),
    });
    const sessionWorkspace = await fetchJson(`http://${host}:${preview.port}/sessions`);
    const sessionWorkspaceVerify = await fetchJson(`http://${host}:${preview.port}/sessions/verify`);
    const appShell = await fetchText(`http://${host}:${preview.port}/app-shell`);
    const appShellState = await fetchJson(`http://${host}:${preview.port}/app-shell/state`);
    const tauriGate = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-gate`);
    const tauriGateVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-gate/verify`);
    const packagedDesktopReview = await fetchJson(`http://${host}:${preview.port}/app-shell/packaged-desktop-review`);
    const packagedDesktopReviewVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/packaged-desktop-review/verify`);
    const tauriInstallGate = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-install-gate`);
    const tauriInstallGateVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-install-gate/verify`);
    const tauriPrerequisiteDoctor = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-prerequisite-doctor`);
    const tauriPrerequisiteDoctorVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-prerequisite-doctor/verify`);
    const tauriDryRunContract = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-contract`);
    const tauriDryRunContractVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-contract/verify`);
    const tauriDryRunDesign = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-design`);
    const tauriDryRunDesignVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-design/verify`);
    const tauriDryRunPlan = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-plan`);
    const tauriDryRunPlanVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-plan/verify`);
    const tauriDryRunPreview = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-preview`);
    const tauriDryRunPreviewVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-preview/verify`);
    const tauriDryRunInvocationApproval = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-invocation-approval`);
    const tauriDryRunInvocationApprovalVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-invocation-approval/verify`);
    const tauriDryRunApprovalStorage = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-storage`);
    const tauriDryRunApprovalStorageVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-storage/verify`);
    const tauriDryRunApprovalWriteGate = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-write-gate`);
    const tauriDryRunApprovalWriteGateVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-write-gate/verify`);
    const tauriShell = await fetchText(`http://${host}:${preview.port}/app-shell/tauri-shell`);
    const tauriShellSlice = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-shell/slice`);
    const tauriShellVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-shell/verify`);
    const stage4ProductionHardening = await fetchText(`http://${host}:${preview.port}/app-shell/production-hardening`);
    const stage4ProductionHardeningState = await fetchJson(`http://${host}:${preview.port}/app-shell/production-hardening/state`);
    const stage4ProductionHardeningVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/production-hardening/verify`);
    const modelProviders = await fetchJson(`http://${host}:${preview.port}/adapters/model-providers`);
    const modelInvocationLocal = await fetchJson(`http://${host}:${preview.port}/adapters/model-invocation/local`);
    const modelInvocationVerify = await fetchJson(`http://${host}:${preview.port}/adapters/model-invocation/verify`);
    const executionRuntime = await fetchJson(`http://${host}:${preview.port}/connectors/execution-runtime`);
    const executionRuntimeVerify = await fetchJson(`http://${host}:${preview.port}/connectors/execution-runtime/verify`);
    const executionDryRunInvocation = await fetchJson(`http://${host}:${preview.port}/connectors/execution-runtime/invoke-dry-run`);
    const executionRuntimeInvocationVerify = await fetchJson(`http://${host}:${preview.port}/connectors/execution-runtime/invocation/verify`);
    const readOnlyInspection = await fetchJson(`http://${host}:${preview.port}/connectors/read-only-inspect`);
    const blockedPost = await fetchJson(`http://${host}:${preview.port}/app-shell`, { method: "POST" });
    const findings = [];

    if (health.status !== 200 || health.body.status !== "ready") {
      findings.push("health_route_not_ready");
    }
    if (workSurface.status !== 200 || !workSurface.body.includes("GPAO-T Work Surface")) {
      findings.push("work_surface_not_ready");
    }
    if (/<script/i.test(workSurface.body)) {
      findings.push("work_surface_script_tag_present");
    }
    if (/<form/i.test(workSurface.body) && !workSurface.body.includes("data-local-confirmation-form=\"approval-audit-record\"")) {
      findings.push("work_surface_unapproved_form_present");
    }
    if (!workSurface.body.includes("action=\"/work-surface/execution-flow/record\"")) {
      findings.push("work_surface_local_record_form_missing");
    }
    if (!workSurface.body.includes("data-core-work-surface=\"read-only\"")) {
      findings.push("work_surface_missing_marker");
    }
    if (
      workSurfaceState.status !== 200
      || workSurfaceState.body.schema !== "gpao_t.core_work_surface.v0_1"
    ) {
      findings.push("work_surface_state_not_ready");
    }
    if (workSurfaceVerify.status !== 200 || workSurfaceVerify.body.status !== "ready") {
      findings.push("work_surface_verify_not_ready");
    }
    if (workSurfaceSubmissionGate.status !== 200
      || workSurfaceSubmissionGate.body.schema !== "gpao_t.work_surface_submission_decision_gate.v0_1") {
      findings.push("work_surface_submission_gate_not_ready");
    }
    if (workSurfaceSubmissionGateVerify.status !== 200 || workSurfaceSubmissionGateVerify.body.status !== "ready") {
      findings.push("work_surface_submission_gate_verify_not_ready");
    }
    if (workSurfaceSubmissionValidationGate.status !== 200
      || workSurfaceSubmissionValidationGate.body.schema !== "gpao_t.work_surface_submission_validation_confirmation_gate.v0_1") {
      findings.push("work_surface_submission_validation_gate_not_ready");
    }
    if (
      workSurfaceSubmissionValidationGateVerify.status !== 200
      || workSurfaceSubmissionValidationGateVerify.body.status !== "ready"
    ) {
      findings.push("work_surface_submission_validation_gate_verify_not_ready");
    }
    if (
      workSurfaceExecutionFlow.status !== 200
      || workSurfaceExecutionFlow.body.schema !== "gpao_t.work_surface_execution_governance_flow.v1"
    ) {
      findings.push("work_surface_execution_flow_not_ready");
    }
    if (
      workSurfaceExecutionConfirmation.status !== 200
      || workSurfaceExecutionConfirmation.body.schema !== "gpao_t.work_surface_execution_confirmation_control.v1"
    ) {
      findings.push("work_surface_execution_confirmation_not_ready");
    }
    if (workSurfaceExecutionFlowVerify.status !== 200 || workSurfaceExecutionFlowVerify.body.status !== "ready") {
      findings.push("work_surface_execution_flow_verify_not_ready");
    }
    if (
      workSurfaceExecutionRecord.status !== 200
      || workSurfaceExecutionRecord.body.status !== "written_local_only"
      || workSurfaceExecutionRecord.body.writeResult?.boundaryState?.externalSend !== false
    ) {
      findings.push("work_surface_execution_record_not_written_local_only");
    }
    if (sessionWorkspace.status !== 200 || sessionWorkspace.body.schema !== "gpao_t.session_workspace_state.v1") {
      findings.push("session_workspace_route_not_ready");
    }
    if (sessionWorkspaceVerify.status !== 200 || sessionWorkspaceVerify.body.status !== "ready") {
      findings.push("session_workspace_verify_not_ready");
    }
    if (page.status !== 200) {
      findings.push("control_center_route_not_200");
    }
    for (const text of preview.contract.screenshotVerification.requiredVisibleText) {
      if (!page.body.includes(text)) {
        findings.push(`missing_text:${text}`);
      }
    }
    if (/<script/i.test(page.body)) {
      findings.push("script_tag_present");
    }
    if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(page.body)) {
      findings.push("external_url_present");
    }
    if (appShell.status !== 200) {
      findings.push("app_shell_route_not_200");
    }
    if (!appShell.body.includes("GPAO-T Browser-Local App Shell")) {
      findings.push("app_shell_missing_title");
    }
    if (/<script/i.test(appShell.body)) {
      findings.push("app_shell_script_tag_present");
    }
    if (appShellState.status !== 200 || appShellState.body.schema !== "gpao_t.browser_local_app_shell_state.v0_1") {
      findings.push("app_shell_state_not_ready");
    }
    if (tauriGate.status !== 200 || tauriGate.body.schema !== "gpao_t.tauri_packaged_desktop_gate.v0_1") {
      findings.push("tauri_gate_not_ready");
    }
    if (tauriGateVerify.status !== 200 || tauriGateVerify.body.status !== "ready") {
      findings.push("tauri_gate_verify_not_ready");
    }
    if (
      packagedDesktopReview.status !== 200
      || packagedDesktopReview.body.schema !== "gpao_t.packaged_desktop_planning_review.v0_1"
    ) {
      findings.push("packaged_desktop_review_not_ready");
    }
    if (packagedDesktopReviewVerify.status !== 200 || packagedDesktopReviewVerify.body.status !== "ready") {
      findings.push("packaged_desktop_review_verify_not_ready");
    }
    if (tauriInstallGate.status !== 200 || tauriInstallGate.body.schema !== "gpao_t.tauri_install_update_rollback_readiness_gate.v0_1") {
      findings.push("tauri_install_gate_not_ready");
    }
    if (tauriInstallGateVerify.status !== 200 || tauriInstallGateVerify.body.status !== "ready") {
      findings.push("tauri_install_gate_verify_not_ready");
    }
    if (
      tauriPrerequisiteDoctor.status !== 200
      || tauriPrerequisiteDoctor.body.schema !== "gpao_t.tauri_install_prerequisite_doctor.v0_1"
    ) {
      findings.push("tauri_prerequisite_doctor_not_ready");
    }
    if (tauriPrerequisiteDoctorVerify.status !== 200 || tauriPrerequisiteDoctorVerify.body.status !== "ready") {
      findings.push("tauri_prerequisite_doctor_verify_not_ready");
    }
    if (
      tauriDryRunContract.status !== 200
      || tauriDryRunContract.body.schema !== "gpao_t.tauri_install_dry_run_executor_contract.v0_1"
    ) {
      findings.push("tauri_dry_run_contract_not_ready");
    }
    if (tauriDryRunContractVerify.status !== 200 || tauriDryRunContractVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_contract_verify_not_ready");
    }
    if (
      tauriDryRunDesign.status !== 200
      || tauriDryRunDesign.body.schema !== "gpao_t.tauri_install_dry_run_implementation_design.v0_1"
    ) {
      findings.push("tauri_dry_run_design_not_ready");
    }
    if (tauriDryRunDesignVerify.status !== 200 || tauriDryRunDesignVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_design_verify_not_ready");
    }
    if (
      tauriDryRunPlan.status !== 200
      || tauriDryRunPlan.body.schema !== "gpao_t.tauri_install_dry_run_plan.v0_1"
    ) {
      findings.push("tauri_dry_run_plan_not_ready");
    }
    if (tauriDryRunPlanVerify.status !== 200 || tauriDryRunPlanVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_plan_verify_not_ready");
    }
    if (
      tauriDryRunPreview.status !== 200
      || tauriDryRunPreview.body.schema !== "gpao_t.tauri_install_dry_run_preview.v0_1"
    ) {
      findings.push("tauri_dry_run_preview_not_ready");
    }
    if (tauriDryRunPreviewVerify.status !== 200 || tauriDryRunPreviewVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_preview_verify_not_ready");
    }
    if (
      tauriDryRunInvocationApproval.status !== 200
      || tauriDryRunInvocationApproval.body.schema !== "gpao_t.tauri_install_dry_run_invocation_approval_contract.v0_1"
    ) {
      findings.push("tauri_dry_run_invocation_approval_not_ready");
    }
    if (tauriDryRunInvocationApprovalVerify.status !== 200 || tauriDryRunInvocationApprovalVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_invocation_approval_verify_not_ready");
    }
    if (
      tauriDryRunApprovalStorage.status !== 200
      || tauriDryRunApprovalStorage.body.schema !== "gpao_t.tauri_install_dry_run_approval_record_storage_design.v0_1"
    ) {
      findings.push("tauri_dry_run_approval_storage_not_ready");
    }
    if (tauriDryRunApprovalStorageVerify.status !== 200 || tauriDryRunApprovalStorageVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_approval_storage_verify_not_ready");
    }
    if (
      tauriDryRunApprovalWriteGate.status !== 200
      || tauriDryRunApprovalWriteGate.body.schema !== "gpao_t.tauri_install_dry_run_approval_record_write_gate_design.v0_1"
    ) {
      findings.push("tauri_dry_run_approval_write_gate_not_ready");
    }
    if (tauriDryRunApprovalWriteGateVerify.status !== 200 || tauriDryRunApprovalWriteGateVerify.body.status !== "ready") {
      findings.push("tauri_dry_run_approval_write_gate_verify_not_ready");
    }
    if (tauriShell.status !== 200) {
      findings.push("tauri_shell_route_not_200");
    }
    if (!tauriShell.body.includes("GPAO-T Read-Mostly Tauri Shell")) {
      findings.push("tauri_shell_missing_title");
    }
    if (/<script/i.test(tauriShell.body)) {
      findings.push("tauri_shell_script_tag_present");
    }
    if (tauriShellSlice.status !== 200 || tauriShellSlice.body.schema !== "gpao_t.tauri_readonly_shell_slice.v0_1") {
      findings.push("tauri_shell_slice_not_ready");
    }
    if (tauriShellVerify.status !== 200 || tauriShellVerify.body.status !== "ready") {
      findings.push("tauri_shell_verify_not_ready");
    }
    if (stage4ProductionHardening.status !== 200) {
      findings.push("stage_4_production_hardening_route_not_200");
    }
    if (!stage4ProductionHardening.body.includes("GPAO-T Local App Hardening")) {
      findings.push("stage_4_production_hardening_missing_title");
    }
    if (/<script/i.test(stage4ProductionHardening.body)) {
      findings.push("stage_4_production_hardening_script_tag_present");
    }
    if (/<form/i.test(stage4ProductionHardening.body)) {
      findings.push("stage_4_production_hardening_form_present");
    }
    if (stage4ProductionHardeningState.status !== 200
      || stage4ProductionHardeningState.body.schema !== "gpao_t.stage_4_production_hardening.v1") {
      findings.push("stage_4_production_hardening_state_not_ready");
    }
    if (stage4ProductionHardeningVerify.status !== 200 || stage4ProductionHardeningVerify.body.status !== "ready") {
      findings.push("stage_4_production_hardening_verify_not_ready");
    }
    if (modelProviders.status !== 200 || modelProviders.body.schema !== "gpao_t.model_provider_registry.v1") {
      findings.push("model_provider_registry_not_ready");
    }
    if (!modelProviders.body.providers?.some((provider) => provider.lane === "oauth_session")) {
      findings.push("model_provider_oauth_lane_missing");
    }
    if (!modelProviders.body.providers?.some((provider) => provider.lane === "api_key")) {
      findings.push("model_provider_api_key_lane_missing");
    }
    if (modelInvocationLocal.status !== 200 || modelInvocationLocal.body.status !== "completed_local_invocation") {
      findings.push("model_invocation_local_not_ready");
    }
    if (modelInvocationVerify.status !== 200 || modelInvocationVerify.body.status !== "ready") {
      findings.push("model_invocation_verify_not_ready");
    }
    if (executionRuntime.status !== 200 || executionRuntime.body.schema !== "gpao_t.execution_runtime_plan.v1") {
      findings.push("execution_runtime_not_ready");
    }
    if (executionRuntimeVerify.status !== 200 || executionRuntimeVerify.body.status !== "ready") {
      findings.push("execution_runtime_verify_not_ready");
    }
    if (executionDryRunInvocation.status !== 200 || executionDryRunInvocation.body.status !== "completed_dry_run_invocation") {
      findings.push("execution_dry_run_invocation_not_ready");
    }
    if (executionRuntimeInvocationVerify.status !== 200 || executionRuntimeInvocationVerify.body.status !== "ready") {
      findings.push("execution_runtime_invocation_verify_not_ready");
    }
    if (readOnlyInspection.status !== 200 || readOnlyInspection.body.status !== "ready") {
      findings.push("read_only_connector_inspection_not_ready");
    }
    if (blockedPost.status !== 405 || blockedPost.body.status !== "blocked") {
      findings.push("app_shell_post_not_blocked");
    }

    return {
      schema: "gpao_t.control_center_serving_verification.v0_1",
      status: findings.length ? "blocked" : "ready",
      url: preview.url,
      workSurfaceUrl: `http://${host}:${preview.port}/work-surface`,
      workSurfaceSubmissionGateUrl: `http://${host}:${preview.port}/work-surface/submission-gate`,
      workSurfaceSubmissionValidationGateUrl: `http://${host}:${preview.port}/work-surface/submission-validation-gate`,
      appShellUrl: `http://${host}:${preview.port}/app-shell`,
      tauriGateUrl: `http://${host}:${preview.port}/app-shell/tauri-gate`,
      packagedDesktopReviewUrl: `http://${host}:${preview.port}/app-shell/packaged-desktop-review`,
      tauriInstallGateUrl: `http://${host}:${preview.port}/app-shell/tauri-install-gate`,
      tauriPrerequisiteDoctorUrl: `http://${host}:${preview.port}/app-shell/tauri-prerequisite-doctor`,
      tauriDryRunContractUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-contract`,
      tauriDryRunDesignUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-design`,
      tauriDryRunPlanUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-plan`,
      tauriDryRunPreviewUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-preview`,
      tauriDryRunInvocationApprovalUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-invocation-approval`,
      tauriDryRunApprovalStorageUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-storage`,
      tauriDryRunApprovalWriteGateUrl: `http://${host}:${preview.port}/app-shell/tauri-dry-run-approval-write-gate`,
      tauriShellUrl: `http://${host}:${preview.port}/app-shell/tauri-shell`,
      tauriShellSliceUrl: `http://${host}:${preview.port}/app-shell/tauri-shell/slice`,
      stage4ProductionHardeningUrl: `http://${host}:${preview.port}/app-shell/production-hardening`,
      modelProvidersUrl: `http://${host}:${preview.port}/adapters/model-providers`,
      modelInvocationLocalUrl: `http://${host}:${preview.port}/adapters/model-invocation/local`,
      executionRuntimeUrl: `http://${host}:${preview.port}/connectors/execution-runtime`,
      executionDryRunInvocationUrl: `http://${host}:${preview.port}/connectors/execution-runtime/invoke-dry-run`,
      readOnlyInspectionUrl: `http://${host}:${preview.port}/connectors/read-only-inspect`,
      healthStatus: health.status,
      workSurfaceStatus: workSurface.status,
      workSurfaceStateStatus: workSurfaceState.status,
      workSurfaceSubmissionGateStatus: workSurfaceSubmissionGate.status,
      workSurfaceSubmissionGateVerifyStatus: workSurfaceSubmissionGateVerify.status,
      workSurfaceSubmissionValidationGateStatus: workSurfaceSubmissionValidationGate.status,
      workSurfaceSubmissionValidationGateVerifyStatus: workSurfaceSubmissionValidationGateVerify.status,
      workSurfaceExecutionFlowStatus: workSurfaceExecutionFlow.status,
      workSurfaceExecutionConfirmationStatus: workSurfaceExecutionConfirmation.status,
      workSurfaceExecutionFlowVerifyStatus: workSurfaceExecutionFlowVerify.status,
      workSurfaceExecutionRecordStatus: workSurfaceExecutionRecord.status,
      pageStatus: page.status,
      appShellStatus: appShell.status,
      tauriGateStatus: tauriGate.status,
      packagedDesktopReviewStatus: packagedDesktopReview.status,
      tauriInstallGateStatus: tauriInstallGate.status,
      tauriPrerequisiteDoctorStatus: tauriPrerequisiteDoctor.status,
      tauriDryRunContractStatus: tauriDryRunContract.status,
      tauriDryRunDesignStatus: tauriDryRunDesign.status,
      tauriDryRunPlanStatus: tauriDryRunPlan.status,
      tauriDryRunPreviewStatus: tauriDryRunPreview.status,
      tauriDryRunInvocationApprovalStatus: tauriDryRunInvocationApproval.status,
      tauriDryRunApprovalStorageStatus: tauriDryRunApprovalStorage.status,
      tauriDryRunApprovalWriteGateStatus: tauriDryRunApprovalWriteGate.status,
      tauriShellStatus: tauriShell.status,
      tauriShellSliceStatus: tauriShellSlice.status,
      stage4ProductionHardeningStatus: stage4ProductionHardening.status,
      stage4ProductionHardeningStateStatus: stage4ProductionHardeningState.status,
      stage4ProductionHardeningVerifyStatus: stage4ProductionHardeningVerify.status,
      modelProvidersStatus: modelProviders.status,
      modelInvocationLocalStatus: modelInvocationLocal.status,
      modelInvocationVerifyStatus: modelInvocationVerify.status,
      executionRuntimeStatus: executionRuntime.status,
      executionRuntimeVerifyStatus: executionRuntimeVerify.status,
      executionDryRunInvocationStatus: executionDryRunInvocation.status,
      executionRuntimeInvocationVerifyStatus: executionRuntimeInvocationVerify.status,
      readOnlyInspectionStatus: readOnlyInspection.status,
      blockedPostStatus: blockedPost.status,
      contentLength: page.body.length,
      requiredVisibleText: preview.contract.screenshotVerification.requiredVisibleText,
      findings,
      authorityBoundary: preview.contract.authorityBoundary,
      screenshotNextAction:
        "Use the browser to capture desktop and mobile screenshots at this loopback URL before interactive UI work.",
    };
  } finally {
    await preview.close();
  }
}

function respondJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value, null, 2));
}

function respondHtml(response, statusCode, html, headers = {}) {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(html);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function parseRecordRequestBody(body, contentType = "") {
  if (String(contentType).includes("application/json")) {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(body || "");
  return {
    request: params.get("request") || undefined,
    confirmationChoice: params.get("confirmationChoice") || undefined,
    confirmationState: params.get("confirmationState") || undefined,
  };
}

function renderWorkSurfaceExecutionRecordResultHtml({ result, requestText }) {
  const written = result.status === "written_local_only";
  const approvalId = result.writeResult?.approvalRecord?.id || "기록 없음";
  const auditId = result.writeResult?.auditRecord?.id || "기록 없음";
  const replayStatus = result.writeResult?.replay?.status || result.flow?.replay?.status || "아직 없음";
  const rollbackReference = result.writeResult?.replay?.rollbackReference
    || result.flow?.replay?.rollbackReference
    || "실행이 없어서 되돌릴 외부 변화가 없습니다.";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T 로컬 기록 결과</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7f2;
      --surface: #ffffff;
      --surface-soft: #f9faf6;
      --text: #17211b;
      --muted: #526257;
      --line: #dbe5dc;
      --ready: #1f7a64;
      --review: #9b6a1c;
      --locked: #8f4a42;
      --blue-soft: #e8f1fa;
      --green-soft: #e7f4ed;
      --amber-soft: #fff4d8;
      --shadow: 0 1px 2px rgba(23,33,27,0.05), 0 18px 44px rgba(23,33,27,0.08);
    }
    * { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Pretendard, "Apple SD Gothic Neo", "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.58;
    }
    main {
      width: min(960px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 28px 0;
    }
    .result-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    header {
      padding: 22px;
      border-bottom: 1px solid var(--line);
      background: ${written ? "var(--green-soft)" : "var(--amber-soft)"};
    }
    h1, h2, p { margin: 0; letter-spacing: 0; }
    h1 { font-size: 22px; line-height: 1.25; }
    p { color: var(--muted); word-break: keep-all; overflow-wrap: anywhere; }
    .content { padding: 18px 22px 22px; display: grid; gap: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .item {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface-soft);
      padding: 12px;
    }
    .item strong, .item span { display: block; word-break: keep-all; overflow-wrap: anywhere; }
    .item strong { font-size: 12px; color: var(--muted); }
    .item span { margin-top: 6px; font-size: 14px; font-weight: 850; }
    .boundary {
      border-color: #ead39a;
      background: var(--amber-soft);
    }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    a {
      color: #255f99;
      font-weight: 850;
      text-decoration: none;
      border: 1px solid #bfd2e5;
      border-radius: 999px;
      background: var(--blue-soft);
      padding: 8px 11px;
    }
    @media (max-width: 620px) {
      main { width: min(100vw - 20px, 420px); padding: 12px 0; }
      header, .content { padding: 14px; }
      h1 { font-size: 18px; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body data-work-surface-record-result="${written ? "written-local-only" : "blocked"}" data-external-activation="blocked">
  <main>
    <section class="result-card" aria-label="로컬 기록 결과">
      <header>
        <p>${written ? "로컬 승인/감사 기록" : "기록 보류"}</p>
        <h1>${written ? "로컬 기록을 남겼습니다" : "아직 기록하지 않았습니다"}</h1>
        <p>${written ? "승인 기록과 감사 기록만 로컬 JSONL에 저장했습니다. 실제 모델, 도구, 커넥터, 외부 전송은 실행하지 않았습니다." : "의도 확인이 완료되지 않아 로컬 기록 저장을 멈췄습니다. 실제 실행도 열리지 않았습니다."}</p>
      </header>
      <div class="content">
        <div class="grid">
          <div class="item"><strong>요청</strong><span>${escapeHtml(requestText || "GPAO-T 실행 확인 흐름 로컬 기록")}</span></div>
          <div class="item"><strong>상태</strong><span>${written ? "로컬 저장됨" : "저장 전 확인 필요"}</span></div>
          <div class="item"><strong>승인 기록</strong><span>${escapeHtml(approvalId)}</span></div>
          <div class="item"><strong>감사 기록</strong><span>${escapeHtml(auditId)}</span></div>
          <div class="item"><strong>리플레이</strong><span>${escapeHtml(replayStatus)}</span></div>
          <div class="item"><strong>되돌리기 기준</strong><span>${escapeHtml(rollbackReference)}</span></div>
        </div>
        <div class="item boundary" data-authority-boundary="closed">
          <strong>계속 잠긴 행동</strong>
          <span>모델 호출 없음 · 도구/명령/MCP 실행 없음 · 커넥터 활성화 없음 · 외부 전송 없음 · 비용/파괴 행동 없음 · 지속 기억 승격 없음</span>
        </div>
        <div class="actions">
          <a href="/work-surface">작업 표면으로 돌아가기</a>
          <a href="/work-surface/execution-flow">기록 상태 JSON 보기</a>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}
