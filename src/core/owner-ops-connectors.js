const READ_ONLY_CONNECTORS = [
  {
    id: "local_csv_excel",
    label: "로컬 CSV/Excel 가져오기",
    ownerUse: "리뷰, 문의, 예약 내역을 파일로 받아 분류합니다.",
    sourceExamples: ["네이버 주문 export", "스마트스토어 문의 export", "예약표 CSV", "수기 Excel"],
    allowedNow: ["file_select", "local_parse", "local_summary", "local_preview"],
    blockedActions: ["file_overwrite", "external_upload", "customer_send", "credential_read"],
  },
  {
    id: "local_folder_watch_preview",
    label: "로컬 폴더 미리보기",
    ownerUse: "사장님이 저장해 둔 문의/리뷰 파일 폴더를 읽기 후보로 보여줍니다.",
    sourceExamples: ["다운로드 폴더", "매장 운영 폴더", "월별 리뷰 폴더"],
    allowedNow: ["folder_list_preview", "local_read_preview"],
    blockedActions: ["background_watch", "file_move", "file_delete", "external_sync"],
  },
  {
    id: "browser_copy_paste_intake",
    label: "브라우저 복사/붙여넣기",
    ownerUse: "외부 계정 연결 없이 화면에서 복사한 내용을 붙여넣어 처리합니다.",
    sourceExamples: ["지도 리뷰 복사", "카카오채널 문의 복사", "DM 문의 복사"],
    allowedNow: ["paste_intake", "local_classification", "draft_preview"],
    blockedActions: ["browser_control", "auto_reply", "external_send", "login_session_access"],
  },
  {
    id: "future_read_only_account_connector",
    label: "향후 읽기 전용 계정 커넥터",
    ownerUse: "충분한 승인/보안 설계 뒤 계정 자료를 읽기 전용으로 가져옵니다.",
    sourceExamples: ["스마트스토어", "네이버 플레이스", "Google Business Profile", "예약/캘린더"],
    allowedNow: [],
    blockedActions: ["oauth", "credential_store", "api_read", "api_write", "customer_send"],
  },
];

const MCP_TOOLS = [
  {
    name: "owner_ops.skill_pack",
    kind: "read_only",
    description: "한국 자영업자용 Owner Ops Pack 구조와 권한 경계를 반환합니다.",
    inputSchema: {},
    outputSchema: "gpao_t.owner_ops_skill_pack.v0_1",
    mapsToCli: "gpao-t owner-ops skill-pack",
  },
  {
    name: "owner_ops.candidates",
    kind: "read_only",
    description: "사업자 언어 입력에서 자동화 후보를 제안합니다.",
    inputSchema: {
      request: "string",
      businessType: "optional string",
    },
    outputSchema: "gpao_t.owner_ops_automation_candidates.v0_1",
    mapsToCli: "gpao-t owner-ops candidates <text>",
  },
  {
    name: "owner_ops.workflow_preview",
    kind: "read_only",
    description: "리뷰/쇼핑몰 문의/예약 문의를 외부 실행 없이 로컬 초안으로 미리봅니다.",
    inputSchema: {
      workflowType: "review_reply | shopping_inquiry | reservation_inquiry",
      inputText: "string",
      businessType: "optional string",
    },
    outputSchema: "gpao_t.owner_ops_workflow_preview.v0_1",
    mapsToCli: "gpao-t owner-ops workflow <workflowType> <text>",
  },
  {
    name: "owner_ops.intake_preview",
    kind: "read_only",
    description: "붙여넣기, CSV/TSV, 로컬 파일, 로컬 폴더를 외부 연결 없이 Owner Ops workflow preview로 연결합니다.",
    inputSchema: {
      intakeType: "paste | table_text | local_file | local_folder",
      inputText: "optional string",
      content: "optional string",
      filename: "optional string",
      filePath: "optional string",
      folderPath: "optional string",
      workflowType: "optional workflow id",
    },
    outputSchema: "gpao_t.owner_ops_*_intake_preview.v0_1",
    mapsToCli: "gpao-t owner-ops intake <paste|table|file|folder> ...",
  },
  {
    name: "owner_ops.local_record_write",
    kind: "local_write",
    description: "사용자 확인 후 외부 전송 없이 로컬 JSONL 기록만 남깁니다.",
    inputSchema: {
      workflowType: "review_reply | shopping_inquiry | reservation_inquiry",
      inputText: "string",
      userDecision: "preview_accepted_for_local_record | rejected",
    },
    outputSchema: "gpao_t.owner_ops_local_record_write.v0_1",
    mapsToCli: "gpao-t owner-ops record <workflowType> <text>",
    approvalRequired: true,
  },
  {
    name: "owner_ops.replay",
    kind: "read_only",
    description: "로컬 기록을 바탕으로 반복 효과와 다음 개선 후보를 요약합니다.",
    inputSchema: {},
    outputSchema: "gpao_t.owner_ops_effect_replay.v0_1",
    mapsToCli: "gpao-t owner-ops replay",
  },
];

export function buildOwnerOpsMcpPlan() {
  return {
    schema: "gpao_t.owner_ops_mcp_plan.v0_1",
    status: "ready",
    goal:
      "Owner Ops Pack을 Codex, OpenClaw, Claude Code에서 공통으로 호출 가능한 로컬 MCP/CLI 도구 표면으로 확장한다.",
    documentRef: "docs/04-skill-ecosystem/OWNER-OPS-MCP-CONNECTOR-PLAN-ko.md",
    compatibilityTargets: [
      {
        id: "codex",
        transport: ["stdio MCP", "local CLI"],
        fit: "Codex가 로컬 파일/작업 맥락과 함께 Owner Ops workflow preview를 호출할 수 있다.",
      },
      {
        id: "openclaw",
        transport: ["stdio MCP", "gateway wrapper", "local CLI"],
        fit: "OpenClaw의 skills/gateway 구조에서 Owner Ops를 도구형 leaf capability로 감쌀 수 있다.",
      },
      {
        id: "claude_code",
        transport: ["stdio MCP", "local CLI"],
        fit: "Claude Code가 동일한 MCP tool manifest를 읽어 로컬 preview와 replay를 호출할 수 있다.",
      },
    ],
    toolManifest: MCP_TOOLS,
    connectorCatalog: READ_ONLY_CONNECTORS,
    rolloutOrder: [
      "skill_pack_no_api_workflows",
      "mcp_tool_manifest",
      "read_only_connector_catalog",
      "local_record_and_replay",
      "connector_permission_check",
      "plugin_market_packaging",
    ],
    authorityBoundary: {
      allowedNow: ["read_only_tools", "local_preview", "local_jsonl_record_after_user_confirmation"],
      blockedUntilLater: [
        "oauth",
        "credential_store",
        "api_read",
        "api_write",
        "customer_message_send",
        "review_posting",
        "payment_refund_delete",
        "background_automation",
      ],
    },
    nextSafeAction: "Implement a stdio MCP wrapper only after this manifest passes replay in Codex/OpenClaw/Claude Code.",
  };
}

export function buildOwnerOpsConnectorCatalog() {
  return {
    schema: "gpao_t.owner_ops_connector_catalog.v0_1",
    status: "ready",
    policy: "manual_or_read_only_first",
    connectors: READ_ONLY_CONNECTORS,
    firstIntegrationRule:
      "처음에는 API 계정 연결보다 CSV/Excel/붙여넣기/로컬 폴더 미리보기로 시작한다.",
    rejectionRules: [
      "계정 로그인/토큰/쿠키를 먼저 요구하는 커넥터는 v0.1에서 보류한다.",
      "고객에게 직접 발송하거나 리뷰를 자동 게시하는 커넥터는 별도 승인/감사/롤백 전까지 거부한다.",
      "결제, 환불, 삭제, 예약 확정 같은 되돌리기 어려운 행동은 Owner Ops v0.1 범위 밖이다.",
    ],
  };
}

export function buildOwnerOpsMcpToolManifest() {
  return {
    schema: "gpao_t.owner_ops_mcp_tool_manifest.v0_1",
    status: "ready",
    serverName: "gpao-t-owner-ops",
    protocolTarget: "mcp_stdio_compatible",
    tools: MCP_TOOLS,
    nonGoals: [
      "live customer send",
      "credential management",
      "external account mutation",
      "paid or destructive action",
      "unattended recurring automation",
    ],
  };
}

export function verifyOwnerOpsMcpReadiness() {
  const plan = buildOwnerOpsMcpPlan();
  const catalog = buildOwnerOpsConnectorCatalog();
  const manifest = buildOwnerOpsMcpToolManifest();
  const findings = [];

  if (plan.compatibilityTargets.length < 3) findings.push("needs_codex_openclaw_claude_targets");
  if (!manifest.tools.some((tool) => tool.name === "owner_ops.workflow_preview")) {
    findings.push("workflow_preview_tool_missing");
  }
  if (!manifest.tools.some((tool) => tool.name === "owner_ops.local_record_write" && tool.approvalRequired)) {
    findings.push("local_record_write_must_require_approval");
  }
  if (!catalog.rejectionRules.some((rule) => rule.includes("고객에게 직접 발송"))) {
    findings.push("customer_send_rejection_missing");
  }
  if (!plan.authorityBoundary.blockedUntilLater.includes("oauth")) findings.push("oauth_must_remain_blocked");

  return {
    schema: "gpao_t.owner_ops_mcp_readiness_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedTargets: plan.compatibilityTargets.map((target) => target.id),
    checkedToolCount: manifest.tools.length,
    checkedConnectorCount: catalog.connectors.length,
    nextSafeAction: findings.length
      ? "Fix MCP/connector readiness findings before writing a server wrapper."
      : "Proceed to a no-network stdio MCP wrapper scaffold with these tools and blocked action rules.",
  };
}
