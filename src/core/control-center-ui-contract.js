const UI_SCHEMA_FILE = "schema/gpao-t-control-center-ui-schema.json";

const VISUAL_SECTIONS = [
  {
    id: "topbar",
    label: "Top Bar",
    objectType: "Work",
    requiredFields: ["title", "subtitle", "overallStatus"],
    sourceFields: ["snapshot.status", "snapshot.surface"],
  },
  {
    id: "operating_objects",
    label: "Operating Objects",
    objectType: "Context",
    requiredFields: ["objectType", "panelCount"],
    sourceFields: ["design.informationArchitecture.objectTypes", "snapshot.panels"],
  },
  {
    id: "decision_strip",
    label: "Decision Strip",
    objectType: "Evidence",
    requiredFields: ["panels", "blocked", "review", "evidence"],
    sourceFields: ["snapshot.counts.panels", "snapshot.counts.blocked", "snapshot.counts.review", "snapshot.counts.recoveryRecords"],
  },
  {
    id: "panel_grid",
    label: "Panel Grid",
    objectType: "Work",
    requiredFields: ["panelId", "group", "label", "status", "headline", "nextSafeAction"],
    sourceFields: ["snapshot.panels[].id", "snapshot.panels[].status", "snapshot.panels[].headline", "snapshot.panels[].nextSafeAction"],
  },
  {
    id: "authority_aside",
    label: "Authority Aside",
    objectType: "Authority",
    requiredFields: ["nextSafeAction", "authorityBoundary", "designGate"],
    sourceFields: ["snapshot.nextSafeAction", "snapshot.authorityBoundary", "design.qualityGate"],
  },
];

const REQUIRED_PANEL_FIELDS = ["id", "label", "status", "headline", "nextSafeAction"];
const REQUIRED_STATUS_VALUES = ["ready", "review", "blocked", "approval_required", "not_applicable", "unknown"];

export function buildControlCenterUiContract() {
  return {
    schema: "gpao_t.control_center_ui_contract.v0_1",
    status: "ready",
    schemaFile: UI_SCHEMA_FILE,
    sourceContracts: [
      "gpao_t.control_center_snapshot.v0_1",
      "gpao_t.local_control_center_design_contract.v0_1",
    ],
    renderedSurface: {
      kind: "static_html_reader",
      defaultOutputPath: ".gpao-t/control-center/index.html",
      executableSurfaces: ["gpao-t control html", "gpao-t control render [output.html]"],
      interactionMode: "no_script_local_inspection",
      interactionSurfaces: ["anchor_panel_navigation", "details_summary_panel_inspector"],
    },
    visualSections: VISUAL_SECTIONS,
    requiredPanelFields: REQUIRED_PANEL_FIELDS,
    statusLanguage: REQUIRED_STATUS_VALUES,
    panelGroupMap: {
      runtime: "Work",
      "skill-ecosystem": "Work",
      memory: "Context",
      recovery: "Evidence",
      growth: "Growth",
      authority: "Authority",
      adapters: "Authority",
      connectors: "Authority",
      ops: "Authority",
    },
    authorityBoundary: {
      startsDaemon: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      appliesGrowthMutation: false,
      installsUpdatesRollsBackOrDeploys: false,
      deploysOrPublishes: false,
    },
    validationRules: [
      "Every rendered panel must preserve id, label, status, headline, and nextSafeAction.",
      "Every rendered status must include visible text, not only color.",
      "The first scan must include next safe action and authority boundaries.",
      "The static reader must not include scripts or live external actions.",
      "Initial interactivity must use no-script local inspection controls only.",
      "Renderer output must report static_html_file_written before visual quality claims.",
    ],
    nextSafeAction:
      "Use this UI contract as the boundary before adding richer browser behavior or desktop shell behavior.",
  };
}

export function buildControlCenterUiSnapshot({ snapshot, designContract, uiContract } = {}) {
  const contract = uiContract || buildControlCenterUiContract();
  const design = designContract || buildLocalControlCenterDesignContract();
  const panels = snapshot?.panels || [];
  const authorityBoundary = snapshot?.authorityBoundary || {};

  return {
    schema: "gpao_t.control_center_ui_snapshot.v0_1",
    status: snapshot?.status || "unknown",
    sourceSnapshotSchema: snapshot?.schema || "missing_snapshot",
    sourceDesignSchema: design.schema,
    uiContractSchema: contract.schema,
    generatedAt: snapshot?.generatedAt || null,
    firstViewport: {
      title: "GPAO-T Local Control Center",
      subtitle: "정적 UI reader · 외부 활성화 없음",
      overallStatus: snapshot?.status || "unknown",
      counts: {
        panels: snapshot?.counts?.panels ?? panels.length,
        blocked: snapshot?.counts?.blocked ?? panels.filter((panel) => panel.status === "blocked").length,
        review: snapshot?.counts?.review ?? panels.filter((panel) => panel.status === "review").length,
        evidence: snapshot?.counts?.recoveryRecords ?? 0,
      },
      nextSafeAction: snapshot?.nextSafeAction || "Snapshot is missing next safe action.",
    },
    operatingObjects: (design.informationArchitecture?.objectTypes || []).map((type) => ({
      type,
      panelCount: panels.filter((panel) => contract.panelGroupMap[panel.id] === type).length,
    })),
    panels: panels.map((panel) => ({
      id: panel.id,
      group: contract.panelGroupMap[panel.id] || "Work",
      label: panel.label,
      status: panel.status,
      headline: panel.headline,
      nextSafeAction: panel.nextSafeAction,
    })),
    authorityBoundary,
    designGate: design.qualityGate || [],
    renderPolicy: contract.renderedSurface,
    validation: {
      requiredPanelFields: contract.requiredPanelFields,
      statusLanguage: contract.statusLanguage,
      noScript: true,
      interactionMode: contract.renderedSurface.interactionMode,
      noExternalActivation: Object.values(contract.authorityBoundary).every((value) => value === false),
    },
  };
}

export function validateControlCenterUiSnapshot({ uiSnapshot } = {}) {
  const findings = [];
  if (!uiSnapshot) {
    findings.push({ severity: "P0", message: "UI snapshot is required." });
  } else {
    if (uiSnapshot.schema !== "gpao_t.control_center_ui_snapshot.v0_1") {
      findings.push({ severity: "P0", message: "Unexpected UI snapshot schema." });
    }
    if (!uiSnapshot.firstViewport?.nextSafeAction) {
      findings.push({ severity: "P0", message: "Next safe action must be visible in the first viewport." });
    }
    if (!uiSnapshot.panels?.length) {
      findings.push({ severity: "P0", message: "At least one panel must be rendered." });
    }
    for (const panel of uiSnapshot.panels || []) {
      for (const field of REQUIRED_PANEL_FIELDS) {
        if (!panel[field]) {
          findings.push({
            severity: "P0",
            panelId: panel.id || "unknown",
            message: `Rendered panel is missing ${field}.`,
          });
        }
      }
      if (!REQUIRED_STATUS_VALUES.includes(panel.status)) {
        findings.push({
          severity: "P1",
          panelId: panel.id,
          message: `Rendered panel has an unknown status: ${panel.status}.`,
        });
      }
    }
    if (!Object.keys(uiSnapshot.authorityBoundary || {}).length) {
      findings.push({ severity: "P0", message: "Authority boundaries must be visible." });
    }
    if (uiSnapshot.validation?.noExternalActivation !== true) {
      findings.push({ severity: "P0", message: "UI snapshot must preserve no external activation." });
    }
    if (uiSnapshot.validation?.interactionMode !== "no_script_local_inspection") {
      findings.push({ severity: "P0", message: "Initial UI interactivity must remain no-script local inspection." });
    }
  }

  return {
    schema: "gpao_t.control_center_ui_validation.v0_1",
    status: findings.some((finding) => finding.severity === "P0")
      ? "blocked"
      : findings.length
      ? "review"
      : "ready",
    findings,
    nextSafeAction: findings.length
      ? "Fix UI snapshot contract findings before adding interactive UI behavior."
      : "Render the local inspection UI from this snapshot before adding richer browser behavior.",
  };
}
import { buildLocalControlCenterDesignContract } from "./design-contract.js";
