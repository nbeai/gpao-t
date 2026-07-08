const DESIGN_RECIPE_PATH = "docs/LOCAL-CONTROL-CENTER-DESIGN-RECIPE.md";
const README_PATH = "docs/README.md";
const SOURCE_DOCTRINE_PATH = "/Users/jyp/Documents/Playground 2/beai-harness-for-codex/design.md";

const OBJECT_TYPES = ["Work", "Context", "Evidence", "Growth", "Authority"];
const STATUS_LANGUAGE = ["ready", "review", "blocked", "approval_required", "not_applicable", "unknown"];
const REQUIRED_PANELS = [
  "Current Work",
  "Context Mesh",
  "Evidence / Replay",
  "Growth",
  "Authority",
  "Model / Tool Adapters",
  "Connectors",
  "Ops",
];

export function buildLocalControlCenterDesignContract() {
  return {
    schema: "gpao_t.local_control_center_design_contract.v0_1",
    status: "ready_for_static_ui_reader",
    sourceDoctrine: SOURCE_DOCTRINE_PATH,
    recipePath: DESIGN_RECIPE_PATH,
    surface: {
      type: "web-ui",
      job: "Show GPAO-T operating state, evidence, growth, authority, and next safe action.",
      currentUserState: "The user wants a Codex-like local AI OS surface that is fast, calm, transparent, and safe.",
      primaryDecision: "What should GPAO-T do next, and what remains gated?",
      visualDensity: "compact",
      tone: "operational",
    },
    documentationContract: {
      userReadableOverview: README_PATH,
      implementationTruthSource: "src/core/design-contract.js",
      executableSurfaces: ["gpao-t control design", "GET /control-center/design"],
    },
    informationArchitecture: {
      objectTypes: OBJECT_TYPES,
      requiredPanels: REQUIRED_PANELS,
      firstViewport: [
        "GPAO-T current state",
        "current work decision",
        "active context/evidence",
        "authority boundaries",
        "next safe action",
      ],
    },
    statusLanguage: STATUS_LANGUAGE,
    authorityBoundary: {
      externalModelCall: "must_be_visible_before_action",
      externalToolAction: "must_be_visible_before_action",
      connectorActivation: "must_be_visible_before_action",
      durableMemoryPromotion: "must_be_visible_before_action",
      liveGrowthMutation: "must_be_visible_before_action",
      installUpdateRollbackExecution: "must_be_visible_before_action",
      deployment: "must_be_visible_before_action",
      secretStorage: "must_be_visible_before_action",
    },
    implementationBoundary: {
      readsControlSnapshot: true,
      firstUiRole: "static_visual_reader_for_existing_control_snapshot",
      startsDaemon: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      appliesGrowthMutation: false,
      installsUpdatesRollsBackOrDeploys: false,
    },
    qualityGate: [
      "first_viewport_shows_actual_gpao_t_state",
      "current_target_and_next_safe_action_visible",
      "work_context_evidence_growth_authority_represented",
      "status_layers_are_distinct",
      "direct_evidence_outranks_generated_support",
      "authority_boundaries_visible_before_dangerous_actions",
      "text_fits_desktop_and_mobile",
      "no_cards_inside_cards",
      "no_marketing_hero",
      "no_hidden_external_action_or_live_mutation",
      "screenshot_or_render_evidence_required_for_visual_claims",
    ],
    nextSafeAction:
      "Build a static Local Control Center UI reader from buildControlCenterSnapshot() before adding interactivity, daemon behavior, or external activation.",
  };
}
