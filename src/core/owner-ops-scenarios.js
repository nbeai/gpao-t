import {
  buildOwnerOpsAutomationCandidates,
  buildOwnerOpsEffectReplay,
  buildOwnerOpsWorkflowPreview,
  writeOwnerOpsLocalRecord,
} from "./owner-ops.js";
import { handleOwnerOpsMcpMessage } from "./owner-ops-mcp-server.js";
import { previewOwnerOpsTableTextIntake } from "./owner-ops-intake-connectors.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIRST_OWNER_SCENARIO = {
  id: "smartstore_inquiry_csv_to_local_draft",
  title: "스마트스토어 문의 CSV를 초안과 로컬 기록으로 바꾸기",
  ownerStory:
    "스마트스토어 사장님이 배송, 교환, 재입고 문의를 CSV로 붙여넣고, 고객에게 보내기 전에 분류와 답변 초안을 확인한다.",
  businessType: "smartstore_shop",
  workflowType: "shopping_inquiry",
  filename: "smartstore-inquiries.csv",
  csv: [
    "문의,상태",
    "배송 언제 출발하나요?,신규",
    "사이즈가 안 맞으면 교환 가능한가요?,신규",
    "블랙 색상 재입고 언제 되나요?,신규",
  ].join("\n"),
};

export function buildOwnerOpsFirstOwnerScenarioFixture() {
  return {
    schema: "gpao_t.owner_ops_first_owner_scenario_fixture.v0_1",
    status: "ready",
    scenario: FIRST_OWNER_SCENARIO,
    userVisibleFlow: [
      "CSV/붙여넣기 자료를 읽는다.",
      "쇼핑몰 문의 분류와 자동화 후보를 보여준다.",
      "고객 전송 전 답변 초안을 만든다.",
      "사장님 확인 후 로컬 approval/audit 성격의 기록만 남긴다.",
      "replay로 이번 기록과 다음 자동화 후보를 확인한다.",
    ],
    smokeTargets: [
      "CLI: gpao-t owner-ops first-owner-scenario-check",
      "Gateway: GET /owner-ops/first-owner-scenario/verify",
      "MCP: initialize -> tools/list -> owner_ops.intake_preview",
    ],
    blockedActions: [
      "customer_message_send",
      "external_network",
      "oauth_or_credential",
      "refund",
      "cancel_order",
      "bulk_message",
      "background_automation",
      "durable_memory_promotion",
    ],
    completionRule:
      "한 명의 한국 자영업자가 CSV/붙여넣기 자료에서 분류, 초안, 로컬 기록, replay, MCP host smoke까지 같은 시나리오로 확인할 수 있어야 한다.",
  };
}

export function runOwnerOpsFirstOwnerScenario({ root, now = "2026-07-11T00:00:00.000Z" } = {}) {
  const fixture = buildOwnerOpsFirstOwnerScenarioFixture();
  const { scenario } = fixture;
  const intake = previewOwnerOpsTableTextIntake({
    filename: scenario.filename,
    content: scenario.csv,
    workflowType: scenario.workflowType,
    businessType: scenario.businessType,
  });
  const previewInput = intake.workflowPreview?.input?.preview?.join("\n") || scenario.csv;
  const candidates = buildOwnerOpsAutomationCandidates({
    request: "스마트스토어 배송 문의와 교환 문의가 너무 많아서 분류하고 답장 초안을 만들고 싶어요.",
    businessType: scenario.businessType,
  });
  const workflow = buildOwnerOpsWorkflowPreview({
    workflowType: scenario.workflowType,
    inputText: previewInput,
    businessType: scenario.businessType,
  });
  const recordWrite = writeOwnerOpsLocalRecord({
    root,
    workflowType: scenario.workflowType,
    inputText: previewInput,
    businessType: scenario.businessType,
    userDecision: "preview_accepted_for_local_record",
    now,
  });
  const replay = buildOwnerOpsEffectReplay({ root });
  const mcpSmoke = runOwnerOpsMcpHostSmoke({ root, scenario });
  const findings = collectScenarioFindings({ intake, candidates, workflow, recordWrite, replay, mcpSmoke });

  return {
    schema: "gpao_t.owner_ops_first_owner_scenario_run.v0_1",
    status: findings.length ? "blocked" : "ready",
    scenarioId: scenario.id,
    ownerStory: scenario.ownerStory,
    steps: {
      intake,
      candidates,
      workflow,
      localRecord: {
        status: recordWrite.status,
        id: recordWrite.record?.id,
        boundaryState: recordWrite.boundaryState,
      },
      replay,
      mcpSmoke,
    },
    blockedActionsRemainBlocked: fixture.blockedActions,
    findings,
    nextSafeAction: findings.length
      ? "Fix the first owner scenario before packaging Owner Ops for plugin or market distribution."
      : "Package this scenario as the first owner-facing demo before adding live account connectors.",
  };
}

export function verifyOwnerOpsFirstOwnerScenario({ root } = {}) {
  const fixture = buildOwnerOpsFirstOwnerScenarioFixture();
  const verificationRoot = mkdtempSync(join(tmpdir(), "gpao-t-owner-ops-scenario-verify-"));
  const run = runOwnerOpsFirstOwnerScenario({ root: verificationRoot });
  const findings = [...run.findings];

  if (fixture.status !== "ready") findings.push("fixture_not_ready");
  if (run.status !== "ready") findings.push("scenario_run_not_ready");
  if (run.steps.localRecord.boundaryState?.externalSend !== false) findings.push("external_send_boundary_broken");
  if (!run.steps.mcpSmoke.checkedMethods.includes("tools/call")) findings.push("mcp_tools_call_not_checked");

  return {
    schema: "gpao_t.owner_ops_first_owner_scenario_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedScenario: fixture.scenario.id,
    checkedSurfaces: ["fixture", "CLI", "Gateway", "MCP host smoke", "local record", "replay"],
    localWriteBoundary: "local JSONL record only",
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix scenario findings before plugin/market packaging."
      : "Move to Owner Ops plugin/market package surface with this first-scenario smoke as the baseline.",
  };
}

export function runOwnerOpsMcpHostSmoke({ root, scenario = FIRST_OWNER_SCENARIO } = {}) {
  const initialized = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05" },
  }, { root });
  const tools = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  }, { root });
  const intakePreview = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "owner_ops.intake_preview",
      arguments: {
        intakeType: "table_text",
        filename: scenario.filename,
        content: scenario.csv,
        workflowType: scenario.workflowType,
        businessType: scenario.businessType,
      },
    },
  }, { root });
  const blockedWrite = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "owner_ops.local_record_write",
      arguments: {
        workflowType: scenario.workflowType,
        inputText: scenario.csv,
        businessType: scenario.businessType,
      },
    },
  }, { root });

  const text = intakePreview.result?.content?.[0]?.text || "";
  const findings = [];
  if (initialized.result?.serverInfo?.name !== "gpao-t-owner-ops") findings.push("mcp_initialize_failed");
  if (!tools.result?.tools?.some((tool) => tool.name === "owner_ops.intake_preview")) {
    findings.push("mcp_intake_tool_missing");
  }
  if (!text.includes("gpao_t.owner_ops_table_text_intake_preview.v0_1")) {
    findings.push("mcp_intake_preview_failed");
  }
  if (blockedWrite.result?.isError !== true) findings.push("mcp_unconfirmed_write_not_blocked");

  return {
    schema: "gpao_t.owner_ops_mcp_host_smoke.v0_1",
    status: findings.length ? "blocked" : "ready",
    checkedMethods: ["initialize", "tools/list", "tools/call"],
    checkedTools: ["owner_ops.intake_preview", "owner_ops.local_record_write"],
    toolCount: tools.result?.tools?.length || 0,
    blockedWriteStatus: blockedWrite.result?.isError === true ? "blocked_without_confirmation" : "unexpected",
    findings,
  };
}

function collectScenarioFindings({ intake, candidates, workflow, recordWrite, replay, mcpSmoke }) {
  const findings = [];
  if (intake.status !== "ready") findings.push("intake_not_ready");
  if (candidates.candidates?.[0]?.id !== "shopping_inquiry") findings.push("shopping_inquiry_not_top_candidate");
  if (workflow.workflow?.id !== "shopping_inquiry") findings.push("workflow_not_shopping_inquiry");
  if (!workflow.userConfirmation?.stillLocked?.includes("external_send")) {
    findings.push("external_send_not_locked");
  }
  if (recordWrite.status !== "written_local_only") findings.push("local_record_not_written");
  if (recordWrite.boundaryState?.externalSend !== false) findings.push("external_send_boundary_broken");
  if (replay.totalRecords < 1) findings.push("replay_missing_record");
  if (mcpSmoke.status !== "ready") findings.push("mcp_smoke_not_ready");
  return findings;
}
