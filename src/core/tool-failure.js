import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

const CODE_CLASS = Object.freeze({
  invalid_tool_input: "invalid_input", capability_schema_mismatch: "invalid_input",
  tool_not_installed: "not_installed", tool_unavailable: "not_ready",
  tool_review_required: "authority_required", tool_dependency_missing: "dependency_missing",
  tool_permission_denied: "permission_denied", tool_target_not_found: "not_found",
  tool_conflict: "conflict", tool_rate_limited: "rate_limited",
  tool_timeout_before_effect: "timeout_before_effect", tool_outcome_unknown: "outcome_unknown",
  tool_external_unavailable: "external_unavailable", tool_content_blocked: "content_blocked",
  tool_execution_failed: "execution_failed"
});

const RETRY = Object.freeze({
  invalid_input: "after_user_change", not_installed: "after_repair", not_ready: "after_repair",
  authority_required: "after_approval", dependency_missing: "after_repair", permission_denied: "after_user_change",
  not_found: "after_user_change", conflict: "after_refresh", rate_limited: "after_wait",
  timeout_before_effect: "safe_once", outcome_unknown: "manual_reconcile_only",
  external_unavailable: "after_repair", content_blocked: "after_user_change", execution_failed: "after_repair"
});

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

export function classifyToolFailure(error) {
  return CODE_CLASS[error?.code] || "execution_failed";
}

export function createToolFailureEnvelope({ toolId, action, stage, effect, error, repair }) {
  const failureClass = classifyToolFailure(error);
  return Object.freeze({
    schema: "gpao_t3.tool_failure_envelope.v1",
    toolId: String(toolId || "unknown"), action: String(action || "unknown"), stage,
    failureClass, retrySafety: RETRY[failureClass], externalEffect: ["external_send", "external_mutation"].includes(effect),
    outcome: failureClass === "outcome_unknown" ? "unknown" : "not_completed",
    userMessage: error instanceof RuntimeError ? error.message : "도구 실행을 완료하지 못했습니다.",
    diagnosticDigest: digest({ code: error?.code || "unknown", toolId, action, stage }),
    repair: repair ? { ...repair } : null
  });
}

export function toolFailureError(error, context) {
  const envelope = createToolFailureEnvelope(context);
  const wrapped = error instanceof RuntimeError
    ? error
    : new RuntimeError("tool_execution_failed", "도구 실행을 완료하지 못했습니다.", 502);
  wrapped.toolFailure = envelope;
  return wrapped;
}
