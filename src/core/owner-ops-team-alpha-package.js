import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildOwnerOpsFirstOwnerBetaGuide, buildOwnerOpsSampleDataKit } from "./owner-ops-beta.js";
import {
  buildOwnerOpsAlphaFeedbackForm,
  buildOwnerOpsHostIntegrationMatrix,
  buildOwnerOpsHostRegistrationGuide,
  verifyOwnerOpsHostIntegrationMatrix,
} from "./owner-ops-alpha-handoff.js";
import { buildOwnerOpsOwnerFacingUxCopy, buildOwnerOpsTeamAlphaGuide } from "./owner-ops-alpha.js";
import { readOwnerOpsLocalPackageCandidate, verifyOwnerOpsLocalPackageCandidateReadback } from "./owner-ops-distribution.js";

const TEAM_ALPHA_BUNDLE_NAME = "OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE";
const FIRST_OWNER_BETA_BUNDLE_NAME = "OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE";
const FIRST_OWNER_BETA_OPERATIONAL_PACKAGE_NAME = "OWNER-OPS-FIRST-OWNER-BETA-OPERATIONAL-TEST-PACKAGE";

export function buildOwnerOpsTeamAlphaHandoffBundle({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const packageReadback = readOwnerOpsLocalPackageCandidate({ root, archiveName });
  const packageCheck = verifyOwnerOpsLocalPackageCandidateReadback({ root, archiveName });
  const teamGuide = buildOwnerOpsTeamAlphaGuide();
  const hostGuide = buildOwnerOpsHostRegistrationGuide();
  const hostMatrix = buildOwnerOpsHostIntegrationMatrix();
  const hostMatrixCheck = verifyOwnerOpsHostIntegrationMatrix();
  const feedbackForm = buildOwnerOpsAlphaFeedbackForm();
  const sampleKit = buildOwnerOpsSampleDataKit();
  const ownerCopy = buildOwnerOpsOwnerFacingUxCopy();
  const betaGuide = buildOwnerOpsFirstOwnerBetaGuide();
  const findings = [];

  if (packageCheck.status !== "ready") findings.push("local_package_candidate_readback_not_ready");
  if (teamGuide.status !== "ready") findings.push("team_alpha_guide_not_ready");
  if (hostGuide.status !== "ready") findings.push("host_registration_guide_not_ready");
  if (hostMatrix.status !== "ready") findings.push("host_integration_matrix_not_ready");
  if (hostMatrixCheck.status !== "ready") findings.push("host_integration_matrix_check_not_ready");
  if (feedbackForm.status !== "ready") findings.push("alpha_feedback_form_not_ready");
  if (sampleKit.status !== "ready") findings.push("sample_data_kit_not_ready");
  if (ownerCopy.status !== "ready") findings.push("owner_facing_copy_not_ready");
  if (!teamGuide.blockedActions.includes("customer_message_send")) findings.push("customer_send_block_missing");
  if (hostGuide.mcpServer.network !== "not_used") findings.push("mcp_network_boundary_not_closed");
  if (!hostMatrix.hosts.every((host) => host.externalNetwork === false)) findings.push("host_matrix_external_network_not_blocked");
  if (!hostMatrix.hosts.every((host) => host.customerSendAllowed === false)) findings.push("host_matrix_customer_send_not_blocked");

  return {
    schema: "gpao_t.owner_ops_team_alpha_handoff_bundle.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    packageId: "gpao-t-owner-ops",
    packageVersion: packageReadback.packageVersion || "0.1.0",
    packageCandidate: {
      status: packageReadback.status,
      archiveName: packageReadback.archiveName,
      packageId: packageReadback.packageId || "gpao-t-owner-ops",
      packageVersion: packageReadback.packageVersion || "0.1.0",
      fileCount: packageReadback.fileCount || 0,
      bundleSha256: packageReadback.bundleSha256 || null,
      filesRead: packageReadback.filesRead || [],
    },
    handoffOrder: [
      {
        step: 1,
        id: "package_integrity",
        label: "로컬 패키지 후보 무결성 확인",
        command: "node bin/gpao-t.js owner-ops local-package-candidate-readback-check",
        expected: "status: ready, findings: []",
      },
      {
        step: 2,
        id: "team_alpha_guide",
        label: "팀원 alpha 안내 확인",
        command: "node bin/gpao-t.js owner-ops team-alpha-guide",
        expected: "샘플/비식별 자료, 자동 전송 금지, happy path 확인",
      },
      {
        step: 3,
        id: "host_integration_matrix",
        label: "호스트별 등록 매트릭스 확인",
        command: "node bin/gpao-t.js owner-ops host-integration-matrix-check",
        expected: "Codex/OpenClaw/Claude Code 모두 local stdio MCP, no network, no customer send",
      },
      {
        step: 4,
        id: "host_registration",
        label: "호스트 등록 smoke 안내 확인",
        command: "node bin/gpao-t.js owner-ops host-registration-guide",
        expected: "각 호스트에서 tools/list와 workflow preview smoke 순서 확인",
      },
      {
        step: 5,
        id: "first_scenario",
        label: "첫 사장님 시나리오 실행",
        command: "node bin/gpao-t.js owner-ops run-first-owner-scenario",
        expected: "local record/replay 생성, external_send 잠금 유지",
      },
      {
        step: 6,
        id: "feedback",
        label: "피드백 폼 작성",
        command: "node bin/gpao-t.js owner-ops alpha-feedback-form",
        expected: "이해 쉬움, 실무 쓸모, 안심감, 설정 어려움 점수 수집",
      },
    ],
    hostIntegration: {
      status: hostMatrix.status,
      checkedStatus: hostMatrixCheck.status,
      hosts: hostMatrix.hosts.map((host) => ({
        id: host.id,
        label: host.label,
        registrationMode: host.registrationMode,
        command: host.command,
        args: host.args,
        externalNetwork: host.externalNetwork,
        credentialRequired: host.credentialRequired,
        customerSendAllowed: host.customerSendAllowed,
        publicPublishAllowed: host.publicPublishAllowed,
      })),
      invariants: hostMatrix.crossHostInvariants,
    },
    includedSurfaces: [
      teamGuide.schema,
      hostGuide.schema,
      hostMatrix.schema,
      hostMatrixCheck.schema,
      feedbackForm.schema,
      sampleKit.schema,
      ownerCopy.schema,
      betaGuide.schema,
      packageReadback.schema,
    ],
    testerRules: [
      "샘플 데이터 또는 비식별 자료로만 시작한다.",
      "고객에게 자동 전송하지 않는다.",
      "OAuth/API 계정 연결을 시도하지 않는다.",
      "환불, 취소, 삭제, 결제 행동은 테스트하지 않는다.",
      "결과가 마음에 들지 않으면 보류/수정 필요로 기록한다.",
    ],
    acceptanceSignals: [
      ...teamGuide.acceptanceSignals,
      "local package candidate readback이 ready이며 findings가 없다.",
      "Codex/OpenClaw/Claude Code host integration matrix가 ready다.",
      "팀원이 호스트 등록 smoke의 목적을 이해한다.",
      "피드백 폼에 critical blocker가 0개로 기록된다.",
    ],
    blockedActions: [
      "public_market_publish",
      "customer_message_send",
      "oauth_or_credentials",
      "payment_refund_delete",
      "background_automation",
      "package_signing",
      "installer_execution",
      "external_distribution",
    ],
    authorityBoundary: {
      localHandoffOnly: true,
      publicUploadExecuted: false,
      signingExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      customerSendExecuted: false,
      liveAccountConnectionExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix team alpha handoff findings before sharing with internal testers."
      : "Share this local-only handoff bundle with internal team alpha testers using sample/de-identified data only.",
  };
}

export function writeOwnerOpsTeamAlphaHandoffBundle({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const bundle = buildOwnerOpsTeamAlphaHandoffBundle({ root, archiveName, now });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, `${TEAM_ALPHA_BUNDLE_NAME}.json`);
  const mdPath = join(outputDir, `${TEAM_ALPHA_BUNDLE_NAME}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(mdPath, renderTeamAlphaHandoffMarkdown(bundle));

  return {
    schema: "gpao_t.owner_ops_team_alpha_handoff_bundle_write.v0_1",
    status: bundle.status === "ready" ? "written_local_only" : "review",
    generatedAt: now,
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.json",
      ".gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md",
    ],
    bundleStatus: bundle.status,
    findings: bundle.findings,
    authorityBoundary: bundle.authorityBoundary,
    nextSafeAction: bundle.findings.length
      ? "Review the local handoff bundle findings before sharing."
      : "Use the markdown handoff as the internal team alpha instruction surface.",
  };
}

export function verifyOwnerOpsTeamAlphaHandoffBundle({
  root = process.cwd(),
  archiveName,
} = {}) {
  const bundle = buildOwnerOpsTeamAlphaHandoffBundle({ root, archiveName });
  const outputDir = join(root, ".gpao-t", "packages");
  const jsonPath = join(outputDir, `${TEAM_ALPHA_BUNDLE_NAME}.json`);
  const mdPath = join(outputDir, `${TEAM_ALPHA_BUNDLE_NAME}.md`);
  const findings = [...bundle.findings];

  if (bundle.status !== "ready") findings.push("handoff_bundle_not_ready");
  if (!bundle.packageCandidate.bundleSha256) findings.push("package_candidate_checksum_missing");
  if (bundle.handoffOrder.length < 5) findings.push("handoff_order_incomplete");
  if (bundle.hostIntegration?.checkedStatus !== "ready") findings.push("host_integration_matrix_not_ready");
  if ((bundle.hostIntegration?.hosts || []).length < 3) findings.push("host_integration_hosts_incomplete");
  if (!bundle.blockedActions.includes("customer_message_send")) findings.push("customer_send_block_missing");
  if (bundle.authorityBoundary.publicUploadExecuted !== false) findings.push("public_upload_boundary_open");
  if (bundle.authorityBoundary.liveAccountConnectionExecuted !== false) findings.push("live_account_boundary_open");

  return {
    schema: "gpao_t.owner_ops_team_alpha_handoff_bundle_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    packageCandidateStatus: bundle.packageCandidate.status,
    packageCandidateSha256: bundle.packageCandidate.bundleSha256,
    handoffOrderCount: bundle.handoffOrder.length,
    localBundleFilesPresent: {
      json: existsSync(jsonPath),
      markdown: existsSync(mdPath),
    },
    checkedSurfaces: [
      "local package candidate readback",
      "team alpha guide",
      "host integration matrix",
      "host registration guide",
      "sample data kit",
      "owner-facing UX copy",
      "alpha feedback form",
      "authority boundary",
    ],
    nextSafeAction: findings.length
      ? "Fix team alpha handoff bundle findings."
      : "Write or share the local-only team alpha handoff bundle; do not publish publicly.",
  };
}

export function buildOwnerOpsFirstOwnerBetaHandoffBundle({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const alphaBundle = buildOwnerOpsTeamAlphaHandoffBundle({ root, archiveName, now });
  const betaGuide = buildOwnerOpsFirstOwnerBetaGuide();
  const sampleKit = buildOwnerOpsSampleDataKit();
  const feedbackForm = buildOwnerOpsAlphaFeedbackForm();
  const ownerCopy = buildOwnerOpsOwnerFacingUxCopy();
  const hostPrerequisite = {
    status: alphaBundle.hostIntegration?.checkedStatus || "missing",
    selectedHost: "not_selected_until_supervised_beta",
    recommendedFirstHost: "codex",
    selectionRule: "Use the host the tester can operate with least friction; do not connect external accounts.",
    hosts: (alphaBundle.hostIntegration?.hosts || []).map((host) => ({
      id: host.id,
      label: host.label,
      registrationMode: host.registrationMode,
      command: host.command,
      args: host.args,
      externalNetwork: host.externalNetwork,
      credentialRequired: host.credentialRequired,
      customerSendAllowed: host.customerSendAllowed,
      publicPublishAllowed: host.publicPublishAllowed,
    })),
    requiredBeforeOwnerTest: [
      "choose one host for the supervised first-owner beta",
      "confirm local stdio MCP smoke on the chosen host",
      "confirm no external network, no customer send, no credential access, and no public publish",
    ],
    invariants: alphaBundle.hostIntegration?.invariants || [],
  };
  const findings = [...alphaBundle.findings];

  if (alphaBundle.status !== "ready") findings.push("team_alpha_handoff_not_ready");
  if (hostPrerequisite.status !== "ready") findings.push("host_setup_prerequisite_not_ready");
  if (hostPrerequisite.hosts.length < 3) findings.push("host_setup_hosts_incomplete");
  if (!hostPrerequisite.hosts.every((host) => host.externalNetwork === false)) {
    findings.push("host_setup_external_network_not_blocked");
  }
  if (!hostPrerequisite.hosts.every((host) => host.customerSendAllowed === false)) {
    findings.push("host_setup_customer_send_not_blocked");
  }
  if (!hostPrerequisite.hosts.every((host) => host.credentialRequired === false)) {
    findings.push("host_setup_credential_boundary_not_blocked");
  }
  if (betaGuide.status !== "ready") findings.push("first_owner_beta_guide_not_ready");
  if (sampleKit.status !== "ready") findings.push("sample_data_kit_not_ready");
  if (!sampleKit.redactionRules.some((rule) => rule.includes("전화번호"))) findings.push("pii_redaction_rule_missing");
  if (!betaGuide.stopConditions.some((condition) => condition.includes("개인정보"))) findings.push("owner_pii_stop_condition_missing");
  if (!betaGuide.stillBlocked.includes("고객 자동 발송")) findings.push("customer_send_block_missing");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_handoff_bundle.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    packageId: alphaBundle.packageId,
    packageVersion: alphaBundle.packageVersion,
    alphaPrerequisite: {
      status: alphaBundle.status,
      packageCandidateStatus: alphaBundle.packageCandidate.status,
      bundleSha256: alphaBundle.packageCandidate.bundleSha256,
    },
    hostPrerequisite,
    ownerAudience: betaGuide.audience,
    ownerScript: betaGuide.ownerScript,
    betaFlow: [
      {
        step: 1,
        id: "choose_test_host",
        label: "테스트 호스트 선택과 local stdio MCP smoke",
        expected: "Codex/OpenClaw/Claude Code 중 하나를 고르고, node bin/gpao-t-owner-ops-mcp.js 로컬 stdio smoke만 확인",
      },
      {
        step: 2,
        id: "start_with_sample",
        label: "샘플 또는 비식별 자료로 시작",
        expected: "실명, 전화번호, 주소, 주문번호가 제거된 자료만 사용",
      },
      {
        step: 3,
        id: "preview_draft",
        label: "분류와 답변 초안 확인",
        expected: "고객 전송이 아니라 확인용 초안만 생성",
      },
      {
        step: 4,
        id: "confirm_boundaries",
        label: "잠긴 행동 확인",
        expected: "자동 전송, 환불/취소/삭제, OAuth/API 연결 잠금 확인",
      },
      {
        step: 5,
        id: "collect_feedback",
        label: "첫 사장님 피드백 기록",
        expected: "이해 쉬움, 쓸모, 안심감, 업종 템플릿 요구 수집",
      },
    ],
    sampleData: sampleKit.samples.map((sample) => ({
      id: sample.id,
      label: sample.label,
      workflowType: sample.workflowType,
      filename: sample.filename,
    })),
    ownerFacingCopy: {
      title: ownerCopy.title,
      headline: ownerCopy.firstScreen.headline,
      safetyLabels: ownerCopy.safetyLabels,
    },
    feedbackQuestions: feedbackForm.sections.flatMap((section) => section.questions),
    stopConditions: betaGuide.stopConditions,
    successSignals: betaGuide.successSignals,
    blockedActions: [
      ...new Set([
        ...alphaBundle.blockedActions,
        ...betaGuide.stillBlocked,
        "real_customer_pii_without_redaction",
        "unsupervised_owner_beta",
      ]),
    ],
    authorityBoundary: {
      supervisedBetaOnly: true,
      sampleOrDeidentifiedDataOnly: true,
      liveHostRegistrationExecuted: false,
      publicUploadExecuted: false,
      customerSendExecuted: false,
      liveAccountConnectionExecuted: false,
      paymentRefundDeleteExecuted: false,
      backgroundAutomationExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix first owner beta handoff findings before inviting a real owner."
      : "Run one supervised first-owner beta with sample or de-identified data only; do not connect live accounts or send messages.",
  };
}

export function writeOwnerOpsFirstOwnerBetaHandoffBundle({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const bundle = buildOwnerOpsFirstOwnerBetaHandoffBundle({ root, archiveName, now });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, `${FIRST_OWNER_BETA_BUNDLE_NAME}.json`);
  const mdPath = join(outputDir, `${FIRST_OWNER_BETA_BUNDLE_NAME}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(mdPath, renderFirstOwnerBetaHandoffMarkdown(bundle));

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_handoff_bundle_write.v0_1",
    status: bundle.status === "ready" ? "written_local_only" : "review",
    generatedAt: now,
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE.json",
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE.md",
    ],
    bundleStatus: bundle.status,
    findings: bundle.findings,
    authorityBoundary: bundle.authorityBoundary,
    nextSafeAction: bundle.nextSafeAction,
  };
}

export function verifyOwnerOpsFirstOwnerBetaHandoffBundle({
  root = process.cwd(),
  archiveName,
} = {}) {
  const bundle = buildOwnerOpsFirstOwnerBetaHandoffBundle({ root, archiveName });
  const outputDir = join(root, ".gpao-t", "packages");
  const jsonPath = join(outputDir, `${FIRST_OWNER_BETA_BUNDLE_NAME}.json`);
  const mdPath = join(outputDir, `${FIRST_OWNER_BETA_BUNDLE_NAME}.md`);
  const findings = [...bundle.findings];

  if (bundle.status !== "ready") findings.push("first_owner_beta_handoff_not_ready");
  if (bundle.alphaPrerequisite.status !== "ready") findings.push("alpha_prerequisite_not_ready");
  if (bundle.hostPrerequisite.status !== "ready") findings.push("host_setup_prerequisite_not_ready");
  if (bundle.hostPrerequisite.hosts.length < 3) findings.push("host_setup_hosts_incomplete");
  if (!bundle.alphaPrerequisite.bundleSha256) findings.push("local_package_checksum_missing");
  if (bundle.betaFlow.length < 5) findings.push("beta_flow_incomplete");
  if (!bundle.betaFlow.some((step) => step.id === "choose_test_host")) {
    findings.push("host_selection_step_missing");
  }
  if (!bundle.authorityBoundary.sampleOrDeidentifiedDataOnly) findings.push("sample_data_boundary_missing");
  if (bundle.authorityBoundary.liveHostRegistrationExecuted !== false) findings.push("live_host_registration_boundary_open");
  if (bundle.authorityBoundary.customerSendExecuted !== false) findings.push("customer_send_boundary_open");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_handoff_bundle_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    alphaPrerequisiteStatus: bundle.alphaPrerequisite.status,
    hostPrerequisiteStatus: bundle.hostPrerequisite.status,
    hostCount: bundle.hostPrerequisite.hosts.length,
    packageCandidateSha256: bundle.alphaPrerequisite.bundleSha256,
    betaFlowCount: bundle.betaFlow.length,
    localBundleFilesPresent: {
      json: existsSync(jsonPath),
      markdown: existsSync(mdPath),
    },
    checkedSurfaces: [
      "team alpha handoff prerequisite",
      "host setup prerequisite",
      "first owner beta guide",
      "sample data kit",
      "owner-facing copy",
      "feedback questions",
      "stop conditions",
      "authority boundary",
    ],
    nextSafeAction: findings.length
      ? "Fix first owner beta handoff findings."
      : "Use this local-only beta handoff for one supervised owner test with sample/de-identified data.",
  };
}

export function buildOwnerOpsFirstOwnerBetaOperationalTestPackage({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const handoff = buildOwnerOpsFirstOwnerBetaHandoffBundle({ root, archiveName, now });
  const handoffCheck = verifyOwnerOpsFirstOwnerBetaHandoffBundle({ root, archiveName });
  const findings = [...handoff.findings];

  if (handoffCheck.status !== "ready") findings.push("first_owner_beta_handoff_check_not_ready");
  if (handoff.hostPrerequisite.status !== "ready") findings.push("host_setup_prerequisite_not_ready");
  if (!handoff.betaFlow.some((step) => step.id === "choose_test_host")) findings.push("host_selection_step_missing");
  if (handoff.authorityBoundary.liveHostRegistrationExecuted !== false) findings.push("live_host_registration_boundary_open");
  if (handoff.authorityBoundary.customerSendExecuted !== false) findings.push("customer_send_boundary_open");
  if (handoff.authorityBoundary.liveAccountConnectionExecuted !== false) findings.push("live_account_boundary_open");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_operational_test_package.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    packageId: handoff.packageId,
    packageVersion: handoff.packageVersion,
    alphaPrerequisite: handoff.alphaPrerequisite,
    handoffStatus: handoff.status,
    handoffCheckStatus: handoffCheck.status,
    hostSetup: {
      status: handoff.hostPrerequisite.status,
      selectedHost: handoff.hostPrerequisite.selectedHost,
      recommendedFirstHost: handoff.hostPrerequisite.recommendedFirstHost,
      allowedHosts: handoff.hostPrerequisite.hosts.map((host) => ({
        id: host.id,
        label: host.label,
        command: host.command,
        args: host.args,
        externalNetwork: host.externalNetwork,
        credentialRequired: host.credentialRequired,
        customerSendAllowed: host.customerSendAllowed,
        publicPublishAllowed: host.publicPublishAllowed,
      })),
      requiredSmoke: handoff.hostPrerequisite.requiredBeforeOwnerTest,
    },
    testSessionPacket: {
      ownerProfile: "first_owner_beta_supervised",
      dataMode: "sample_or_deidentified",
      allowedData: [
        "sample review text",
        "sample shopping inquiry",
        "sample reservation or FAQ text",
        "de-identified owner-provided text",
      ],
      prohibitedData: [
        "real customer phone numbers",
        "real customer addresses",
        "live order numbers",
        "payment/refund/delete account actions",
        "OAuth/API credentials",
      ],
      startCommand: "node bin/gpao-t.js owner-ops first-owner-beta-operational-package",
      recordResultCommand: "node bin/gpao-t.js owner-ops first-owner-beta-result-write",
    },
    operatorRunbook: [
      {
        step: 1,
        id: "host_smoke",
        label: "테스트 호스트와 local stdio MCP smoke 확인",
        expected: "선택한 호스트에서 로컬 MCP 명령을 확인하되 live host registration은 실행하지 않는다.",
      },
      {
        step: 2,
        id: "owner_briefing",
        label: "사장님에게 미리보기/초안/실제 전송의 차이를 설명",
        expected: "고객에게 자동 발송되지 않으며, 모든 결과는 확인용 초안임을 이해한다.",
      },
      {
        step: 3,
        id: "sample_run",
        label: "샘플 또는 비식별 자료 1-3개로 테스트",
        expected: "분류, 초안, 보류/수정 필요 판단을 확인한다.",
      },
      {
        step: 4,
        id: "feedback_capture",
        label: "피드백과 blocker를 즉시 기록",
        expected: "이해 쉬움, 쓸모, 안심감, 설정 마찰, 필요한 업종 템플릿을 남긴다.",
      },
      {
        step: 5,
        id: "result_review",
        label: "first-owner beta result review로 넘김",
        expected: "시장 readiness에 쓰기 전에 안전 경계와 평가 기준을 다시 검증한다.",
      },
    ],
    acceptanceChecklist: [
      "host setup prerequisite is ready",
      "owner understands no auto-send",
      "sample/de-identified data only",
      "usefulness rating is at least 4",
      "trust rating is at least 4",
      "setup friction is at most 2.5",
      "critical blocker count is 0",
    ],
    resultCaptureFields: [
      "ownerProfile",
      "host",
      "industry",
      "dataMode",
      "understoodNoAutoSend",
      "usefulDraftCount",
      "revisedBeforeUse",
      "actualCustomerSendExecuted",
      "liveAccountConnected",
      "paymentRefundDeleteExecuted",
      "criticalBlockerTags",
      "requestedTemplates",
      "ratings.understandability",
      "ratings.usefulness",
      "ratings.trust",
      "ratings.setupFriction",
      "notes",
    ],
    blockedActions: [
      ...new Set([
        ...handoff.blockedActions,
        "live_host_registration",
        "actual_customer_send",
        "external_network",
        "credential_read_write",
        "public_publish",
        "install_update_rollback",
        "signing_or_upload",
      ]),
    ],
    authorityBoundary: {
      operationalPacketOnly: true,
      liveHostRegistrationExecuted: false,
      externalNetworkExecuted: false,
      credentialAccessExecuted: false,
      customerSendExecuted: false,
      publicPublishExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      signingExecuted: false,
      uploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix first-owner beta operational package findings before inviting a real owner."
      : "Run one supervised first-owner beta using this local-only operational package, then write the beta result review.",
  };
}

export function writeOwnerOpsFirstOwnerBetaOperationalTestPackage({
  root = process.cwd(),
  archiveName,
  now = new Date().toISOString(),
} = {}) {
  const bundle = buildOwnerOpsFirstOwnerBetaOperationalTestPackage({ root, archiveName, now });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, `${FIRST_OWNER_BETA_OPERATIONAL_PACKAGE_NAME}.json`);
  const mdPath = join(outputDir, `${FIRST_OWNER_BETA_OPERATIONAL_PACKAGE_NAME}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(mdPath, renderFirstOwnerBetaOperationalTestPackageMarkdown(bundle));

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_operational_test_package_write.v0_1",
    status: bundle.status === "ready" ? "written_local_only" : "review",
    generatedAt: now,
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-OPERATIONAL-TEST-PACKAGE.json",
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-OPERATIONAL-TEST-PACKAGE.md",
    ],
    packageStatus: bundle.status,
    findings: bundle.findings,
    authorityBoundary: bundle.authorityBoundary,
    nextSafeAction: bundle.nextSafeAction,
  };
}

export function verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({
  root = process.cwd(),
  archiveName,
} = {}) {
  const bundle = buildOwnerOpsFirstOwnerBetaOperationalTestPackage({ root, archiveName });
  const outputDir = join(root, ".gpao-t", "packages");
  const jsonPath = join(outputDir, `${FIRST_OWNER_BETA_OPERATIONAL_PACKAGE_NAME}.json`);
  const mdPath = join(outputDir, `${FIRST_OWNER_BETA_OPERATIONAL_PACKAGE_NAME}.md`);
  const findings = [...bundle.findings];

  if (bundle.status !== "ready") findings.push("first_owner_beta_operational_package_not_ready");
  if (bundle.hostSetup.status !== "ready") findings.push("host_setup_not_ready");
  if (bundle.hostSetup.allowedHosts.length < 3) findings.push("allowed_hosts_incomplete");
  if (bundle.operatorRunbook.length < 5) findings.push("operator_runbook_incomplete");
  if (!bundle.operatorRunbook.some((step) => step.id === "result_review")) findings.push("result_review_step_missing");
  if (!bundle.acceptanceChecklist.includes("critical blocker count is 0")) findings.push("critical_blocker_acceptance_missing");
  if (!bundle.resultCaptureFields.includes("ratings.trust")) findings.push("trust_rating_capture_missing");
  if (bundle.authorityBoundary.operationalPacketOnly !== true) findings.push("operational_packet_boundary_missing");
  if (bundle.authorityBoundary.customerSendExecuted !== false) findings.push("customer_send_boundary_open");
  if (bundle.authorityBoundary.externalNetworkExecuted !== false) findings.push("external_network_boundary_open");
  if (bundle.authorityBoundary.credentialAccessExecuted !== false) findings.push("credential_boundary_open");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_operational_test_package_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    handoffStatus: bundle.handoffStatus,
    hostSetupStatus: bundle.hostSetup.status,
    allowedHostCount: bundle.hostSetup.allowedHosts.length,
    runbookStepCount: bundle.operatorRunbook.length,
    localPackageFilesPresent: {
      json: existsSync(jsonPath),
      markdown: existsSync(mdPath),
    },
    checkedSurfaces: [
      "first owner beta handoff prerequisite",
      "host setup prerequisite",
      "operator runbook",
      "test session packet",
      "acceptance checklist",
      "result capture fields",
      "authority boundary",
    ],
    nextSafeAction: findings.length
      ? "Fix first-owner beta operational package findings."
      : "Use this local-only operational package for one supervised first-owner beta; then write result review.",
  };
}

function renderTeamAlphaHandoffMarkdown(bundle) {
  const lines = [
    "# Owner Ops Team Alpha Handoff Bundle",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Package: ${bundle.packageId} ${bundle.packageVersion}`,
    `Status: ${bundle.status}`,
    "",
    "## Local Package Candidate",
    "",
    `- Archive candidate: ${bundle.packageCandidate.archiveName}`,
    `- Bundle sha256: ${bundle.packageCandidate.bundleSha256 || "missing"}`,
    `- File count: ${bundle.packageCandidate.fileCount}`,
    "",
    "## Handoff Order",
    "",
    ...bundle.handoffOrder.map((item) =>
      `${item.step}. ${item.label}\n   - Command: \`${item.command}\`\n   - Expected: ${item.expected}`
    ),
    "",
    "## Host Integration",
    "",
    ...bundle.hostIntegration.hosts.map((host) =>
      `- ${host.label}: ${host.registrationMode}, command \`${host.command} ${host.args.join(" ")}\`, network ${host.externalNetwork}, customer send ${host.customerSendAllowed}`
    ),
    "",
    "## Host Invariants",
    "",
    ...bundle.hostIntegration.invariants.map((rule) => `- ${rule}`),
    "",
    "## Tester Rules",
    "",
    ...bundle.testerRules.map((rule) => `- ${rule}`),
    "",
    "## Blocked Actions",
    "",
    ...bundle.blockedActions.map((action) => `- ${action}`),
    "",
    "## Next Safe Action",
    "",
    bundle.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderFirstOwnerBetaOperationalTestPackageMarkdown(bundle) {
  const lines = [
    "# Owner Ops First Owner Beta Operational Test Package",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Package: ${bundle.packageId} ${bundle.packageVersion}`,
    `Status: ${bundle.status}`,
    "",
    "## Host Setup",
    "",
    `- Status: ${bundle.hostSetup.status}`,
    `- Selected host: ${bundle.hostSetup.selectedHost}`,
    `- Recommended first host: ${bundle.hostSetup.recommendedFirstHost}`,
    "",
    ...bundle.hostSetup.allowedHosts.map((host) =>
      `- ${host.label}: \`${host.command} ${host.args.join(" ")}\`, network ${host.externalNetwork}, credential ${host.credentialRequired}, customer send ${host.customerSendAllowed}`
    ),
    "",
    "## Test Session Packet",
    "",
    `- Owner profile: ${bundle.testSessionPacket.ownerProfile}`,
    `- Data mode: ${bundle.testSessionPacket.dataMode}`,
    `- Start command: \`${bundle.testSessionPacket.startCommand}\``,
    `- Record result command: \`${bundle.testSessionPacket.recordResultCommand}\``,
    "",
    "## Operator Runbook",
    "",
    ...bundle.operatorRunbook.map((item) =>
      `${item.step}. ${item.label}\n   - Expected: ${item.expected}`
    ),
    "",
    "## Acceptance Checklist",
    "",
    ...bundle.acceptanceChecklist.map((item) => `- ${item}`),
    "",
    "## Result Capture Fields",
    "",
    ...bundle.resultCaptureFields.map((item) => `- ${item}`),
    "",
    "## Blocked Actions",
    "",
    ...bundle.blockedActions.map((action) => `- ${action}`),
    "",
    "## Next Safe Action",
    "",
    bundle.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderFirstOwnerBetaHandoffMarkdown(bundle) {
  const lines = [
    "# Owner Ops First Owner Beta Handoff Bundle",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Package: ${bundle.packageId} ${bundle.packageVersion}`,
    `Status: ${bundle.status}`,
    "",
    "## Host Setup Prerequisite",
    "",
    `- Status: ${bundle.hostPrerequisite.status}`,
    `- Selected host: ${bundle.hostPrerequisite.selectedHost}`,
    `- Recommended first host: ${bundle.hostPrerequisite.recommendedFirstHost}`,
    `- Selection rule: ${bundle.hostPrerequisite.selectionRule}`,
    "",
    ...bundle.hostPrerequisite.hosts.map((host) =>
      `- ${host.label}: ${host.registrationMode}, command \`${host.command} ${host.args.join(" ")}\`, network ${host.externalNetwork}, credential ${host.credentialRequired}, customer send ${host.customerSendAllowed}`
    ),
    "",
    "### Host Setup Required Before Owner Test",
    "",
    ...bundle.hostPrerequisite.requiredBeforeOwnerTest.map((item) => `- ${item}`),
    "",
    "## Owner Script",
    "",
    ...bundle.ownerScript.map((line) => `- ${line}`),
    "",
    "## Beta Flow",
    "",
    ...bundle.betaFlow.map((item) =>
      `${item.step}. ${item.label}\n   - Expected: ${item.expected}`
    ),
    "",
    "## Sample Data",
    "",
    ...bundle.sampleData.map((sample) => `- ${sample.label}: \`${sample.filename}\``),
    "",
    "## Stop Conditions",
    "",
    ...bundle.stopConditions.map((condition) => `- ${condition}`),
    "",
    "## Blocked Actions",
    "",
    ...bundle.blockedActions.map((action) => `- ${action}`),
    "",
    "## Next Safe Action",
    "",
    bundle.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}
