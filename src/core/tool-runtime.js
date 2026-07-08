import { selectToolAdapters } from "./adapter-boundary.js";

export function buildToolPlan({ inputSignal, authorityDecision }) {
  const canUseLocalTools = authorityDecision.status === "allowed"
    || authorityDecision.allowedActions.includes("local_preview");
  const requestedTools = inputSignal.kind === "artifact_request" || inputSignal.kind === "follow_up"
    ? ["local_replay", "local_draft"]
    : ["local_draft"];
  const adapterSelection = selectToolAdapters({ authorityDecision, requestedTools });

  return {
    schema: "gpao_t.tool_plan.v0_1",
    status: canUseLocalTools ? "preview" : "blocked",
    admittedTools: adapterSelection.admitted.map((adapter) => adapter.id),
    blockedTools: authorityDecision.blockedActions,
    adapterSelection,
    reason: inputSignal.kind === "artifact_request"
      ? "Artifact-oriented turns may use local preview tools before any live action."
      : "No tool execution is required beyond local reasoning for this skeleton.",
  };
}
