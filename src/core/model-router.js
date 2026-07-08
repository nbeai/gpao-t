import { selectModelAdapter } from "./adapter-boundary.js";

export function routeModel({ inputSignal, authorityDecision }) {
  const privacy = authorityDecision.requiredApprovals.includes("secret_or_account_boundary")
    ? "local_or_private"
    : "standard";
  const route = inputSignal.kind === "follow_up"
    ? "fast_context_recovery"
    : "balanced_reasoning";
  const preferredClass = route === "fast_context_recovery" ? "fast_low_latency" : "strong_reasoning";
  const adapterSelection = selectModelAdapter({
    preferredClass,
    privacy,
    fallbackClass: "local_small_model",
  });

  return {
    schema: "gpao_t.model_route.v0_1",
    status: "selected",
    route,
    privacy,
    preferredClass,
    fallbackClass: "local_small_model",
    adapterSelection,
    reason: route === "fast_context_recovery"
      ? "Short follow-up turns should recover active target before deep reasoning."
      : "The turn needs a balanced reasoning path.",
  };
}
