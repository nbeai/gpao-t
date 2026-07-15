import { presentRuntimeStatus } from "./presentation-status.js";

const ERROR_TO_STATE = {
  auth_required: "auth_required",
  rate_limited: "rate_limited",
  provider_unavailable: "provider_unavailable",
  provider_timeout: "provider_unavailable",
  content_blocked: "content_blocked",
  external_outcome_unknown: "outcome_unknown",
  runtime_not_ready: "provider_unavailable"
};

export function createRepairPlan(errorOrCode) {
  const code = typeof errorOrCode === "string" ? errorOrCode : errorOrCode?.code;
  const state = ERROR_TO_STATE[code] || "provider_unavailable";
  const presentation = presentRuntimeStatus(state);
  return { schema: "gpao_t3.repair_plan.v1", state, title: presentation.title, detail: presentation.detail, action: presentation.action, diagnosticCode: code || "unknown" };
}
