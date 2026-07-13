import { buildOwnerOpsMcpServerDescriptor } from "./owner-ops-mcp-server.js";
import { buildOwnerOpsTeamAlphaGuide, verifyOwnerOpsTeamAlphaReadiness } from "./owner-ops-alpha.js";

export function buildOwnerOpsHostRegistrationGuide() {
  const descriptor = buildOwnerOpsMcpServerDescriptor();
  const alpha = buildOwnerOpsTeamAlphaGuide();

  return {
    schema: "gpao_t.owner_ops_host_registration_guide.v0_1",
    status: "ready",
    title: "Owner Ops 로컬 호스트 등록 가이드",
    packageId: alpha.packageId,
    mcpServer: {
      name: descriptor.serverInfo.name,
      command: "node",
      args: ["bin/gpao-t-owner-ops-mcp.js"],
      transport: descriptor.transport,
      network: descriptor.network,
    },
    supportedHosts: [
      {
        id: "codex",
        label: "Codex",
        registrationMode: "local stdio MCP server",
        setupHint:
          "Codex MCP 설정에 gpao-t-owner-ops 서버를 로컬 stdio 명령으로 등록한다. 이 단계는 네트워크 서버를 열지 않는다.",
      },
      {
        id: "openclaw",
        label: "OpenClaw",
        registrationMode: "local stdio MCP server",
        setupHint:
          "OpenClaw의 MCP/skill host 설정에서 같은 stdio 명령을 연결한다. Gateway 또는 외부 URL 등록이 아니다.",
      },
      {
        id: "claude_code",
        label: "Claude Code",
        registrationMode: "local stdio MCP server",
        setupHint:
          "Claude Code의 MCP server 설정에 command/args를 등록하되, 실제 고객 데이터와 외부 전송 권한은 열지 않는다.",
      },
    ],
    smokeTest: [
      {
        step: 1,
        label: "서버 실행 가능성 확인",
        command: "node bin/gpao-t-owner-ops-mcp.js",
        expected: "stdio 대기 상태 또는 JSON-RPC 요청 응답 가능",
      },
      {
        step: 2,
        label: "도구 목록 확인",
        method: "tools/list",
        expected: "owner_ops.workflow_preview, owner_ops.intake_preview, owner_ops.replay 포함",
      },
      {
        step: 3,
        label: "초안 미리보기 확인",
        tool: "owner_ops.workflow_preview",
        expected: "고객 전송 없이 local preview draft만 반환",
      },
      {
        step: 4,
        label: "쓰기 잠금 확인",
        tool: "owner_ops.local_record_write",
        expected: "명시 확인 없이는 write blocked",
      },
    ],
    environment: {
      optionalRootVariable: "GPAO_T_ROOT",
      defaultRoot: "current working directory",
      writesAllowedOnlyFor: ["confirmed local record write"],
      network: "not_used",
    },
    blockedActions: [
      "customer_message_send",
      "oauth_or_credentials",
      "payment_refund_delete",
      "background_automation",
      "public_market_publish",
    ],
    nextSafeAction:
      "팀원 alpha에서 최소 2개 호스트 등록 smoke를 확인한 뒤, 피드백 폼 결과를 owner-facing UX copy와 첫 시나리오 fixture에 반영한다.",
  };
}

export function buildOwnerOpsHostIntegrationMatrix() {
  const guide = buildOwnerOpsHostRegistrationGuide();

  return {
    schema: "gpao_t.owner_ops_host_integration_matrix.v0_1",
    status: "ready",
    packageId: guide.packageId,
    integrationState: "local_registration_matrix_ready",
    mcpServer: guide.mcpServer,
    hosts: guide.supportedHosts.map((host) => ({
      id: host.id,
      label: host.label,
      registrationMode: host.registrationMode,
      command: guide.mcpServer.command,
      args: guide.mcpServer.args,
      setupHint: host.setupHint,
      smokeChecks: [
        "initialize returns gpao-t-owner-ops server info",
        "tools/list exposes owner_ops.workflow_preview and owner_ops.intake_preview",
        "workflow preview returns a local draft without customer send",
        "local_record_write is rejected unless confirmLocalRecord is true",
      ],
      firstUserAction:
        host.id === "openclaw"
          ? "OpenClaw host 설정에서 local stdio MCP server를 등록한 뒤 workflow preview부터 확인한다."
          : `${host.label} MCP 설정에서 local stdio MCP server를 등록한 뒤 workflow preview부터 확인한다.`,
      allowedActions: [
        "local tool listing",
        "workflow preview",
        "intake preview",
        "confirmed local JSONL record write",
        "local replay read",
      ],
      blockedActions: guide.blockedActions,
      externalNetwork: false,
      credentialRequired: false,
      customerSendAllowed: false,
      publicPublishAllowed: false,
    })),
    crossHostInvariants: [
      "All hosts use the same local stdio MCP command.",
      "No host may require external network for the first registration path.",
      "No host may send customer messages from Owner Ops v0.1.",
      "No host may read OAuth/API credentials in the registration matrix.",
      "Confirmed local record write is local JSONL only, not business action execution.",
    ],
    evidenceCommands: [
      "node bin/gpao-t.js owner-ops mcp-server-check",
      "node bin/gpao-t.js owner-ops host-registration-guide",
      "node bin/gpao-t.js owner-ops host-integration-matrix",
      "node bin/gpao-t.js owner-ops host-integration-matrix-check",
    ],
    nextSafeAction:
      "Use this matrix as the host-by-host setup contract for team alpha; do not activate external accounts or publish a market package yet.",
  };
}

export function verifyOwnerOpsHostIntegrationMatrix() {
  const matrix = buildOwnerOpsHostIntegrationMatrix();
  const findings = [];

  if (matrix.status !== "ready") findings.push("host_integration_matrix_not_ready");
  if (matrix.hosts.length < 3) findings.push("missing_required_hosts");
  if (!matrix.hosts.some((host) => host.id === "codex")) findings.push("codex_host_missing");
  if (!matrix.hosts.some((host) => host.id === "openclaw")) findings.push("openclaw_host_missing");
  if (!matrix.hosts.some((host) => host.id === "claude_code")) findings.push("claude_code_host_missing");
  if (!matrix.hosts.every((host) => host.registrationMode === "local stdio MCP server")) {
    findings.push("non_stdio_registration_mode_found");
  }
  if (!matrix.hosts.every((host) => host.command === "node")) findings.push("host_command_not_locked");
  if (!matrix.hosts.every((host) => host.args.includes("bin/gpao-t-owner-ops-mcp.js"))) {
    findings.push("mcp_wrapper_arg_missing");
  }
  if (!matrix.hosts.every((host) => host.externalNetwork === false)) findings.push("external_network_not_blocked");
  if (!matrix.hosts.every((host) => host.credentialRequired === false)) findings.push("credential_requirement_not_blocked");
  if (!matrix.hosts.every((host) => host.customerSendAllowed === false)) findings.push("customer_send_not_blocked");
  if (!matrix.hosts.every((host) => host.publicPublishAllowed === false)) findings.push("public_publish_not_blocked");
  if (!matrix.crossHostInvariants.some((rule) => rule.includes("same local stdio MCP command"))) {
    findings.push("same_stdio_command_invariant_missing");
  }

  return {
    schema: "gpao_t.owner_ops_host_integration_matrix_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedHosts: matrix.hosts.map((host) => host.id),
    checkedSurfaces: [
      "host coverage",
      "local stdio MCP command",
      "smoke checks",
      "external network boundary",
      "credential boundary",
      "customer send boundary",
      "public publish boundary",
    ],
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix host integration matrix findings before team alpha host setup."
      : "Use this matrix as the cross-host registration contract; do not activate external accounts or publish yet.",
  };
}

export function buildOwnerOpsAlphaFeedbackForm() {
  return {
    schema: "gpao_t.owner_ops_alpha_feedback_form.v0_1",
    status: "ready",
    title: "Owner Ops 팀원 Alpha 피드백 폼",
    submissionMode: "local_or_manual_copy",
    sections: [
      {
        id: "first_impression",
        title: "첫 인상",
        questions: [
          "사장님 입장에서 무엇을 해야 하는지 1분 안에 이해됐는가?",
          "제품 이름과 첫 화면 문구가 너무 기술적으로 느껴지지는 않았는가?",
          "자동 전송이 안 된다는 점이 충분히 안심되는가?",
        ],
      },
      {
        id: "workflow_fit",
        title: "업무 적합성",
        questions: [
          "리뷰/문의/예약 중 어느 흐름이 가장 먼저 쓸 만했는가?",
          "초안이 실제 복사 후 수정해서 쓸 수준이었는가?",
          "분류가 사장님 업무 언어에 맞았는가?",
        ],
      },
      {
        id: "host_fit",
        title: "호스트 연결",
        questions: [
          "Codex/OpenClaw/Claude Code 중 어느 호스트에서 테스트했는가?",
          "MCP 도구 목록과 미리보기 호출이 같은 제품처럼 느껴졌는가?",
          "설정 과정에서 막힌 지점이 있었는가?",
        ],
      },
      {
        id: "safety_and_trust",
        title: "안전과 신뢰",
        questions: [
          "잠긴 행동이 지나치게 겁주는 표현으로 느껴졌는가, 아니면 안심되는가?",
          "실제 고객 데이터 사용 전 어떤 경고가 더 필요하다고 느꼈는가?",
          "로컬 기록만 남는다는 표현이 충분히 명확한가?",
        ],
      },
    ],
    ratings: [
      { id: "understandability", label: "이해 쉬움", scale: "1-5" },
      { id: "usefulness", label: "실무 쓸모", scale: "1-5" },
      { id: "trust", label: "안심감", scale: "1-5" },
      { id: "setup_friction", label: "설정 어려움", scale: "1-5", lowerIsBetter: true },
    ],
    blockerTags: [
      "what_to_paste_unclear",
      "draft_not_useful",
      "too_technical",
      "safety_boundary_unclear",
      "host_registration_failed",
      "mcp_tool_unclear",
      "needs_business_specific_template",
    ],
    acceptanceThreshold: {
      understandability: ">=4 average",
      usefulness: ">=4 average",
      trust: ">=4 average",
      setupFriction: "<=2.5 average",
      criticalBlockers: 0,
    },
    nextSafeAction:
      "피드백이 기준을 넘기면 first owner beta guide로 넘어가고, 기준 미달이면 copy/scenario/host registration을 먼저 수정한다.",
  };
}

export function verifyOwnerOpsHostAlphaHandoff({ root } = {}) {
  const teamAlpha = verifyOwnerOpsTeamAlphaReadiness({ root });
  const guide = buildOwnerOpsHostRegistrationGuide();
  const feedback = buildOwnerOpsAlphaFeedbackForm();
  const matrix = buildOwnerOpsHostIntegrationMatrix();
  const matrixCheck = verifyOwnerOpsHostIntegrationMatrix();
  const findings = [];

  if (teamAlpha.status !== "ready") findings.push("team_alpha_not_ready");
  if (guide.status !== "ready") findings.push("host_registration_guide_not_ready");
  if (feedback.status !== "ready") findings.push("alpha_feedback_form_not_ready");
  if (matrix.status !== "ready") findings.push("host_integration_matrix_not_ready");
  if (matrixCheck.status !== "ready") findings.push("host_integration_matrix_check_not_ready");
  if (guide.supportedHosts.length < 3) findings.push("missing_supported_hosts");
  if (matrix.hosts.length < 3) findings.push("host_matrix_missing_supported_hosts");
  if (!matrix.hosts.every((host) => host.externalNetwork === false)) findings.push("host_matrix_external_network_not_blocked");
  if (!matrix.hosts.every((host) => host.customerSendAllowed === false)) findings.push("host_matrix_customer_send_not_blocked");
  if (!matrix.crossHostInvariants.some((rule) => rule.includes("same local stdio MCP command"))) {
    findings.push("host_matrix_stdio_invariant_missing");
  }
  if (!guide.blockedActions.includes("public_market_publish")) findings.push("missing_public_publish_block");
  if (!feedback.blockerTags.includes("host_registration_failed")) findings.push("missing_host_failure_feedback_tag");
  if (guide.mcpServer.network !== "not_used") findings.push("mcp_network_boundary_not_locked");

  return {
    schema: "gpao_t.owner_ops_host_alpha_handoff_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "team alpha readiness",
      "host registration guide",
      "host integration matrix",
      "alpha feedback form",
      "stdio MCP network boundary",
      "public publish block",
    ],
    alphaStage: "internal_team_alpha",
    publicRelease: "not_published",
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix host alpha handoff findings before team distribution."
      : "Distribute to team alpha testers with sample data only; collect feedback before first owner beta.",
  };
}
