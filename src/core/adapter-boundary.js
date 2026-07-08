const MODEL_ADAPTERS = [
  {
    id: "local.fast.stub",
    provider: "local",
    classes: ["fast_low_latency", "local_small_model"],
    privacy: "local_or_private",
    status: "available",
    executionMode: "local_preview",
    authority: "local_only",
  },
  {
    id: "local.reasoning.stub",
    provider: "local",
    classes: ["strong_reasoning", "local_small_model"],
    privacy: "local_or_private",
    status: "available",
    executionMode: "local_preview",
    authority: "local_only",
  },
  {
    id: "external.fast.api.preview",
    provider: "external_api",
    classes: ["fast_low_latency"],
    privacy: "standard",
    status: "blocked_until_configured",
    executionMode: "plan_only",
    authority: "external_model_call_requires_setup",
  },
  {
    id: "external.reasoning.api.preview",
    provider: "external_api",
    classes: ["strong_reasoning"],
    privacy: "standard",
    status: "blocked_until_configured",
    executionMode: "plan_only",
    authority: "external_model_call_requires_setup",
  },
];

const TOOL_ADAPTERS = [
  {
    id: "local_file_read",
    kind: "local_read",
    status: "available",
    executionMode: "local_preview",
    authority: "local_only",
  },
  {
    id: "local_replay",
    kind: "local_replay",
    status: "available",
    executionMode: "local_preview",
    authority: "local_only",
  },
  {
    id: "local_draft",
    kind: "local_draft",
    status: "available",
    executionMode: "local_preview",
    authority: "local_only",
  },
  {
    id: "external_send",
    kind: "external_action",
    status: "blocked",
    executionMode: "requires_approval",
    authority: "external_send",
  },
  {
    id: "public_release",
    kind: "distribution",
    status: "blocked",
    executionMode: "requires_approval",
    authority: "public_release_or_distribution",
  },
];

export function listModelAdapters() {
  return {
    schema: "gpao_t.model_adapter_registry.v0_1",
    status: "ready",
    adapters: MODEL_ADAPTERS,
    nextSafeAction: "Select from local preview adapters until external model credentials and approval gates exist.",
  };
}

export function listToolAdapters() {
  return {
    schema: "gpao_t.tool_adapter_registry.v0_1",
    status: "ready",
    adapters: TOOL_ADAPTERS,
    nextSafeAction: "Use local preview tools before any external action, distribution, deletion, or secret boundary.",
  };
}

export function selectModelAdapter({
  preferredClass,
  fallbackClass = "local_small_model",
  privacy = "standard",
} = {}) {
  const candidates = MODEL_ADAPTERS.filter((adapter) => adapter.classes.includes(preferredClass));
  const privacySafe = candidates.filter((adapter) =>
    privacy === "local_or_private" ? adapter.provider === "local" : true,
  );
  const selected = privacySafe.find((adapter) => adapter.status === "available")
    || MODEL_ADAPTERS.find((adapter) =>
      adapter.classes.includes(fallbackClass) && adapter.status === "available"
    );

  return {
    schema: "gpao_t.model_adapter_selection.v0_1",
    status: selected ? "selected" : "blocked",
    preferredClass,
    fallbackClass,
    privacy,
    selected,
    considered: privacySafe.map((adapter) => ({
      id: adapter.id,
      status: adapter.status,
      executionMode: adapter.executionMode,
    })),
    blocked: candidates
      .filter((adapter) => adapter.status !== "available" || (privacy === "local_or_private" && adapter.provider !== "local"))
      .map((adapter) => ({
        id: adapter.id,
        reason: adapter.status === "available"
          ? "privacy boundary requires local/private model"
          : adapter.status,
      })),
    nextSafeAction: selected
      ? "Use selected adapter only as local preview until provider execution is explicitly connected."
      : "Configure a local adapter or request approval for an external model provider.",
  };
}

export function selectToolAdapters({ authorityDecision, requestedTools = [] } = {}) {
  const allowed = new Set(authorityDecision?.allowedActions || []);
  const blockedAuthority = new Set(authorityDecision?.requiredApprovals || []);
  const localPreviewAllowed = allowed.has("local_preview");
  const tools = requestedTools.length ? requestedTools : ["local_replay", "local_draft"];

  const selections = tools.map((toolId) => {
    const adapter = TOOL_ADAPTERS.find((item) => item.id === toolId);
    if (!adapter) {
      return { id: toolId, status: "blocked", reason: "unknown_tool_adapter" };
    }
    if (adapter.authority === "local_only" && localPreviewAllowed) {
      return { ...adapter, status: "admitted" };
    }
    if (blockedAuthority.has(adapter.authority) || adapter.status === "blocked") {
      return { ...adapter, status: "blocked", reason: "requires_explicit_approval" };
    }
    return { ...adapter, status: "blocked", reason: "not_admitted_for_current_turn" };
  });

  return {
    schema: "gpao_t.tool_adapter_selection.v0_1",
    status: selections.some((item) => item.status === "admitted") ? "preview" : "blocked",
    admitted: selections.filter((item) => item.status === "admitted"),
    blocked: selections.filter((item) => item.status !== "admitted"),
    nextSafeAction: "Execute only admitted local preview tools; keep blocked tools behind approval and replay gates.",
  };
}

export function buildAdapterPlan({ modelRoute, toolPlan } = {}) {
  return {
    schema: "gpao_t.adapter_plan.v0_1",
    adapterBoundary: "visible_selection_and_execution_boundary",
    status: modelRoute?.adapterSelection?.status === "selected" ? "preview" : "blocked",
    model: modelRoute?.adapterSelection || null,
    tools: toolPlan?.adapterSelection || null,
    executionBoundary: {
      externalModelCall: "blocked_until_configured_and_approved",
      externalToolAction: "blocked_until_explicit_approval",
      localPreview: "allowed",
      secrets: "not_stored",
    },
    nextSafeAction: "Keep adapter work in local preview until provider setup, authority approval, replay, and audit gates exist.",
  };
}
