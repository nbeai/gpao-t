import {
  buildOwnerOpsAuthorityMatrix,
  buildOwnerOpsSkillPack,
} from "./owner-ops.js";
import {
  buildOwnerOpsConnectorCatalog,
  buildOwnerOpsMcpPlan,
  buildOwnerOpsMcpToolManifest,
} from "./owner-ops-connectors.js";
import {
  buildOwnerOpsFirstOwnerScenarioFixture,
  verifyOwnerOpsFirstOwnerScenario,
} from "./owner-ops-scenarios.js";

export function buildOwnerOpsPluginPackageManifest() {
  const skillPack = buildOwnerOpsSkillPack();
  const mcpPlan = buildOwnerOpsMcpPlan();
  const manifest = buildOwnerOpsMcpToolManifest();
  const scenario = buildOwnerOpsFirstOwnerScenarioFixture();

  return {
    schema: "gpao_t.owner_ops_plugin_package_manifest.v0_1",
    status: "ready",
    packageId: "gpao-t-owner-ops",
    displayName: "사장님 자동화 도우미",
    shortDescription: "한국 자영업자가 리뷰, 문의, 예약 같은 반복 업무를 안전한 초안과 로컬 기록으로 바꾸는 Owner Ops 패키지.",
    targetUsers: [
      "스마트스토어 / 쇼핑몰 사장님",
      "음식점 / 카페 사장님",
      "미용 / 예약 기반 서비스 운영자",
      "학원 / 레슨 / 소규모 상담 운영자",
    ],
    capabilitySummary: [
      "사업자 언어에서 자동화 후보를 찾는다.",
      "붙여넣기, CSV/TSV, 로컬 파일, 로컬 폴더를 읽기 전용으로 미리본다.",
      "고객 전송 전 답변 초안과 확인 필요 항목을 만든다.",
      "사용자 확인 후 로컬 JSONL 기록만 남긴다.",
      "replay로 반복 업무와 다음 자동화 후보를 확인한다.",
      "MCP stdio wrapper로 Codex, OpenClaw, Claude Code에서 공통 호출할 수 있다.",
    ],
    installSurfaces: [
      {
        id: "local_cli",
        label: "Local CLI",
        command: "node bin/gpao-t.js owner-ops first-owner-scenario-check",
        state: "ready",
      },
      {
        id: "stdio_mcp",
        label: "Stdio MCP",
        command: "node bin/gpao-t-owner-ops-mcp.js",
        state: "ready",
      },
      {
        id: "gateway",
        label: "Local Gateway",
        routes: [
          "GET /owner-ops/first-owner-scenario",
          "POST /owner-ops/first-owner-scenario/run",
          "GET /owner-ops/first-owner-scenario/verify",
        ],
        state: "ready",
      },
    ],
    compatibilityTargets: mcpPlan.compatibilityTargets,
    toolManifest: manifest.tools.map((tool) => ({
      name: tool.name,
      kind: tool.kind,
      approvalRequired: Boolean(tool.approvalRequired),
      description: tool.description,
    })),
    firstDemoScenario: scenario.scenario,
    authorityBoundary: {
      allowedNow: buildOwnerOpsAuthorityMatrix().allowedNow,
      blockedNow: [
        "customer_message_send",
        "review_posting",
        "oauth_or_credentials",
        "external_network",
        "payment_refund_delete",
        "bulk_message",
        "background_automation",
        "durable_memory_promotion",
      ],
    },
    marketReadiness: {
      state: "local_package_ready",
      publicListing: "not_published",
      accountConnector: "not_enabled",
      requiredBeforePublicMarket: [
        "human alpha test with Korean owner-operator sample cases",
        "UI copy review for non-developer owners",
        "privacy notice and local-data explanation",
        "installer/update/rollback packaging",
        "connector security review before OAuth/API use",
      ],
    },
  };
}

export function buildOwnerOpsMarketListingDraft() {
  const manifest = buildOwnerOpsPluginPackageManifest();
  return {
    schema: "gpao_t.owner_ops_market_listing_draft.v0_1",
    status: "ready",
    packageId: manifest.packageId,
    title: manifest.displayName,
    subtitle: "반복 문의를 안전한 초안과 로컬 기록으로 바꾸는 한국 자영업 운영팩",
    problem:
      "리뷰 답변, 배송/교환 문의, 예약 상담은 매일 반복되지만 대부분의 사장님은 자동화 흐름을 직접 설계하기 어렵다.",
    value:
      "Owner Ops는 계정 연결 없이 붙여넣기와 CSV부터 시작해 분류, 초안, 확인 필요 항목, 로컬 기록, replay를 한 번에 제공한다.",
    firstDemo:
      "스마트스토어 문의 CSV를 붙여넣으면 배송/교환/재입고 문의를 나누고 답변 초안을 만든 뒤 로컬 기록만 남긴다.",
    safetyCopy:
      "고객에게 자동 전송하지 않습니다. 환불, 주문 취소, 결제, 리뷰 게시, 외부 계정 연결은 별도 승인과 검증 전까지 잠겨 있습니다.",
    setupSteps: [
      "Owner Ops 패키지를 로컬 GPAO-T에 둔다.",
      "`gpao-t owner-ops first-owner-scenario-check`로 첫 시나리오를 확인한다.",
      "필요하면 `gpao-t-owner-ops-mcp`를 Codex/OpenClaw/Claude Code의 로컬 MCP 서버로 등록한다.",
      "실제 자료는 붙여넣기나 CSV/TSV preview부터 시작한다.",
    ],
    notYet: [
      "공개 마켓 게시",
      "OAuth/API 계정 연결",
      "고객 메시지 자동 발송",
      "환불/주문 취소/결제",
      "백그라운드 반복 자동화",
    ],
  };
}

export function verifyOwnerOpsPluginPackage({ root } = {}) {
  const manifest = buildOwnerOpsPluginPackageManifest();
  const listing = buildOwnerOpsMarketListingDraft();
  const scenarioCheck = verifyOwnerOpsFirstOwnerScenario({ root });
  const catalog = buildOwnerOpsConnectorCatalog();
  const findings = [];

  if (manifest.status !== "ready") findings.push("manifest_not_ready");
  if (listing.status !== "ready") findings.push("listing_not_ready");
  if (scenarioCheck.status !== "ready") findings.push("first_scenario_not_ready");
  if (!manifest.toolManifest.some((tool) => tool.name === "owner_ops.intake_preview")) {
    findings.push("intake_tool_missing");
  }
  if (!manifest.installSurfaces.some((surface) => surface.id === "stdio_mcp")) {
    findings.push("stdio_mcp_install_surface_missing");
  }
  if (!catalog.connectors.some((connector) => connector.id === "local_csv_excel")) {
    findings.push("local_csv_excel_connector_missing");
  }
  if (!manifest.authorityBoundary.blockedNow.includes("customer_message_send")) {
    findings.push("customer_send_not_blocked");
  }
  if (manifest.marketReadiness.publicListing !== "not_published") {
    findings.push("public_market_must_remain_unpublished");
  }

  return {
    schema: "gpao_t.owner_ops_plugin_package_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedPackage: manifest.packageId,
    checkedSurfaces: ["CLI", "stdio MCP", "Gateway", "first demo scenario", "market listing draft"],
    publicRelease: "not_published",
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix package findings before team alpha handoff."
      : "Prepare team alpha instructions and owner-facing UX copy; do not publish or connect live accounts yet.",
  };
}
