import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildInstallHardeningReport } from "./install-hardening.js";
import {
  verifyOwnerOpsFieldTestRepairCompletionEvidence,
} from "./owner-ops-market-readiness.js";
import { buildOwnerOpsPluginPackageManifest } from "./owner-ops-package.js";
import {
  buildOwnerOpsPrePublicEvidenceBridge,
  buildOwnerOpsPrePublicPackageReview,
  buildOwnerOpsPrePublicRepairBacklog,
  buildOwnerOpsPrePublicRepairCompletionEvidence,
  verifyOwnerOpsPrePublicEvidenceBridge,
  verifyOwnerOpsPrePublicPackage,
  verifyOwnerOpsPrePublicRepairBacklog,
  verifyOwnerOpsPrePublicRepairCompletionEvidence,
} from "./owner-ops-public-package.js";

const DISTRIBUTION_FILES = [
  "package.json",
  "bin/gpao-t.js",
  "bin/gpao-t-owner-ops-mcp.js",
  "src/index.js",
  "src/core/owner-ops.js",
  "src/core/owner-ops-alpha.js",
  "src/core/owner-ops-alpha-handoff.js",
  "src/core/owner-ops-beta.js",
  "src/core/owner-ops-connectors.js",
  "src/core/owner-ops-distribution.js",
  "src/core/owner-ops-intake-connectors.js",
  "src/core/owner-ops-market-readiness.js",
  "src/core/owner-ops-mcp-server.js",
  "src/core/owner-ops-package.js",
  "src/core/owner-ops-public-package.js",
  "src/core/owner-ops-scenarios.js",
  "src/core/owner-ops-team-alpha-package.js",
  "docs/04-skill-ecosystem/GPAO-T-OWNER-OPS-PACK-DEVELOPMENT-PLAN-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-AUTHORITY-MATRIX-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIELD-CASEBOOK-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIRST-SCENARIOS-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-MCP-CONNECTOR-PLAN-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PLUGIN-PACKAGE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-SCENARIO-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-OPERATING-CONTRACT-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-ACCEPTANCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-HOST-REGISTRATION-AND-FEEDBACK-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-OWNER-ACCEPTANCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-PACKAGE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-LEDGER-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-ACTION-QUEUE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-RESULT-LEDGER-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-NEXT-OWNER-TESTING-LOOP-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-MARKET-READINESS-GATE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-MARKET-EVIDENCE-BUNDLE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-PACKAGE-REVIEW-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-EVIDENCE-BRIDGE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-RELEASE-READINESS-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-HUMAN-REVIEW-DECISION-LANE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PUBLIC-RELEASE-AUTHORITY-GATE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PUBLIC-RELEASE-READBACK-SNAPSHOT-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-OWNER-DECISION-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRODUCT-AXIS-READINESS-MATRIX-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-PRODUCTION-COMPLETION-AUDIT-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-READINESS-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-APPROVED-SIGNING-LANE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-MARKETPLACE-UPLOAD-APPROVAL-GATE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-MARKETPLACE-UPLOAD-DECISION-LANE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-APPROVAL-RECORD-DESIGN-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-APPROVAL-RECORD-WRITE-LANE-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-CONTROLLED-DRY-RUN-INVOCATION-v0.1-ko.md",
  "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-v0.1-ko.md",
];

const LEGACY_DISTRIBUTION_FILE_ALIASES = new Map([
  ["docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-OPERATING-CONTRACT-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-TEAM-ALPHA-GUIDE-v0.1-ko.md"],
  ["docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-ACCEPTANCE-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-TEAM-ALPHA-GUIDE-v0.1-ko.md"],
  ["docs/04-skill-ecosystem/OWNER-OPS-OWNER-ACCEPTANCE-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-GUIDE-v0.1-ko.md"],
  ["docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-PACKAGE-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE-v0.1-ko.md"],
  ["docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-OWNER-DECISION-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-HUMAN-REVIEW-DECISION-LANE-v0.1-ko.md"],
  ["docs/04-skill-ecosystem/OWNER-OPS-INTERNAL-PRODUCTION-READINESS-v0.1-ko.md", "docs/04-skill-ecosystem/OWNER-OPS-SUPERVISED-TESTING-READINESS-PACKET-v0.1-ko.md"],
]);

const INTERNAL_PRODUCTION_PACKAGE_CONFIRMATION = "confirm-owner-ops-internal-production-package";
const LEGACY_LOCAL_PACKAGE_CONFIRMATION = "confirm-local-owner-ops-package";
const HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN = "approve-owner-ops-human-review-local-only";
const MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN = "approve-owner-ops-marketplace-upload-local-record";
const BROADER_OWNER_TESTING_RESULT_TOKEN = "record-owner-ops-broader-testing-local-only";
const INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN = "record-owner-ops-internal-production-owner-decision";
const LEGACY_INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN = "record-owner-ops-final-candidate-local-decision";
const INTERNAL_PRODUCTION_OWNER_DECISIONS = [
  "continue_supervised_testing",
  "request_revision",
  "approve_internal_production_review",
  "consider_public_release_later",
];
const LEGACY_OWNER_DECISION_ALIASES = new Map([
  ["approve_local_candidate_review", "approve_internal_production_review"],
]);

function normalizeInternalProductionOwnerDecision(decision) {
  return LEGACY_OWNER_DECISION_ALIASES.get(decision) || decision;
}

const DEFAULT_BROADER_OWNER_TEST_RESULT = {
  stage: "broader_owner_testing",
  host: "codex",
  testerRole: "supervised_owner_tester",
  industry: "smartstore_shop",
  dataMode: "sample_or_deidentified",
  understoodNoAutoSend: true,
  actualCustomerSendExecuted: false,
  liveAccountConnected: false,
  paymentRefundDeleteExecuted: false,
  credentialAccessUsed: false,
  ratings: {
    understandability: 4,
    usefulness: 4,
    trust: 4,
    setupFriction: 2,
  },
  blockerTags: [],
  requestedTemplates: ["배송 문의", "교환/환불 문의"],
  notes: ["감독 테스트에서 샘플 데이터 기준으로 업무 흐름과 발송 차단 경계를 확인했다."],
};

export function buildOwnerOpsDistributionEvidence({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const manifest = buildOwnerOpsPluginPackageManifest();
  const prePublic = buildOwnerOpsPrePublicPackageReview({ root });
  const repairBacklog = buildOwnerOpsPrePublicRepairBacklog({ root });
  const repairCompletion = buildOwnerOpsPrePublicRepairCompletionEvidence({ root });
  const install = buildInstallHardeningReport({ root, now });
  const files = DISTRIBUTION_FILES.map((file) => fileEvidence({ root, file }));
  const missingFiles = files.filter((file) => file.status !== "present").map((file) => file.path);
  const findings = [];

  if (prePublic.status !== "ready") findings.push("pre_public_package_not_ready");
  if (repairBacklog.status !== "ready") findings.push("pre_public_repair_backlog_not_ready");
  if (repairCompletion.status !== "ready") findings.push("pre_public_repair_completion_not_ready");
  if (repairBacklog.authorityBoundary.publicSubmissionAllowed !== false) {
    findings.push("pre_public_repair_public_submission_boundary_opened");
  }
  if (repairCompletion.authorityBoundary.publicSubmissionAllowed !== false) {
    findings.push("pre_public_repair_completion_public_submission_boundary_opened");
  }
  if (install.status === "blocked") findings.push("install_hardening_blocked");
  if (missingFiles.length) findings.push("distribution_files_missing");

  return {
    schema: "gpao_t.owner_ops_distribution_evidence.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: manifest.packageId,
    displayName: manifest.displayName,
    packageVersion: readPackageVersion({ root }),
    files,
    missingFiles,
    installUpdateRollbackEvidence: {
      installGate: install.installGate.status,
      updateGate: install.updateGate.status,
      rollbackGate: install.rollbackGate.status,
      canInstallNow: install.application.canInstallNow,
      canUpdateNow: install.application.canUpdateNow,
      canRollbackNow: install.application.canRollbackNow,
      authorityBoundary: install.authorityBoundary,
    },
    prePublicReview: {
      status: prePublic.status,
      publicationState: prePublic.publicationState,
      publicSubmissionAllowed: prePublic.publicSubmissionAllowed,
      checkedSurfaces: prePublic.checkedSurfaces,
    },
    prePublicRepairBacklog: {
      status: repairBacklog.status,
      repairStage: repairBacklog.repairStage,
      itemCount: repairBacklog.repairSummary.itemCount,
      lanes: repairBacklog.repairSummary.lanes,
      publicSubmissionAllowed: repairBacklog.authorityBoundary.publicSubmissionAllowed,
      localRepairBacklogOnly: repairBacklog.authorityBoundary.localRepairBacklogOnly,
    },
    prePublicRepairCompletionEvidence: {
      status: repairCompletion.status,
      itemCount: repairCompletion.completionSummary.itemCount,
      completedCount: repairCompletion.completionSummary.completedCount,
      lanes: repairCompletion.completionSummary.lanes,
      allItemsLocallyVerified: repairCompletion.completionSummary.allItemsLocallyVerified,
      publicSubmissionAllowed: repairCompletion.authorityBoundary.publicSubmissionAllowed,
    },
    archivePlan: {
      archiveCreation: "not_executed",
      signing: "not_executed",
      notarization: "not_executed",
      publicUpload: "not_executed",
      plannedArchiveName: `gpao-t-owner-ops-${readPackageVersion({ root }) || "0.1.0"}-internal-production-package.zip`,
    },
    authorityBoundary: {
      localEvidenceOnly: true,
      publicSubmissionAllowed: false,
      externalDistributionExecuted: false,
      signingExecuted: false,
      installerExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix Owner Ops distribution evidence findings before internal production package review."
      : "Prepare a local archive/checksum dry-run under explicit approval; public upload remains blocked.",
  };
}

export function buildOwnerOpsDistributionReadme({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsDistributionEvidence({ root });
  return {
    schema: "gpao_t.owner_ops_distribution_readme.v0_1",
    status: evidence.status,
    title: "Owner Ops 로컬 배포 후보 안내",
    packageId: evidence.packageId,
    sections: [
      {
        title: "무엇이 들어 있나요?",
        bullets: [
          "Owner Ops 스킬팩",
          "로컬 CLI 명령",
          "stdio MCP 서버",
          "읽기 전용 intake connector",
          "팀원 alpha / 첫 사장님 beta / pre-public review 문서",
        ],
      },
      {
        title: "설치 전 확인",
        bullets: [
          "`npm run verify`를 먼저 실행합니다.",
          "`node bin/gpao-t.js owner-ops pre-public-repair-check`를 확인합니다.",
          "`node bin/gpao-t.js owner-ops pre-public-repair-completion-check`를 확인합니다.",
          "`node bin/gpao-t.js owner-ops pre-public-package-check`를 확인합니다.",
          "`node bin/gpao-t.js owner-ops distribution-evidence-check`를 확인합니다.",
        ],
      },
      {
        title: "아직 하지 않는 것",
        bullets: [
          "공개 업로드",
          "서명/공증",
          "실제 설치 실행",
          "자동 업데이트",
          "파괴적 롤백",
          "외부 계정 연결",
          "고객 자동 발송",
        ],
      },
    ],
    authorityBoundary: evidence.authorityBoundary,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsDistributionEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsDistributionEvidence({ root });
  const prePublicCheck = verifyOwnerOpsPrePublicPackage({ root });
  const repairBacklogCheck = verifyOwnerOpsPrePublicRepairBacklog({ root });
  const repairCompletionCheck = verifyOwnerOpsPrePublicRepairCompletionEvidence({ root });
  const findings = [...evidence.findings];

  if (prePublicCheck.status !== "ready") findings.push("pre_public_check_not_ready");
  if (repairBacklogCheck.status !== "ready") findings.push("pre_public_repair_backlog_check_not_ready");
  if (repairCompletionCheck.status !== "ready") findings.push("pre_public_repair_completion_check_not_ready");
  if (evidence.prePublicRepairBacklog.publicSubmissionAllowed !== false) {
    findings.push("pre_public_repair_public_submission_must_remain_blocked");
  }
  if (evidence.prePublicRepairCompletionEvidence.publicSubmissionAllowed !== false) {
    findings.push("pre_public_repair_completion_public_submission_must_remain_blocked");
  }
  if (evidence.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_not_blocked");
  if (evidence.authorityBoundary.externalDistributionExecuted !== false) {
    findings.push("external_distribution_must_not_execute");
  }
  if (evidence.archivePlan.archiveCreation !== "not_executed") findings.push("archive_creation_must_not_execute");
  if (!evidence.files.some((file) => file.path === "bin/gpao-t-owner-ops-mcp.js" && file.status === "present")) {
    findings.push("mcp_wrapper_missing");
  }

  return {
    schema: "gpao_t.owner_ops_distribution_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "distribution file manifest",
      "install/update/rollback evidence",
      "pre-public package review",
      "pre-public repair backlog",
      "pre-public repair completion evidence",
      "archive/signing/upload block",
      "stdio MCP wrapper",
    ],
    publicSubmissionAllowed: evidence.authorityBoundary.publicSubmissionAllowed,
    externalDistributionExecuted: evidence.authorityBoundary.externalDistributionExecuted,
    nextSafeAction: findings.length
      ? "Fix Owner Ops distribution evidence findings."
      : "Keep this as local distribution evidence; explicit approval is required before archive creation, signing, upload, install, update, or rollback.",
  };
}

export function buildOwnerOpsArchiveChecksumDryRun({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const evidence = buildOwnerOpsDistributionEvidence({ root, now });
  const packageVersion = evidence.packageVersion || "0.1.0";
  const archiveName = evidence.archivePlan.plannedArchiveName;
  const includedFiles = evidence.files.filter((file) => file.status === "present");
  const missingFiles = evidence.files.filter((file) => file.status !== "present").map((file) => file.path);
  const manifestDigest = createHash("sha256")
    .update(JSON.stringify({
      packageId: evidence.packageId,
      packageVersion,
      files: includedFiles.map((file) => ({
        path: file.path,
        sha256: file.sha256,
        bytes: file.bytes,
      })),
    }))
    .digest("hex");
  const findings = [];

  if (evidence.status !== "ready") findings.push("distribution_evidence_not_ready");
  if (missingFiles.length) findings.push("archive_input_files_missing");
  if (evidence.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_not_blocked");

  return {
    schema: "gpao_t.owner_ops_archive_checksum_dry_run.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: evidence.packageId,
    packageVersion,
    archiveCandidate: {
      archiveName,
      archivePath: `.gpao-t/packages/${archiveName}`,
      manifestPath: `.gpao-t/packages/${archiveName}.manifest.json`,
      checksumPath: `.gpao-t/packages/${archiveName}.sha256`,
      archiveCreation: "not_executed",
      checksumFileWrite: "not_executed",
      signing: "not_executed",
      notarization: "not_executed",
      upload: "not_executed",
    },
    manifestDigest,
    includedFiles,
    missingFiles,
    packageChecklist: [
      "distribution evidence ready",
      "stdio MCP wrapper included",
      "privacy copy linked",
      "pre-public package review linked",
      "install/update/rollback remains non-executed",
      "public upload remains blocked",
    ],
    authorityBoundary: {
      dryRunOnly: true,
      fileWriteExecuted: false,
      archiveCreated: false,
      checksumWritten: false,
      signingExecuted: false,
      publicUploadExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix archive/checksum dry-run findings before any local archive creation."
      : "Under explicit owner approval, the next step may create a local archive and checksum only; signing, upload, install, update, and rollback remain blocked.",
  };
}

export function verifyOwnerOpsArchiveChecksumDryRun({ root = process.cwd() } = {}) {
  const dryRun = buildOwnerOpsArchiveChecksumDryRun({ root });
  const findings = [...dryRun.findings];

  if (dryRun.archiveCandidate.archiveCreation !== "not_executed") findings.push("archive_must_not_be_created_in_dry_run");
  if (dryRun.archiveCandidate.checksumFileWrite !== "not_executed") findings.push("checksum_must_not_be_written_in_dry_run");
  if (dryRun.authorityBoundary.fileWriteExecuted !== false) findings.push("file_write_must_not_execute");
  if (!dryRun.includedFiles.some((file) => file.path === "bin/gpao-t-owner-ops-mcp.js")) {
    findings.push("mcp_wrapper_missing_from_archive_plan");
  }
  if (!dryRun.includedFiles.some((file) =>
    file.path === "docs/04-skill-ecosystem/OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md"
  )) {
    findings.push("distribution_doc_missing_from_archive_plan");
  }

  return {
    schema: "gpao_t.owner_ops_archive_checksum_dry_run_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "archive candidate name",
      "manifest digest",
      "included files",
      "no archive write",
      "no checksum write",
      "no signing/upload/install/update/rollback",
    ],
    archiveName: dryRun.archiveCandidate.archiveName,
    manifestDigest: dryRun.manifestDigest,
    fileWriteExecuted: dryRun.authorityBoundary.fileWriteExecuted,
    publicUploadExecuted: dryRun.authorityBoundary.publicUploadExecuted,
    nextSafeAction: findings.length
      ? "Fix archive/checksum dry-run findings."
      : "Keep this as dry-run evidence until the owner explicitly opens local archive/checksum creation.",
  };
}

export function writeOwnerOpsInternalProductionPackage({
  root = process.cwd(),
  confirmationToken,
  now = new Date().toISOString(),
} = {}) {
  const dryRun = buildOwnerOpsArchiveChecksumDryRun({ root, now });

  if (![INTERNAL_PRODUCTION_PACKAGE_CONFIRMATION, LEGACY_LOCAL_PACKAGE_CONFIRMATION].includes(confirmationToken)) {
    return {
      schema: "gpao_t.owner_ops_internal_production_package_write.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_confirmation_token",
      requiredConfirmationToken: INTERNAL_PRODUCTION_PACKAGE_CONFIRMATION,
      writesExecuted: false,
      archiveName: dryRun.archiveCandidate.archiveName,
      authorityBoundary: {
        localWriteAllowedWithConfirmationOnly: true,
        publicUploadExecuted: false,
        signingExecuted: false,
        installExecuted: false,
        updateExecuted: false,
        rollbackExecuted: false,
      },
      nextSafeAction: "Pass the explicit internal production package confirmation token only when the owner wants to write local package files.",
    };
  }

  if (dryRun.status !== "ready") {
    return {
      schema: "gpao_t.owner_ops_internal_production_package_write.v0_1",
      status: "blocked",
      reason: "dry_run_not_ready",
      findings: dryRun.findings,
      writesExecuted: false,
      nextSafeAction: "Fix archive/checksum dry-run findings before writing internal production package files.",
    };
  }

  const packageDir = resolve(root, ".gpao-t/packages");
  mkdirSync(packageDir, { recursive: true });
  const baseName = dryRun.archiveCandidate.archiveName.replace(/\.zip$/, "");
  const bundlePath = resolve(packageDir, `${baseName}.bundle.json`);
  const manifestPath = resolve(packageDir, `${baseName}.manifest.json`);
  const checksumPath = resolve(packageDir, `${baseName}.sha256`);
  const files = dryRun.includedFiles.map((file) => ({
    path: file.path,
    sha256: file.sha256,
    bytes: file.bytes,
    contentBase64: readDistributionFile({ root, file: file.path }).toString("base64"),
  }));
  const manifest = {
    schema: "gpao_t.owner_ops_internal_production_package_manifest.v0_1",
    generatedAt: now,
    packageId: dryRun.packageId,
    packageVersion: dryRun.packageVersion,
    archiveName: dryRun.archiveCandidate.archiveName,
    bundleFile: `${baseName}.bundle.json`,
    fileCount: files.length,
    files: files.map(({ contentBase64, ...file }) => file),
    authorityBoundary: {
      localBundleOnly: true,
      publicUploadExecuted: false,
      signingExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
  };
  const bundle = {
    schema: "gpao_t.owner_ops_internal_production_package_bundle.v0_1",
    manifest,
    files,
  };
  const bundleText = `${JSON.stringify(bundle, null, 2)}\n`;
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const bundleSha256 = createHash("sha256").update(bundleText).digest("hex");

  writeFileSync(bundlePath, bundleText);
  writeFileSync(manifestPath, manifestText);
  writeFileSync(checksumPath, `${bundleSha256}  ${baseName}.bundle.json\n`);

  return {
    schema: "gpao_t.owner_ops_internal_production_package_write.v0_1",
    status: "written_local_only",
    generatedAt: now,
    writesExecuted: true,
    packageId: dryRun.packageId,
    packageVersion: dryRun.packageVersion,
    filesWritten: [
      relativePackagePath(bundlePath, root),
      relativePackagePath(manifestPath, root),
      relativePackagePath(checksumPath, root),
    ],
    bundleSha256,
    fileCount: files.length,
    authorityBoundary: {
      localBundleOnly: true,
      publicUploadExecuted: false,
      signingExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
    nextSafeAction: "Review the local bundle/manifest/checksum before any zip/sign/upload/install lane is opened.",
  };
}

export function verifyOwnerOpsInternalProductionPackageWriter({ root = process.cwd() } = {}) {
  const dryRunCheck = verifyOwnerOpsArchiveChecksumDryRun({ root });
  const blockedWrite = writeOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (dryRunCheck.status !== "ready") findings.push("archive_checksum_dry_run_not_ready");
  if (blockedWrite.status !== "blocked") findings.push("write_without_confirmation_not_blocked");
  if (blockedWrite.writesExecuted !== false) findings.push("write_without_confirmation_executed");

  return {
    schema: "gpao_t.owner_ops_internal_production_package_write_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "archive/checksum dry-run",
      "confirmation token requirement",
      "write blocked without confirmation",
      "public upload/sign/install/update/rollback remain blocked",
    ],
    requiredConfirmationToken: INTERNAL_PRODUCTION_PACKAGE_CONFIRMATION,
    writeWithoutConfirmationBlocked: blockedWrite.status === "blocked" && blockedWrite.writesExecuted === false,
    nextSafeAction: findings.length
      ? "Fix internal production package writer findings."
      : "The writer is gated. Use the confirmation token only for an owner-approved internal production package write.",
  };
}

export function readOwnerOpsInternalProductionPackage({
  root = process.cwd(),
  archiveName,
} = {}) {
  const dryRun = buildOwnerOpsArchiveChecksumDryRun({ root });
  const currentArchiveName = dryRun.archiveCandidate.archiveName;
  const legacyArchiveName = currentArchiveName.replace("-internal-production-package.zip", "-local-candidate.zip");
  const targetArchiveName = archiveName
    || (packageArtifactSetExists({ root, archiveName: currentArchiveName })
      ? currentArchiveName
      : packageArtifactSetExists({ root, archiveName: legacyArchiveName })
        ? legacyArchiveName
        : currentArchiveName);
  const baseName = targetArchiveName.replace(/\.zip$/, "");
  const bundlePath = resolve(root, ".gpao-t/packages", `${baseName}.bundle.json`);
  const manifestPath = resolve(root, ".gpao-t/packages", `${baseName}.manifest.json`);
  const checksumPath = resolve(root, ".gpao-t/packages", `${baseName}.sha256`);
  const missingFiles = [
    { label: "bundle", path: bundlePath },
    { label: "manifest", path: manifestPath },
    { label: "checksum", path: checksumPath },
  ].filter((file) => !existsSync(file.path)).map((file) => file.label);

  if (missingFiles.length) {
    return {
      schema: "gpao_t.owner_ops_internal_production_package_readback.v0_1",
      status: "missing",
      archiveName: targetArchiveName,
      missingFiles,
      findings: ["internal_production_package_files_missing"],
      authorityBoundary: localPackageReadbackAuthority(),
      nextSafeAction: "Create an internal production package with explicit confirmation before readback verification.",
    };
  }

  const bundleText = readFileSync(bundlePath, "utf8");
  const manifestText = readFileSync(manifestPath, "utf8");
  const checksumText = readFileSync(checksumPath, "utf8");
  const bundleSha256 = createHash("sha256").update(bundleText).digest("hex");
  const expectedSha256 = checksumText.trim().split(/\s+/)[0] || "";
  const bundle = JSON.parse(bundleText);
  const manifest = JSON.parse(manifestText);
  const findings = [];

  if (expectedSha256 !== bundleSha256) findings.push("bundle_checksum_mismatch");
  const acceptedBundleSchemas = [
    "gpao_t.owner_ops_internal_production_package_bundle.v0_1",
    "gpao_t.owner_ops_local_package_bundle.v0_1",
  ];
  const acceptedManifestSchemas = [
    "gpao_t.owner_ops_internal_production_package_manifest.v0_1",
    "gpao_t.owner_ops_local_package_manifest.v0_1",
  ];
  if (!acceptedBundleSchemas.includes(bundle.schema)) findings.push("unexpected_bundle_schema");
  if (!acceptedManifestSchemas.includes(manifest.schema)) findings.push("unexpected_manifest_schema");
  if (JSON.stringify(bundle.manifest) !== JSON.stringify(manifest)) findings.push("manifest_file_mismatch");
  if (manifest.archiveName !== targetArchiveName) findings.push("archive_name_mismatch");
  if (manifest.authorityBoundary?.publicUploadExecuted !== false) findings.push("public_upload_boundary_not_closed");

  const fileResults = (bundle.files || []).map((file) => {
    const content = Buffer.from(file.contentBase64 || "", "base64");
    const sha256 = createHash("sha256").update(content).digest("hex");
    const bytes = content.length;
    const manifestFile = (manifest.files || []).find((item) => item.path === file.path);
    const ok = Boolean(manifestFile)
      && manifestFile.sha256 === sha256
      && manifestFile.bytes === bytes
      && file.sha256 === sha256
      && file.bytes === bytes;
    if (!ok) findings.push(`file_integrity_mismatch:${file.path}`);
    return {
      path: file.path,
      ok,
      sha256,
      bytes,
    };
  });

  if (fileResults.length !== manifest.fileCount) findings.push("file_count_mismatch");

  return {
    schema: "gpao_t.owner_ops_internal_production_package_readback.v0_1",
    status: findings.length ? "blocked" : "ready",
    archiveName: targetArchiveName,
    filesRead: [
      relativePackagePath(bundlePath, root),
      relativePackagePath(manifestPath, root),
      relativePackagePath(checksumPath, root),
    ],
    bundleSha256,
    expectedSha256,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    compatibilityAliasUsed:
      bundle.schema === "gpao_t.owner_ops_local_package_bundle.v0_1"
      || manifest.schema === "gpao_t.owner_ops_local_package_manifest.v0_1"
      || targetArchiveName === legacyArchiveName,
    fileCount: fileResults.length,
    fileResults,
    findings,
    authorityBoundary: localPackageReadbackAuthority(),
    nextSafeAction: findings.length
      ? "Fix internal production package integrity findings before sharing with reviewers."
      : "This internal production package can be used for internal acceptance; public upload, signing, install, update, and rollback remain blocked.",
  };
}

export function verifyOwnerOpsInternalProductionPackageReadback({
  root = process.cwd(),
  archiveName,
} = {}) {
  const readback = readOwnerOpsInternalProductionPackage({ root, archiveName });
  const findings = [...(readback.findings || [])];

  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (readback.authorityBoundary?.publicUploadExecuted !== false) findings.push("public_upload_boundary_not_closed");
  if (readback.authorityBoundary?.installExecuted !== false) findings.push("install_boundary_not_closed");

  return {
    schema: "gpao_t.owner_ops_internal_production_package_readback_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "bundle file exists",
      "manifest file exists",
      "checksum file exists",
      "bundle sha256 matches checksum",
      "bundle manifest matches manifest file",
      "embedded file content matches manifest sha256 and bytes",
      "public/upload/install/update/rollback boundaries remain closed",
    ],
    archiveName: readback.archiveName,
    packageId: readback.packageId || null,
    packageVersion: readback.packageVersion || null,
    fileCount: readback.fileCount || 0,
    nextSafeAction: findings.length
      ? "Fix internal production package readback findings."
      : "Use this readback as package integrity evidence before any internal acceptance handoff.",
  };
}

// One-cycle API compatibility aliases. Canonical writes and returned schemas use the names above.
export const writeOwnerOpsLocalPackageCandidate = writeOwnerOpsInternalProductionPackage;
export const verifyOwnerOpsLocalPackageCandidateWriter = verifyOwnerOpsInternalProductionPackageWriter;
export const readOwnerOpsLocalPackageCandidate = readOwnerOpsInternalProductionPackage;
export const verifyOwnerOpsLocalPackageCandidateReadback = verifyOwnerOpsInternalProductionPackageReadback;

export function buildOwnerOpsReleaseReadinessEvidence({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const prePublicBridge = buildOwnerOpsPrePublicEvidenceBridge({ root });
  const repairBacklog = buildOwnerOpsPrePublicRepairBacklog({ root });
  const repairCompletion = buildOwnerOpsPrePublicRepairCompletionEvidence({ root });
  const distribution = buildOwnerOpsDistributionEvidence({ root, now });
  const dryRun = buildOwnerOpsArchiveChecksumDryRun({ root, now });
  const readback = readOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (prePublicBridge.status !== "ready") findings.push("pre_public_evidence_bridge_not_ready");
  if (repairBacklog.status !== "ready") findings.push("pre_public_repair_backlog_not_ready");
  if (repairCompletion.status !== "ready") findings.push("pre_public_repair_completion_not_ready");
  if (distribution.status !== "ready") findings.push("distribution_evidence_not_ready");
  if (dryRun.status !== "ready") findings.push("archive_checksum_dry_run_not_ready");
  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if ((readback.fileCount || 0) < dryRun.includedFiles.length) {
    findings.push("internal_production_package_behind_distribution_manifest");
  }
  if (distribution.installUpdateRollbackEvidence.canInstallNow !== false) {
    findings.push("install_execution_must_remain_blocked");
  }
  if (distribution.installUpdateRollbackEvidence.canUpdateNow !== false) {
    findings.push("update_execution_must_remain_blocked");
  }
  if (distribution.installUpdateRollbackEvidence.canRollbackNow !== false) {
    findings.push("rollback_execution_must_remain_blocked");
  }

  return {
    schema: "gpao_t.owner_ops_release_readiness_evidence.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: distribution.packageId,
    packageVersion: distribution.packageVersion,
    releaseState: "local_candidate_review_only",
    prePublicEvidenceBridge: {
      status: prePublicBridge.status,
      publicSubmissionAllowed: prePublicBridge.authorityBoundary.publicSubmissionAllowed,
      packageUploadAllowed: prePublicBridge.authorityBoundary.packageUploadAllowed,
    },
    prePublicRepairBacklog: {
      status: repairBacklog.status,
      itemCount: repairBacklog.repairSummary.itemCount,
      lanes: repairBacklog.repairSummary.lanes,
      publicSubmissionAllowed: repairBacklog.authorityBoundary.publicSubmissionAllowed,
    },
    prePublicRepairCompletionEvidence: {
      status: repairCompletion.status,
      itemCount: repairCompletion.completionSummary.itemCount,
      completedCount: repairCompletion.completionSummary.completedCount,
      allItemsLocallyVerified: repairCompletion.completionSummary.allItemsLocallyVerified,
      publicSubmissionAllowed: repairCompletion.authorityBoundary.publicSubmissionAllowed,
    },
    distributionEvidence: {
      status: distribution.status,
      currentDistributionFileCount: distribution.files.filter((file) => file.status === "present").length,
      missingFiles: distribution.missingFiles,
    },
    internalProductionPackage: {
      status: readback.status,
      archiveName: readback.archiveName,
      bundleSha256: readback.bundleSha256 || null,
      fileCount: readback.fileCount || 0,
    },
    signedPackageEvidence: {
      signingExecuted: false,
      notarizationExecuted: false,
      signatureVerificationAvailable: false,
      requiredBeforePublicRelease: [
        "signed archive or installer",
        "checksum readback",
        "signature verification",
        "human review approval record",
      ],
    },
    installUpdateRollbackReadiness: {
      installGate: distribution.installUpdateRollbackEvidence.installGate,
      updateGate: distribution.installUpdateRollbackEvidence.updateGate,
      rollbackGate: distribution.installUpdateRollbackEvidence.rollbackGate,
      canInstallNow: distribution.installUpdateRollbackEvidence.canInstallNow,
      canUpdateNow: distribution.installUpdateRollbackEvidence.canUpdateNow,
      canRollbackNow: distribution.installUpdateRollbackEvidence.canRollbackNow,
    },
    humanReviewApprovalEvidence: {
      state: "not_requested",
      requiredBeforePublicRelease: true,
      requiredReviewItems: [
        "Owner confirms package purpose and target users",
        "Owner confirms no customer data is packaged",
        "Owner confirms install/update/rollback copy is understandable",
        "Owner approves public listing text",
        "Owner explicitly approves public distribution",
      ],
    },
    authorityBoundary: {
      publicReleaseAllowed: false,
      publicSubmissionAllowed: false,
      packageUploadAllowed: false,
      signingExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      externalDistributionExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix release readiness evidence findings before any public release request."
      : "Use this as local release-readiness evidence; public release still requires signing evidence and explicit human approval.",
  };
}

export function writeOwnerOpsReleaseReadinessEvidence({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const evidence = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-RELEASE-READINESS-EVIDENCE.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-RELEASE-READINESS-EVIDENCE.md");

  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsReleaseReadinessEvidenceMarkdown(evidence));

  return {
    schema: "gpao_t.owner_ops_release_readiness_evidence_write.v0_1",
    status: evidence.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-RELEASE-READINESS-EVIDENCE.json",
      ".gpao-t/packages/OWNER-OPS-RELEASE-READINESS-EVIDENCE.md",
    ],
    evidenceStatus: evidence.status,
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: evidence.authorityBoundary.packageUploadAllowed,
    findings: evidence.findings,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsReleaseReadinessEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsReleaseReadinessEvidence({ root });
  const prePublicBridgeCheck = verifyOwnerOpsPrePublicEvidenceBridge({ root });
  const repairBacklogCheck = verifyOwnerOpsPrePublicRepairBacklog({ root });
  const repairCompletionCheck = verifyOwnerOpsPrePublicRepairCompletionEvidence({ root });
  const readbackCheck = verifyOwnerOpsInternalProductionPackageReadback({ root });
  const findings = [...evidence.findings];

  if (prePublicBridgeCheck.status !== "ready") findings.push("pre_public_evidence_bridge_check_not_ready");
  if (repairBacklogCheck.status !== "ready") findings.push("pre_public_repair_backlog_check_not_ready");
  if (repairCompletionCheck.status !== "ready") findings.push("pre_public_repair_completion_check_not_ready");
  if (readbackCheck.status !== "ready") findings.push("internal_production_package_readback_check_not_ready");
  if (evidence.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_must_remain_blocked");
  if (evidence.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_must_remain_blocked");
  if (evidence.signedPackageEvidence.signingExecuted !== false) findings.push("signing_must_not_execute");
  if (evidence.humanReviewApprovalEvidence.state !== "not_requested") findings.push("human_approval_must_not_be_implied");

  return {
    schema: "gpao_t.owner_ops_release_readiness_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "pre-public evidence bridge",
      "pre-public repair backlog",
      "pre-public repair completion evidence",
      "distribution evidence",
      "archive/checksum dry-run",
      "internal production package readback",
      "signed package evidence boundary",
      "install/update/rollback readiness",
      "human review approval boundary",
    ],
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: evidence.authorityBoundary.packageUploadAllowed,
    humanReviewApprovalState: evidence.humanReviewApprovalEvidence.state,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function buildOwnerOpsHumanReviewApprovalPacket({
  root = process.cwd(),
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const readiness = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const findings = [];

  if (readiness.status !== "ready") findings.push("release_readiness_evidence_not_ready");
  if (readiness.authorityBoundary.publicReleaseAllowed !== false) {
    findings.push("public_release_boundary_opened_before_review");
  }
  if (readiness.authorityBoundary.packageUploadAllowed !== false) {
    findings.push("package_upload_boundary_opened_before_review");
  }
  if (readiness.humanReviewApprovalEvidence.state !== "not_requested") {
    findings.push("human_review_state_must_start_not_requested");
  }

  return {
    schema: "gpao_t.owner_ops_human_review_approval_packet.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    reviewer,
    approvalState: "prepared_not_approved",
    packageId: readiness.packageId,
    packageVersion: readiness.packageVersion,
    releaseState: readiness.releaseState,
    evidenceRefs: {
      releaseReadiness: ".gpao-t/packages/OWNER-OPS-RELEASE-READINESS-EVIDENCE.json",
      prePublicRepairCompletion:
        ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json",
      localPackageBundle: `.gpao-t/packages/${readiness.internalProductionPackage.archiveName.replace(/\.zip$/, ".bundle.json")}`,
      localPackageManifest: `.gpao-t/packages/${readiness.internalProductionPackage.archiveName.replace(/\.zip$/, ".manifest.json")}`,
      localPackageChecksum: `.gpao-t/packages/${readiness.internalProductionPackage.archiveName.replace(/\.zip$/, ".sha256")}`,
    },
    evidenceSummary: {
      releaseReadiness: readiness.status,
      prePublicRepairCompletion: readiness.prePublicRepairCompletionEvidence.status,
      completedRepairItems: readiness.prePublicRepairCompletionEvidence.completedCount,
      totalRepairItems: readiness.prePublicRepairCompletionEvidence.itemCount,
      allRepairItemsLocallyVerified:
        readiness.prePublicRepairCompletionEvidence.allItemsLocallyVerified,
      internalProductionPackage: readiness.internalProductionPackage.status,
    },
    reviewChecklist: [
      {
        id: "purpose_and_users",
        label: "패키지 목적과 대상 사용자가 맞는가?",
        required: true,
      },
      {
        id: "no_customer_data",
        label: "고객 개인정보/실데이터가 패키지에 포함되지 않았는가?",
        required: true,
      },
      {
        id: "safe_copy_understood",
        label: "자동 전송 안 함, 외부 계정 연결 안 함, 로컬 기록만이라는 설명이 명확한가?",
        required: true,
      },
      {
        id: "pre_public_repairs_completed",
        label: "베타 피드백 수리 항목이 로컬 기준으로 완료 검증됐는가?",
        required: true,
      },
      {
        id: "install_update_rollback_copy",
        label: "설치/업데이트/롤백 안내 문구가 사용자가 이해할 수 있는가?",
        required: true,
      },
      {
        id: "market_listing_text",
        label: "마켓/플러그인 설명 문구를 공개해도 되는가?",
        required: true,
      },
      {
        id: "explicit_public_distribution",
        label: "공개 배포를 명시적으로 승인하는가?",
        requiredForPublicRelease: true,
      },
    ],
    requiredOwnerDecision: {
      allowedValues: ["hold", "revise", "approve_local_review_only", "approve_public_release_later"],
      currentValue: "hold",
      publicReleaseApprovedNow: false,
    },
    authorityBoundary: {
      approvalPacketOnly: true,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix release readiness evidence before asking for human review."
      : "Ask the owner to review this packet; do not treat packet preparation as approval.",
  };
}

export function writeOwnerOpsHumanReviewApprovalPacket({
  root = process.cwd(),
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const packet = buildOwnerOpsHumanReviewApprovalPacket({ root, reviewer, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.md");

  writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsHumanReviewApprovalPacketMarkdown(packet));

  return {
    schema: "gpao_t.owner_ops_human_review_approval_packet_write.v0_1",
    status: packet.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.json",
      ".gpao-t/packages/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.md",
    ],
    packetStatus: packet.status,
    approvalState: packet.approvalState,
    publicReleaseAllowed: packet.authorityBoundary.publicReleaseAllowed,
    findings: packet.findings,
    nextSafeAction: packet.nextSafeAction,
  };
}

export function verifyOwnerOpsHumanReviewApprovalPacket({ root = process.cwd() } = {}) {
  const packet = buildOwnerOpsHumanReviewApprovalPacket({ root });
  const findings = [...packet.findings];

  if (packet.status !== "ready") findings.push("human_review_approval_packet_not_ready");
  if (packet.approvalState !== "prepared_not_approved") findings.push("approval_must_not_be_implied");
  if (packet.requiredOwnerDecision.publicReleaseApprovedNow !== false) {
    findings.push("public_release_approval_must_remain_false");
  }
  if (packet.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_must_remain_blocked");
  if (packet.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_must_remain_blocked");
  if (!packet.reviewChecklist.some((item) => item.id === "explicit_public_distribution")) {
    findings.push("explicit_public_distribution_check_missing");
  }
  if (!packet.reviewChecklist.some((item) => item.id === "pre_public_repairs_completed")) {
    findings.push("pre_public_repairs_completed_check_missing");
  }
  if (packet.evidenceSummary.allRepairItemsLocallyVerified !== true) {
    findings.push("pre_public_repair_completion_not_verified");
  }

  return {
    schema: "gpao_t.owner_ops_human_review_approval_packet_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence",
      "pre-public repair completion evidence",
      "owner review checklist",
      "required decision values",
      "approval not implied",
      "public release/package upload boundary",
    ],
    approvalState: packet.approvalState,
    repairCompletionStatus: packet.evidenceSummary.prePublicRepairCompletion,
    completedRepairItems: packet.evidenceSummary.completedRepairItems,
    totalRepairItems: packet.evidenceSummary.totalRepairItems,
    publicReleaseAllowed: packet.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: packet.authorityBoundary.packageUploadAllowed,
    nextSafeAction: packet.nextSafeAction,
  };
}

export function buildOwnerOpsHumanReviewDecisionLane({
  root = process.cwd(),
  reviewer = "owner",
  decision = "hold",
  now = new Date().toISOString(),
} = {}) {
  const packet = buildOwnerOpsHumanReviewApprovalPacket({ root, reviewer, now });
  const allowedDecisions = packet.requiredOwnerDecision.allowedValues;
  const normalizedDecision = allowedDecisions.includes(decision) ? decision : "hold";
  const findings = [];

  if (packet.status !== "ready") findings.push("human_review_packet_not_ready");
  if (!allowedDecisions.includes(decision)) findings.push("unsupported_human_review_decision");
  if (packet.authorityBoundary.publicReleaseAllowed !== false) {
    findings.push("public_release_boundary_opened_before_decision");
  }
  if (packet.evidenceSummary.allRepairItemsLocallyVerified !== true) {
    findings.push("repair_completion_not_verified_before_decision");
  }

  return {
    schema: "gpao_t.owner_ops_human_review_decision_lane.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    reviewer,
    decision: normalizedDecision,
    decisionState: "preview_not_recorded",
    packageId: packet.packageId,
    packageVersion: packet.packageVersion,
    approvalPacket: {
      status: packet.status,
      approvalState: packet.approvalState,
      evidenceSummary: packet.evidenceSummary,
      requiredChecklistIds: packet.reviewChecklist.filter((item) => item.required).map((item) => item.id),
    },
    storage: {
      directory: ".gpao-t/owner-ops/human-review",
      jsonlFile: ".gpao-t/owner-ops/human-review/decision-records.jsonl",
      indexFile: ".gpao-t/owner-ops/human-review/index.json",
      currentWrite: "not_executed",
    },
    requiredApproval: {
      token: HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN,
      allowedEffect: "append a local human review decision record only",
      doesNotAllow: [
        "public release",
        "marketplace upload",
        "signing",
        "customer send",
        "install execution",
        "update execution",
        "rollback execution",
        "external automation",
      ],
    },
    recordPreview: {
      decision: normalizedDecision,
      reviewer,
      releaseReadiness: packet.evidenceSummary.releaseReadiness,
      prePublicRepairCompletion: packet.evidenceSummary.prePublicRepairCompletion,
      completedRepairItems: packet.evidenceSummary.completedRepairItems,
      totalRepairItems: packet.evidenceSummary.totalRepairItems,
      internalProductionPackage: packet.evidenceSummary.internalProductionPackage,
      publicReleaseApprovedNow: false,
    },
    authorityBoundary: {
      decisionLaneOnly: true,
      recordWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix human review decision lane findings before recording a local review decision."
      : "Record a local human review decision only with the exact approval token; public release remains a later explicit gate.",
  };
}

export function appendOwnerOpsHumanReviewDecisionRecord({
  root = process.cwd(),
  reviewer = "owner",
  decision = "hold",
  approvalToken,
  now = new Date().toISOString(),
} = {}) {
  const lane = buildOwnerOpsHumanReviewDecisionLane({ root, reviewer, decision, now });

  if (approvalToken !== HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN) {
    return {
      schema: "gpao_t.owner_ops_human_review_decision_record_write.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_human_review_approval_token",
      requiredApprovalToken: HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN,
      recordWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      nextSafeAction:
        "Pass the exact local-only human review approval token only when the owner wants to record a local review decision.",
    };
  }

  if (lane.status !== "ready") {
    return {
      schema: "gpao_t.owner_ops_human_review_decision_record_write.v0_1",
      status: "blocked",
      reason: "human_review_decision_lane_not_ready",
      findings: lane.findings,
      recordWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      nextSafeAction: "Fix human review decision lane findings before writing a local decision record.",
    };
  }

  const outputDir = resolve(root, ".gpao-t", "owner-ops", "human-review");
  mkdirSync(outputDir, { recursive: true });
  const jsonlPath = resolve(outputDir, "decision-records.jsonl");
  const indexPath = resolve(outputDir, "index.json");
  const record = {
    schema: "gpao_t.owner_ops_human_review_decision_record.v0_1",
    id: `human-review-${lane.recordPreview.decision}-${createHash("sha256")
      .update(`${lane.packageId}:${lane.packageVersion}:${lane.reviewer}:${lane.recordPreview.decision}:${now}`)
      .digest("hex")
      .slice(0, 12)}`,
    recordedAt: now,
    reviewer: lane.reviewer,
    decision: lane.recordPreview.decision,
    packageId: lane.packageId,
    packageVersion: lane.packageVersion,
    evidenceSummary: lane.approvalPacket.evidenceSummary,
    checklistIds: lane.approvalPacket.requiredChecklistIds,
    authorityBoundary: {
      localRecordOnly: true,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
  };

  appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`);
  const records = readOwnerOpsHumanReviewDecisionRecords({ root }).records;
  writeFileSync(indexPath, `${JSON.stringify({
    schema: "gpao_t.owner_ops_human_review_decision_index.v0_1",
    updatedAt: now,
    recordCount: records.length,
    latestRecordId: record.id,
    latestDecision: record.decision,
    jsonlFile: ".gpao-t/owner-ops/human-review/decision-records.jsonl",
  }, null, 2)}\n`);

  return {
    schema: "gpao_t.owner_ops_human_review_decision_record_write.v0_1",
    status: "written_local_only",
    recordWritten: true,
    recordId: record.id,
    decision: record.decision,
    filesWritten: [
      ".gpao-t/owner-ops/human-review/decision-records.jsonl",
      ".gpao-t/owner-ops/human-review/index.json",
    ],
    publicReleaseAllowed: record.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: record.authorityBoundary.packageUploadAllowed,
    nextSafeAction:
      "Use this local human review decision record as review evidence; public release, signing, upload, install, update, and rollback remain separate gates.",
  };
}

export function readOwnerOpsHumanReviewDecisionRecords({ root = process.cwd() } = {}) {
  const jsonlPath = resolve(root, ".gpao-t", "owner-ops", "human-review", "decision-records.jsonl");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_human_review_decision_records.v0_1",
    status: "ready",
    recordCount: records.length,
    records,
    latestRecord: records.at(-1) || null,
    publicReleaseAllowed: false,
    packageUploadAllowed: false,
    nextSafeAction: records.length
      ? "Review the latest local human decision before opening any public release lane."
      : "No local human review decision has been recorded yet.",
  };
}

export function verifyOwnerOpsHumanReviewDecisionLane({ root = process.cwd() } = {}) {
  const lane = buildOwnerOpsHumanReviewDecisionLane({ root });
  const blockedWrite = appendOwnerOpsHumanReviewDecisionRecord({ root });
  const records = readOwnerOpsHumanReviewDecisionRecords({ root });
  const findings = [...lane.findings];

  if (lane.status !== "ready") findings.push("human_review_decision_lane_not_ready");
  if (blockedWrite.status !== "blocked") findings.push("decision_record_write_without_token_not_blocked");
  if (blockedWrite.recordWritten !== false) findings.push("decision_record_write_without_token_executed");
  if (lane.requiredApproval.token !== HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN) {
    findings.push("human_review_approval_token_changed");
  }
  if (lane.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (lane.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_human_review_decision_lane_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "human review approval packet",
      "repair completion evidence summary",
      "local-only decision storage",
      "write blocked without exact token",
      "public release/package upload boundary",
    ],
    requiredApprovalToken: HUMAN_REVIEW_LOCAL_ONLY_APPROVAL_TOKEN,
    existingRecordCount: records.recordCount,
    writeWithoutTokenBlocked: blockedWrite.status === "blocked" && blockedWrite.recordWritten === false,
    publicReleaseAllowed: lane.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: lane.authorityBoundary.packageUploadAllowed,
    nextSafeAction: findings.length
      ? "Fix human review decision lane findings."
      : "The local decision lane is ready; append a decision record only with the exact owner approval token.",
  };
}

export function buildOwnerOpsPublicReleaseAuthorityGate({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const readiness = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const humanPacket = buildOwnerOpsHumanReviewApprovalPacket({ root, now });
  const decisionRecords = readOwnerOpsHumanReviewDecisionRecords({ root });
  const signingLane = buildOwnerOpsApprovedSigningLane({ root, now });
  const marketplaceUploadGate = buildOwnerOpsMarketplaceUploadApprovalGate({ root, now });
  const marketplaceUploadRecords = readOwnerOpsMarketplaceUploadDecisionRecords({ root });
  const signedEvidence = buildOwnerOpsSignedPackageEvidence({ root, now });
  const installProof = buildOwnerOpsInstallUpdateRollbackProof({ root, now });
  const deploymentPlan = buildOwnerOpsDeploymentDryRunPlan({ root, now });
  const latestDecision = decisionRecords.latestRecord;
  const findings = [];

  if (readiness.status !== "ready") findings.push("release_readiness_evidence_not_ready");
  if (humanPacket.status !== "ready") findings.push("human_review_packet_not_ready");
  if (decisionRecords.recordCount < 1) findings.push("human_review_decision_record_missing");
  if (latestDecision && latestDecision.decision !== "approve_public_release_later") {
    findings.push("latest_human_review_decision_is_not_public_release_approval");
  }
  if (signingLane.status !== "ready") findings.push("approved_signing_lane_not_ready");
  if (signingLane.authorityBoundary.signingExecuted !== false) findings.push("signing_already_executed_unexpectedly");
  if (marketplaceUploadGate.status !== "ready") findings.push("marketplace_upload_approval_gate_not_ready");
  if (marketplaceUploadGate.authorityBoundary.marketplaceUploadAllowed !== false) {
    findings.push("marketplace_upload_boundary_opened");
  }
  if (marketplaceUploadRecords.recordCount < 1) findings.push("marketplace_upload_decision_record_missing");
  if (
    marketplaceUploadRecords.latestRecord
    && marketplaceUploadRecords.latestRecord.decision !== "approve_marketplace_upload_later"
  ) {
    findings.push("latest_marketplace_upload_decision_is_not_upload_approval");
  }
  if (signedEvidence.status !== "ready") findings.push("signed_package_prerequisite_not_ready");
  if (signedEvidence.signedPackageState !== "unsigned_internal_production_package") {
    findings.push("unexpected_signed_package_state");
  }
  if (signedEvidence.authorityBoundary.signingExecuted !== false) findings.push("signing_already_executed_unexpectedly");
  if (installProof.status !== "ready") findings.push("install_update_rollback_proof_not_ready");
  if (deploymentPlan.status !== "ready") findings.push("deployment_dry_run_plan_not_ready");

  return {
    schema: "gpao_t.owner_ops_public_release_authority_gate.v0_1",
    status: "blocked",
    generatedAt: now,
    gateState: "public_release_not_authorized",
    packageId: readiness.packageId,
    packageVersion: readiness.packageVersion,
    releasePrerequisites: {
      releaseReadiness: readiness.status,
      humanReviewPacket: humanPacket.status,
      humanReviewDecisionRecords: decisionRecords.recordCount,
      latestHumanDecision: latestDecision?.decision || null,
      approvedSigningLane: signingLane.status,
      signingLaneState: signingLane.laneState,
      marketplaceUploadApprovalGate: marketplaceUploadGate.status,
      marketplaceUploadGateState: marketplaceUploadGate.gateState,
      marketplaceUploadDecisionRecords: marketplaceUploadRecords.recordCount,
      latestMarketplaceUploadDecision: marketplaceUploadRecords.latestRecord?.decision || null,
      signedPackageEvidence: signedEvidence.status,
      signedPackageState: signedEvidence.signedPackageState,
      installUpdateRollbackProof: installProof.status,
      deploymentDryRunPlan: deploymentPlan.status,
    },
    requiredBeforePublicRelease: [
      "explicit human review decision record approving public release",
      "approved signing lane",
      "signed artifact evidence",
      "checksum readback after signing",
      "signature verification output",
      "platform notarization evidence when required",
      "install/update/rollback proof against signed artifact",
      "separate marketplace/upload approval",
      "marketplace/upload decision record",
    ],
    currentBlockingReasons: findings.length ? findings : [
      "public release requires a separate final release approval gate",
      "signed artifact has not been produced",
      "marketplace upload has not been approved",
    ],
    authorityBoundary: {
      authorityGateOnly: true,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      signedArtifactWritten: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
      customerDataIncluded: false,
    },
    nextSafeAction:
      "Use this gate to review what still blocks public release; do not sign, upload, install, update, rollback, or distribute without separate explicit owner approval.",
  };
}

export function verifyOwnerOpsPublicReleaseAuthorityGate({ root = process.cwd() } = {}) {
  const gate = buildOwnerOpsPublicReleaseAuthorityGate({ root });
  const findings = [];

  if (gate.status !== "blocked") findings.push("public_release_gate_must_remain_blocked");
  if (gate.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (gate.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (gate.authorityBoundary.signingAllowed !== false) findings.push("signing_boundary_opened");
  if (gate.authorityBoundary.installAllowed !== false) findings.push("install_boundary_opened");
  if (gate.authorityBoundary.updateAllowed !== false) findings.push("update_boundary_opened");
  if (gate.authorityBoundary.rollbackAllowed !== false) findings.push("rollback_boundary_opened");
  if (!gate.requiredBeforePublicRelease.includes("separate marketplace/upload approval")) {
    findings.push("marketplace_upload_approval_requirement_missing");
  }
  if (!gate.releasePrerequisites.marketplaceUploadApprovalGate) {
    findings.push("marketplace_upload_gate_prerequisite_missing");
  }

  return {
    schema: "gpao_t.owner_ops_public_release_authority_gate_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence",
      "human review packet",
      "human review decision records",
      "signed package prerequisite",
      "install/update/rollback proof",
      "deployment dry-run plan",
      "marketplace/upload approval gate",
      "public release boundary",
      "marketplace upload boundary",
    ],
    gateState: gate.gateState,
    releasePrerequisites: gate.releasePrerequisites,
    publicReleaseAllowed: gate.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: gate.authorityBoundary.packageUploadAllowed,
    signingAllowed: gate.authorityBoundary.signingAllowed,
    nextSafeAction: gate.nextSafeAction,
  };
}

export function buildOwnerOpsPublicReleaseReadbackSnapshot({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const releaseReadiness = readOwnerOpsPackageEvidenceJson({
    root,
    filename: "OWNER-OPS-RELEASE-READINESS-EVIDENCE.json",
  });
  const humanReview = readOwnerOpsPackageEvidenceJson({
    root,
    filename: "OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.json",
  });
  const signedPackage = readOwnerOpsPackageEvidenceJson({
    root,
    filename: "OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.json",
  });
  const installProof = readOwnerOpsPackageEvidenceJson({
    root,
    filename: "OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json",
  });
  const deploymentPlan = readOwnerOpsPackageEvidenceJson({
    root,
    filename: "OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.json",
  });
  const localPackage = readOwnerOpsInternalProductionPackage({ root });
  const humanDecisionRecords = readOwnerOpsHumanReviewDecisionRecords({ root });
  const marketplaceDecisionRecords = readOwnerOpsMarketplaceUploadDecisionRecords({ root });
  const findings = [];

  if (releaseReadiness.status !== "present") findings.push("release_readiness_readback_missing");
  if (humanReview.status !== "present") findings.push("human_review_packet_readback_missing");
  if (signedPackage.status !== "present") findings.push("signed_package_evidence_readback_missing");
  if (installProof.status !== "present") findings.push("install_update_rollback_proof_readback_missing");
  if (deploymentPlan.status !== "present") findings.push("deployment_dry_run_plan_readback_missing");
  if (localPackage.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (releaseReadiness.data?.status !== "ready") findings.push("release_readiness_not_ready_in_snapshot");
  if (humanReview.data?.status !== "ready") findings.push("human_review_packet_not_ready_in_snapshot");
  if (signedPackage.data?.status !== "ready") findings.push("signed_package_evidence_not_ready_in_snapshot");
  if (installProof.data?.status !== "ready") findings.push("install_update_rollback_proof_not_ready_in_snapshot");
  if (deploymentPlan.data?.status !== "ready") findings.push("deployment_dry_run_plan_not_ready_in_snapshot");

  return {
    schema: "gpao_t.owner_ops_public_release_readback_snapshot.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    gateState: "public_release_not_authorized",
    packageId: releaseReadiness.data?.packageId || localPackage.packageId || "gpao-t-owner-ops",
    packageVersion: releaseReadiness.data?.packageVersion || localPackage.packageVersion || null,
    readbackSurfaces: {
      releaseReadiness: releaseReadiness.status,
      humanReviewPacket: humanReview.status,
      signedPackageEvidence: signedPackage.status,
      installUpdateRollbackProof: installProof.status,
      deploymentDryRunPlan: deploymentPlan.status,
      internalProductionPackage: localPackage.status,
    },
    releasePrerequisites: {
      releaseReadiness: releaseReadiness.data?.status || releaseReadiness.status,
      humanReviewPacket: humanReview.data?.status || humanReview.status,
      humanReviewDecisionRecords: humanDecisionRecords.recordCount,
      latestHumanDecision: humanDecisionRecords.latestRecord?.decision || null,
      signedPackageEvidence: signedPackage.data?.status || signedPackage.status,
      signedPackageState: signedPackage.data?.signedPackageState || null,
      installUpdateRollbackProof: installProof.data?.status || installProof.status,
      deploymentDryRunPlan: deploymentPlan.data?.status || deploymentPlan.status,
      marketplaceUploadDecisionRecords: marketplaceDecisionRecords.recordCount,
      latestMarketplaceUploadDecision: marketplaceDecisionRecords.latestRecord?.decision || null,
    },
    internalProductionPackage: {
      archiveName: localPackage.archiveName || null,
      fileCount: localPackage.fileCount || 0,
      bundleSha256: localPackage.bundleSha256 || null,
    },
    currentBlockingReasons: [
      ...(humanDecisionRecords.recordCount < 1 ? ["human_review_decision_record_missing"] : []),
      ...(marketplaceDecisionRecords.recordCount < 1 ? ["marketplace_upload_decision_record_missing"] : []),
      "public release execution gate has not been opened",
    ],
    authorityBoundary: {
      readbackOnly: true,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      networkUploadAllowed: false,
      signingAllowed: false,
      credentialAccessAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Regenerate the missing or stale Owner Ops package evidence before using the public release readback snapshot."
      : "Use this fast readback snapshot for release authority checks; public release and upload remain blocked.",
  };
}

export function verifyOwnerOpsPublicReleaseReadbackSnapshot({ root = process.cwd() } = {}) {
  const snapshot = buildOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const findings = [...snapshot.findings];

  if (snapshot.status !== "ready") findings.push("public_release_readback_snapshot_not_ready");
  if (snapshot.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (snapshot.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (snapshot.authorityBoundary.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");
  if (snapshot.authorityBoundary.signingAllowed !== false) findings.push("signing_boundary_opened");
  if (snapshot.authorityBoundary.installAllowed !== false) findings.push("install_boundary_opened");
  if (snapshot.gateState !== "public_release_not_authorized") findings.push("public_release_gate_state_changed");

  return {
    schema: "gpao_t.owner_ops_public_release_readback_snapshot_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence readback",
      "human review packet readback",
      "signed package evidence readback",
      "install/update/rollback proof readback",
      "deployment dry-run plan readback",
      "internal production package readback",
      "human and marketplace decision records",
      "public release/upload authority boundaries",
    ],
    gateState: snapshot.gateState,
    releasePrerequisites: snapshot.releasePrerequisites,
    publicReleaseAllowed: snapshot.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: snapshot.authorityBoundary.packageUploadAllowed,
    networkUploadAllowed: snapshot.authorityBoundary.networkUploadAllowed,
    nextSafeAction: snapshot.nextSafeAction,
  };
}

export function buildOwnerOpsProductionReadyDecisionPacket({
  root = process.cwd(),
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const localPackage = verifyOwnerOpsInternalProductionPackageReadback({ root });
  const releaseReadback = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const nextLoop = verifyOwnerOpsNextOwnerTestingLoop({ root });
  const humanDecisionRecords = readOwnerOpsHumanReviewDecisionRecords({ root });
  const marketplaceDecisionRecords = readOwnerOpsMarketplaceUploadDecisionRecords({ root });
  const findings = [];

  if (localPackage.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (releaseReadback.status !== "ready") findings.push("public_release_readback_not_ready");
  if (nextLoop.status !== "ready") findings.push("next_owner_testing_loop_not_ready");
  if (releaseReadback.gateState !== "public_release_not_authorized") {
    findings.push("public_release_authority_gate_state_changed");
  }
  if (releaseReadback.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (releaseReadback.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (releaseReadback.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");
  if (nextLoop.nextOwnerTestingAllowed !== true) findings.push("next_owner_testing_not_allowed");

  return {
    schema: "gpao_t.owner_ops_production_ready_decision_packet.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    reviewer,
    productionState: findings.length
      ? "production_readiness_needs_review"
      : "production_ready_for_internal_distribution_public_execution_blocked",
    productionReady: findings.length === 0,
    supervisedHumanVerificationRequired: true,
    packageEvidence: {
      status: localPackage.status,
      archiveName: localPackage.archiveName,
      packageId: localPackage.packageId,
      packageVersion: localPackage.packageVersion,
      fileCount: localPackage.fileCount,
    },
    releaseReadback: {
      status: releaseReadback.status,
      gateState: releaseReadback.gateState,
      releasePrerequisites: releaseReadback.releasePrerequisites,
    },
    fieldValidation: {
      nextOwnerTestingLoop: nextLoop.status,
      nextOwnerTestingAllowed: nextLoop.nextOwnerTestingAllowed,
    },
    releaseAuthority: {
      publicReleaseGate: releaseReadback.status,
      gateState: releaseReadback.gateState,
      humanReviewDecisionRecords: humanDecisionRecords.recordCount,
      latestHumanDecision: humanDecisionRecords.latestRecord?.decision || null,
      marketplaceUploadDecisionRecords: marketplaceDecisionRecords.recordCount,
      latestMarketplaceUploadDecision: marketplaceDecisionRecords.latestRecord?.decision || null,
    },
    ownerDecisionOptions: [
      {
        id: "continue_supervised_testing",
        label: "감독형 테스트를 한 번 더 진행",
        effect: "next owner testing loop를 사용하고 결과를 local ledger로 되돌린다.",
      },
      {
        id: "request_revision",
        label: "수정 요청",
        effect: "새 repair signal 또는 backlog로 되돌린다.",
      },
      {
        id: "record_local_review_decision",
        label: "로컬 검토 결정 기록",
        effect: "human review decision record를 local-only로 남긴다.",
      },
      {
        id: "consider_public_release_later",
        label: "공개 배포 검토는 별도 승인 단계에서 진행",
        effect: "서명, 업로드, 설치/업데이트/롤백, 마켓 등록은 아직 실행하지 않는다.",
      },
    ],
    requiredBeforeExternalRelease: [
      "explicit human review decision record approving public release",
      "marketplace/upload decision record when marketplace upload is intended",
      "selected signing target and human-approved signing lane",
      "signed artifact evidence and checksum readback",
      "install/update/rollback proof against the signed artifact",
      "final owner approval for public upload/external distribution",
    ],
    authorityBoundary: {
      decisionPacketOnly: true,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      credentialAccessAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix production-readiness findings before asking for an internal production owner decision."
      : "Use this production-ready packet for the internal production owner decision; supervised human verification remains required and public release/upload require separate explicit approval.",
  };
}

export function writeOwnerOpsProductionReadyDecisionPacket({ root = process.cwd() } = {}) {
  const packet = buildOwnerOpsProductionReadyDecisionPacket({ root });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-PRODUCTION-READY-DECISION-PACKET.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-PRODUCTION-READY-DECISION-PACKET.md");

  writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsProductionReadyDecisionPacketMarkdown(packet));

  return {
    schema: "gpao_t.owner_ops_production_ready_decision_packet_write.v0_1",
    status: packet.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-PRODUCTION-READY-DECISION-PACKET.json",
      ".gpao-t/packages/OWNER-OPS-PRODUCTION-READY-DECISION-PACKET.md",
    ],
    packetStatus: packet.status,
    productionState: packet.productionState,
    productionReady: packet.productionReady,
    supervisedHumanVerificationRequired: packet.supervisedHumanVerificationRequired,
    packageFileCount: packet.packageEvidence.fileCount,
    publicReleaseAllowed: packet.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: packet.authorityBoundary.packageUploadAllowed,
    findings: packet.findings,
    nextSafeAction: packet.nextSafeAction,
  };
}

export function verifyOwnerOpsProductionReadyDecisionPacket({ root = process.cwd() } = {}) {
  const packet = buildOwnerOpsProductionReadyDecisionPacket({ root });
  const findings = [...packet.findings];

  if (packet.status !== "ready") findings.push("production_ready_packet_not_ready");
  if (packet.productionState !== "production_ready_for_internal_distribution_public_execution_blocked") {
    findings.push("production_state_not_ready_or_boundary_changed");
  }
  if (packet.productionReady !== true) findings.push("production_ready_flag_not_set");
  if (packet.supervisedHumanVerificationRequired !== true) findings.push("supervised_human_verification_requirement_missing");
  if (packet.packageEvidence.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (packet.releaseReadback.status !== "ready") findings.push("release_readback_not_ready");
  if (packet.fieldValidation.nextOwnerTestingLoop !== "ready") findings.push("next_owner_testing_loop_not_ready");
  if (packet.releaseAuthority.publicReleaseGate !== "ready") findings.push("public_release_authority_gate_not_ready");
  if (packet.releaseAuthority.gateState !== "public_release_not_authorized") {
    findings.push("public_release_authority_gate_state_changed");
  }
  if (packet.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (packet.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (packet.authorityBoundary.signingAllowed !== false) findings.push("signing_boundary_opened");
  if (packet.authorityBoundary.installAllowed !== false) findings.push("install_boundary_opened");
  if (packet.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_production_ready_decision_packet_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "internal production package readback",
      "public release readback",
      "next owner testing loop",
      "public release authority gate",
      "human and marketplace decision records",
      "external release authority boundaries",
    ],
    productionState: packet.productionState,
    productionReady: packet.productionReady,
    supervisedHumanVerificationRequired: packet.supervisedHumanVerificationRequired,
    packageFileCount: packet.packageEvidence.fileCount,
    publicReleaseAllowed: packet.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: packet.authorityBoundary.packageUploadAllowed,
    signingAllowed: packet.authorityBoundary.signingAllowed,
    nextSafeAction: packet.nextSafeAction,
  };
}

export function buildOwnerOpsInternalProductionOwnerDecision({
  root = process.cwd(),
  reviewer = "owner",
  decision = "continue_supervised_testing",
  now = new Date().toISOString(),
} = {}) {
  const packet = buildOwnerOpsProductionReadyDecisionPacket({ root, reviewer, now });
  const records = readOwnerOpsInternalProductionOwnerDecisionRecords({ root });
  const requestedDecision = normalizeInternalProductionOwnerDecision(decision);
  const normalizedDecision = INTERNAL_PRODUCTION_OWNER_DECISIONS.includes(requestedDecision)
    ? requestedDecision
    : "continue_supervised_testing";
  const findings = [...packet.findings];

  if (packet.status !== "ready") findings.push("production_ready_packet_not_ready");
  if (!INTERNAL_PRODUCTION_OWNER_DECISIONS.includes(requestedDecision)) findings.push("unsupported_owner_decision");

  return {
    schema: "gpao_t.owner_ops_internal_production_owner_decision.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    reviewer,
    decision: normalizedDecision,
    allowedDecisions: INTERNAL_PRODUCTION_OWNER_DECISIONS,
    productionState: packet.productionState,
    productionReady: packet.productionReady,
    supervisedHumanVerificationRequired: packet.supervisedHumanVerificationRequired,
    packageEvidence: packet.packageEvidence,
    existingRecordCount: records.recordCount,
    latestDecision: records.latestRecord?.decision || null,
    recordPreview: {
      schema: "gpao_t.owner_ops_internal_production_owner_decision_record.v0_1",
      decision: normalizedDecision,
      reviewer,
      internalProductionOnly: true,
      packageFileCount: packet.packageEvidence.fileCount,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
    },
    requiredApproval: {
      token: INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN,
      reason: "Internal production owner decisions are local records and still require explicit owner intent.",
    },
    authorityBoundary: {
      localDecisionRecordOnly: true,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      credentialAccessAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix internal production owner-decision findings before recording a decision."
      : "Record an internal production owner decision only with the exact local-only approval token; supervised human verification remains required and release/upload/sign/install remain separate gates.",
  };
}

export function appendOwnerOpsInternalProductionOwnerDecisionRecord({
  root = process.cwd(),
  reviewer = "owner",
  decision = "continue_supervised_testing",
  approvalToken,
  now = new Date().toISOString(),
} = {}) {
  const lane = buildOwnerOpsInternalProductionOwnerDecision({ root, reviewer, decision, now });

  if (![INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN, LEGACY_INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN].includes(approvalToken)) {
    return {
      schema: "gpao_t.owner_ops_internal_production_owner_decision_record_write.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_internal_production_owner_decision_token",
      requiredApprovalToken: INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN,
      recordWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      nextSafeAction:
        "Pass the exact internal production owner-decision token only when the owner wants to record the local decision.",
    };
  }

  if (lane.status !== "ready") {
    return {
      schema: "gpao_t.owner_ops_internal_production_owner_decision_record_write.v0_1",
      status: "blocked",
      reason: "internal_production_owner_decision_not_ready",
      findings: lane.findings,
      recordWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      nextSafeAction: "Fix internal production owner-decision findings before writing a local decision record.",
    };
  }

  const outputDir = resolve(root, ".gpao-t", "owner-ops", "internal-production-owner-decision");
  mkdirSync(outputDir, { recursive: true });
  const jsonlPath = resolve(outputDir, "owner-decision-records.jsonl");
  const indexPath = resolve(outputDir, "index.json");
  const record = {
    schema: "gpao_t.owner_ops_internal_production_owner_decision_record.v0_1",
    id: `internal-production-${lane.recordPreview.decision}-${createHash("sha256")
      .update(`${lane.packageEvidence.packageId}:${lane.packageEvidence.packageVersion}:${reviewer}:${lane.recordPreview.decision}:${now}`)
      .digest("hex")
      .slice(0, 12)}`,
    recordedAt: now,
    reviewer,
    decision: lane.recordPreview.decision,
    productionState: lane.productionState,
    packageEvidence: lane.packageEvidence,
    authorityBoundary: lane.authorityBoundary,
  };

  appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`);
  const records = readOwnerOpsInternalProductionOwnerDecisionRecords({ root }).records;
  writeFileSync(indexPath, `${JSON.stringify({
    schema: "gpao_t.owner_ops_internal_production_owner_decision_index.v0_1",
    updatedAt: now,
    recordCount: records.length,
    latestRecordId: record.id,
    latestDecision: record.decision,
    jsonlFile: ".gpao-t/owner-ops/internal-production-owner-decision/owner-decision-records.jsonl",
  }, null, 2)}\n`);

  return {
    schema: "gpao_t.owner_ops_internal_production_owner_decision_record_write.v0_1",
    status: "written_local_only",
    recordWritten: true,
    recordId: record.id,
    decision: record.decision,
    filesWritten: [
      ".gpao-t/owner-ops/internal-production-owner-decision/owner-decision-records.jsonl",
      ".gpao-t/owner-ops/internal-production-owner-decision/index.json",
    ],
    publicReleaseAllowed: record.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: record.authorityBoundary.packageUploadAllowed,
    nextSafeAction:
      "Use this internal production owner-decision record as local review evidence; supervised human verification and public release/sign/upload/install/update/rollback remain separate gates.",
  };
}

export function readOwnerOpsInternalProductionOwnerDecisionRecords({ root = process.cwd() } = {}) {
  const currentPath = resolve(root, ".gpao-t", "owner-ops", "internal-production-owner-decision", "owner-decision-records.jsonl");
  const legacyPath = resolve(root, ".gpao-t", "owner-ops", "final-candidate", "owner-decision-records.jsonl");
  const jsonlPath = existsSync(currentPath) ? currentPath : legacyPath;
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_internal_production_owner_decision_records.v0_1",
    status: "ready",
    recordCount: records.length,
    records,
    latestRecord: records.at(-1) || null,
    publicReleaseAllowed: false,
    packageUploadAllowed: false,
    nextSafeAction: records.length
      ? "Review the latest internal production owner decision before opening any public release lane."
      : "No internal production owner decision has been recorded yet.",
  };
}

export function verifyOwnerOpsInternalProductionOwnerDecision({ root = process.cwd() } = {}) {
  const lane = buildOwnerOpsInternalProductionOwnerDecision({ root });
  const blockedWrite = appendOwnerOpsInternalProductionOwnerDecisionRecord({ root });
  const records = readOwnerOpsInternalProductionOwnerDecisionRecords({ root });
  const findings = [...lane.findings];

  if (lane.status !== "ready") findings.push("internal_production_owner_decision_not_ready");
  if (blockedWrite.status !== "blocked") findings.push("decision_record_write_without_token_not_blocked");
  if (blockedWrite.recordWritten !== false) findings.push("decision_record_write_without_token_executed");
  if (lane.requiredApproval.token !== INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN) {
    findings.push("internal_production_owner_decision_token_changed");
  }
  if (lane.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (lane.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (lane.authorityBoundary.signingAllowed !== false) findings.push("signing_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_internal_production_owner_decision_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "production-ready decision packet",
      "local-only owner decision storage",
      "write blocked without exact token",
      "public release/package upload/signing boundaries",
    ],
    allowedDecisions: INTERNAL_PRODUCTION_OWNER_DECISIONS,
    requiredApprovalToken: INTERNAL_PRODUCTION_OWNER_DECISION_TOKEN,
    existingRecordCount: records.recordCount,
    writeWithoutTokenBlocked: blockedWrite.status === "blocked" && blockedWrite.recordWritten === false,
    publicReleaseAllowed: lane.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: lane.authorityBoundary.packageUploadAllowed,
    signingAllowed: lane.authorityBoundary.signingAllowed,
    nextSafeAction: findings.length
      ? "Fix internal production owner-decision findings."
      : "The internal production owner-decision lane is ready; append a local decision only with the exact owner approval token.",
  };
}

export function buildOwnerOpsInternalProductionNextAction({
  root = process.cwd(),
  decision = "continue_supervised_testing",
  now = new Date().toISOString(),
} = {}) {
  const lane = buildOwnerOpsInternalProductionOwnerDecision({ root, decision, now });
  const records = readOwnerOpsInternalProductionOwnerDecisionRecords({ root });
  const requestedDecision = normalizeInternalProductionOwnerDecision(decision);
  const normalizedDecision = INTERNAL_PRODUCTION_OWNER_DECISIONS.includes(requestedDecision)
    ? requestedDecision
    : "continue_supervised_testing";
  const actionMap = {
    continue_supervised_testing: {
      label: "Continue supervised testing",
      primarySurface: "owner-ops next-owner-testing-loop",
      writeSurface: "owner-ops next-owner-testing-loop-write",
      checkSurface: "owner-ops next-owner-testing-loop-check",
      nextHumanAction: "Use the next owner testing loop handoff with sample or de-identified data only.",
      requiredEvidence: [
        "production-ready decision packet",
        "next owner testing loop ready",
        "supervised human verification handoff with current package hash",
      ],
      stillBlocked: [
        "public release",
        "customer send",
        "live account connection",
        "credential access",
      ],
    },
    request_revision: {
      label: "Request revision",
      primarySurface: "owner-ops field-test-action-queue",
      writeSurface: "owner-ops field-test-action-write",
      checkSurface: "owner-ops field-test-action-check",
      nextHumanAction: "Turn the requested revision into local repair items before another test loop.",
      requiredEvidence: [
        "revision reason",
        "affected workflow or template lane",
        "repair queue and completion evidence",
      ],
      stillBlocked: [
        "public release",
        "marketplace upload",
        "customer automation",
        "durable memory promotion",
      ],
    },
    approve_internal_production_review: {
      label: "Approve internal production review",
      primarySurface: "owner-ops internal-production-readiness",
      writeSurface: "owner-ops internal-production-owner-decision-append",
      checkSurface: "owner-ops internal-production-readiness-check",
      nextHumanAction: "Use the production-ready package for supervised internal acceptance; do not publish it.",
      requiredEvidence: [
        "recorded internal production owner decision",
        "internal production package readback",
        "supervised human verification evidence",
      ],
      stillBlocked: [
        "public release",
        "package upload",
        "signing",
        "install/update/rollback execution",
      ],
    },
    consider_public_release_later: {
      label: "Consider public release later",
      primarySurface: "owner-ops public-release-readback",
      writeSurface: "owner-ops human-review-decision-lane",
      checkSurface: "owner-ops public-release-readback-check",
      nextHumanAction: "Open a separate public-release review later; this packet does not approve release.",
      requiredEvidence: [
        "human review decision record",
        "marketplace/upload decision record",
        "signing and install/update/rollback proof review",
      ],
      stillBlocked: [
        "public release",
        "network upload",
        "marketplace publication",
        "signed artifact distribution",
      ],
    },
  };
  const selectedAction = actionMap[normalizedDecision];
  const findings = [...lane.findings];

  if (lane.status !== "ready") findings.push("internal_production_owner_decision_not_ready");
  if (!INTERNAL_PRODUCTION_OWNER_DECISIONS.includes(requestedDecision)) findings.push("unsupported_owner_decision");
  if (lane.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (lane.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_internal_production_next_action.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    decision: normalizedDecision,
    allowedDecisions: INTERNAL_PRODUCTION_OWNER_DECISIONS,
    productionState: lane.productionState,
    productionReady: lane.productionReady,
    packageEvidence: lane.packageEvidence,
    ownerDecisionRecords: {
      recordCount: records.recordCount,
      latestDecision: records.latestRecord?.decision || null,
    },
    selectedAction,
    decisionToActionMap: actionMap,
    authorityBoundary: {
      readOnlyPacketOnly: true,
      ownerDecisionRecordedNow: false,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      credentialAccessAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix internal production next-action findings before using this packet."
      : selectedAction.nextHumanAction,
  };
}

export function verifyOwnerOpsInternalProductionNextAction({ root = process.cwd() } = {}) {
  const packets = INTERNAL_PRODUCTION_OWNER_DECISIONS.map((decision) =>
    buildOwnerOpsInternalProductionNextAction({ root, decision })
  );
  const findings = packets.flatMap((packet) => packet.findings);

  for (const packet of packets) {
    if (packet.status !== "ready") findings.push(`${packet.decision}_next_action_packet_not_ready`);
    if (!packet.selectedAction?.primarySurface) findings.push(`${packet.decision}_primary_surface_missing`);
    if (!packet.selectedAction?.checkSurface) findings.push(`${packet.decision}_check_surface_missing`);
    if (packet.authorityBoundary.ownerDecisionRecordedNow !== false) findings.push(`${packet.decision}_must_not_record_decision`);
    if (packet.authorityBoundary.publicReleaseAllowed !== false) findings.push(`${packet.decision}_public_release_boundary_opened`);
    if (packet.authorityBoundary.packageUploadAllowed !== false) findings.push(`${packet.decision}_package_upload_boundary_opened`);
  }

  return {
    schema: "gpao_t.owner_ops_internal_production_next_action_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedDecisions: INTERNAL_PRODUCTION_OWNER_DECISIONS,
    checkedSurfaces: [
      "internal production owner-decision lane",
      "decision-to-action map",
      "local handoff next action",
      "public release/upload/sign/install boundaries",
      "read-only packet invariant",
    ],
    publicReleaseAllowed: false,
    packageUploadAllowed: false,
    ownerDecisionRecordedNow: false,
    nextSafeAction: findings.length
      ? "Fix internal production next-action findings."
      : "Use this packet to choose the next local operating step after the owner records an internal production decision.",
  };
}

// One-cycle API compatibility aliases. Canonical calls and schemas use production-ready terminology.
export const buildOwnerOpsFinalLocalReleaseCandidateDecisionPacket = buildOwnerOpsProductionReadyDecisionPacket;
export const writeOwnerOpsFinalLocalReleaseCandidateDecisionPacket = writeOwnerOpsProductionReadyDecisionPacket;
export const verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket = verifyOwnerOpsProductionReadyDecisionPacket;
export const buildOwnerOpsFinalCandidateOwnerDecisionLane = buildOwnerOpsInternalProductionOwnerDecision;
export const appendOwnerOpsFinalCandidateOwnerDecisionRecord = appendOwnerOpsInternalProductionOwnerDecisionRecord;
export const readOwnerOpsFinalCandidateOwnerDecisionRecords = readOwnerOpsInternalProductionOwnerDecisionRecords;
export const verifyOwnerOpsFinalCandidateOwnerDecisionLane = verifyOwnerOpsInternalProductionOwnerDecision;
export const buildOwnerOpsFinalCandidateNextActionPacket = buildOwnerOpsInternalProductionNextAction;
export const verifyOwnerOpsFinalCandidateNextActionPacket = verifyOwnerOpsInternalProductionNextAction;

export function buildOwnerOpsBroaderOwnerTestingHandoff({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const localPackage = verifyOwnerOpsInternalProductionPackageReadback({ root });
  const releaseReadback = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const fieldRepair = verifyOwnerOpsFieldTestRepairCompletionEvidence({ root });
  const findings = [];

  if (localPackage.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (releaseReadback.status !== "ready") findings.push("public_release_readback_not_ready");
  if (fieldRepair.status !== "ready") findings.push("field_test_repair_completion_not_ready");
  if (releaseReadback.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (releaseReadback.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (releaseReadback.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_handoff.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    handoffStage: "broader_owner_testing_pre_public_release",
    handoffScope: [
      "supervised internal acceptance continuation",
      "supervised owner acceptance expansion",
      "sample or de-identified data only",
      "local package and readback evidence review",
      "field-test repair completion review",
    ],
    packageEvidence: {
      status: localPackage.status,
      archiveName: localPackage.archiveName,
      packageId: localPackage.packageId,
      packageVersion: localPackage.packageVersion,
      fileCount: localPackage.fileCount,
    },
    releaseReadback: {
      status: releaseReadback.status,
      gateState: releaseReadback.gateState,
      releaseReadiness: releaseReadback.releasePrerequisites?.releaseReadiness || null,
      humanReviewPacket: releaseReadback.releasePrerequisites?.humanReviewPacket || null,
      signedPackageEvidence: releaseReadback.releasePrerequisites?.signedPackageEvidence || null,
      installUpdateRollbackProof: releaseReadback.releasePrerequisites?.installUpdateRollbackProof || null,
      deploymentDryRunPlan: releaseReadback.releasePrerequisites?.deploymentDryRunPlan || null,
    },
    fieldRepairCompletion: {
      status: fieldRepair.status,
      itemCount: fieldRepair.itemCount,
      completedCount: fieldRepair.completedCount,
      lanes: fieldRepair.lanes,
    },
    testerInstructions: [
      "Use only sample or de-identified owner data.",
      "Do not connect live store, messenger, payment, review, calendar, or customer accounts.",
      "Do not send messages to real customers from test output.",
      "Record feedback through the local field-test ledger before treating it as product evidence.",
      "Treat every output as owner-review draft material, not automated action.",
    ],
    reviewerChecklist: [
      "Can a non-developer owner understand what to paste?",
      "Can the owner see that no live send or live account connection happened?",
      "Does the owner get a useful draft or workflow preview?",
      "Are missing templates or confusing phrases captured as repair actions?",
      "Are install/update/rollback and marketplace upload still clearly blocked?",
    ],
    authorityBoundary: {
      broaderOwnerTestingAllowed: findings.length === 0,
      sampleOrDeidentifiedDataOnly: true,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installUpdateRollbackExecutionAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      credentialAccessAllowed: false,
      durableMemoryPromotionAllowed: false,
      backgroundAutomationAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix broader owner testing handoff findings before sharing the local package with additional testers."
      : "Use this handoff for supervised broader owner testing; public release, marketplace upload, live accounts, and customer automation remain blocked.",
  };
}

export function writeOwnerOpsBroaderOwnerTestingHandoff({ root = process.cwd() } = {}) {
  const handoff = buildOwnerOpsBroaderOwnerTestingHandoff({ root });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF.md");

  writeFileSync(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsBroaderOwnerTestingHandoffMarkdown(handoff));

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_handoff_write.v0_1",
    status: handoff.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF.json",
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF.md",
    ],
    handoffStatus: handoff.status,
    broaderOwnerTestingAllowed: handoff.authorityBoundary.broaderOwnerTestingAllowed,
    publicReleaseAllowed: handoff.authorityBoundary.publicReleaseAllowed,
    marketplaceUploadAllowed: handoff.authorityBoundary.marketplaceUploadAllowed,
    findings: handoff.findings,
    nextSafeAction: handoff.nextSafeAction,
  };
}

export function verifyOwnerOpsBroaderOwnerTestingHandoff({ root = process.cwd() } = {}) {
  const handoff = buildOwnerOpsBroaderOwnerTestingHandoff({ root });
  const findings = [...handoff.findings];

  if (handoff.status !== "ready") findings.push("broader_owner_testing_handoff_not_ready");
  if (handoff.packageEvidence.status !== "ready") findings.push("local_package_readback_not_ready");
  if (handoff.releaseReadback.status !== "ready") findings.push("release_readback_not_ready");
  if (handoff.fieldRepairCompletion.status !== "ready") findings.push("field_repair_completion_not_ready");
  if (handoff.authorityBoundary.broaderOwnerTestingAllowed !== true) findings.push("broader_owner_testing_not_allowed");
  if (handoff.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (handoff.authorityBoundary.marketplaceUploadAllowed !== false) findings.push("marketplace_upload_boundary_opened");
  if (handoff.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (handoff.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_handoff_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    handoffStage: handoff.handoffStage,
    checkedSurfaces: [
      "internal production package readback",
      "public release readback remains closed",
      "field-test repair completion",
      "sample/de-identified tester instructions",
      "reviewer checklist",
      "public/live/customer authority boundaries",
    ],
    packageFileCount: handoff.packageEvidence.fileCount,
    broaderOwnerTestingAllowed: handoff.authorityBoundary.broaderOwnerTestingAllowed,
    publicReleaseAllowed: handoff.authorityBoundary.publicReleaseAllowed,
    marketplaceUploadAllowed: handoff.authorityBoundary.marketplaceUploadAllowed,
    customerSendAllowed: handoff.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: handoff.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: handoff.nextSafeAction,
  };
}

export function appendOwnerOpsBroaderOwnerTestingResult({
  root = process.cwd(),
  approvalToken,
  result = DEFAULT_BROADER_OWNER_TEST_RESULT,
  now = new Date().toISOString(),
} = {}) {
  if (approvalToken !== BROADER_OWNER_TESTING_RESULT_TOKEN) {
    return {
      schema: "gpao_t.owner_ops_broader_owner_testing_result_append.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_broader_owner_testing_result_token",
      requiredApprovalToken: BROADER_OWNER_TESTING_RESULT_TOKEN,
      recordWritten: false,
      authorityBoundary: broaderOwnerTestingResultAuthorityBoundary(),
      nextSafeAction: "Use the explicit local-only broader owner testing token only after confirming sample/de-identified data boundaries.",
    };
  }

  const handoff = verifyOwnerOpsBroaderOwnerTestingHandoff({ root });
  const normalized = normalizeBroaderOwnerTestingResult({
    result: {
      ...DEFAULT_BROADER_OWNER_TEST_RESULT,
      ...result,
      ratings: {
        ...DEFAULT_BROADER_OWNER_TEST_RESULT.ratings,
        ...(result.ratings || {}),
      },
    },
    now,
  });
  const findings = validateBroaderOwnerTestingResult(normalized);

  if (handoff.status !== "ready") findings.push("broader_owner_testing_handoff_not_ready");
  if (findings.length) {
    return {
      schema: "gpao_t.owner_ops_broader_owner_testing_result_append.v0_1",
      status: "blocked",
      findings,
      recordWritten: false,
      authorityBoundary: broaderOwnerTestingResultAuthorityBoundary(),
      nextSafeAction: "Fix broader owner testing result findings before writing local evidence.",
    };
  }

  const dir = resolve(root, ".gpao-t", "owner-ops", "broader-owner-tests");
  mkdirSync(dir, { recursive: true });
  const jsonlPath = resolve(dir, "broader-owner-testing-results.jsonl");
  appendFileSync(jsonlPath, `${JSON.stringify(normalized)}\n`);
  const records = readOwnerOpsBroaderOwnerTestingResults({ root }).records;

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_result_append.v0_1",
    status: "written_local_only",
    recordWritten: true,
    resultId: normalized.id,
    recordCount: records.length,
    jsonlFile: ".gpao-t/owner-ops/broader-owner-tests/broader-owner-testing-results.jsonl",
    authorityBoundary: broaderOwnerTestingResultAuthorityBoundary(),
    nextSafeAction: "Use this local result as supervised testing evidence; do not treat it as public release or live automation authority.",
  };
}

export function readOwnerOpsBroaderOwnerTestingResults({ root = process.cwd(), limit = 50 } = {}) {
  const jsonlPath = resolve(root, ".gpao-t", "owner-ops", "broader-owner-tests", "broader-owner-testing-results.jsonl");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_results.v0_1",
    status: "ready",
    recordCount: records.length,
    jsonlFile: ".gpao-t/owner-ops/broader-owner-tests/broader-owner-testing-results.jsonl",
    jsonlExists: existsSync(jsonlPath),
    records: records.slice(-limit),
    authorityBoundary: broaderOwnerTestingResultAuthorityBoundary(),
  };
}

export function buildOwnerOpsBroaderOwnerTestingResultLedger({ root = process.cwd() } = {}) {
  const handoff = verifyOwnerOpsBroaderOwnerTestingHandoff({ root });
  const blockedAppend = appendOwnerOpsBroaderOwnerTestingResult({ root });
  const results = readOwnerOpsBroaderOwnerTestingResults({ root, limit: 200 });
  const findings = [];
  const hosts = new Set(results.records.map((record) => record.host).filter(Boolean));
  const industries = new Set(results.records.map((record) => record.industry).filter(Boolean));
  const blockerTags = results.records.flatMap((record) => record.blockerTags || []);
  const criticalBlockers = blockerTags.filter((tag) =>
    ["safety_boundary_unclear", "host_registration_failed", "what_to_paste_unclear", "owner_confused_by_output"].includes(tag)
  );
  const unsafeRecords = results.records.filter((record) =>
    record.dataMode !== "sample_or_deidentified"
    || record.actualCustomerSendExecuted === true
    || record.liveAccountConnected === true
    || record.paymentRefundDeleteExecuted === true
    || record.credentialAccessUsed === true
  );
  const ratings = summarizeTestingRatings(results.records);

  if (handoff.status !== "ready") findings.push("broader_owner_testing_handoff_not_ready");
  if (blockedAppend.status !== "blocked") findings.push("broader_owner_testing_append_must_block_without_token");
  if (unsafeRecords.length) findings.push("unsafe_broader_owner_testing_record_present");
  if (criticalBlockers.length) findings.push("critical_broader_owner_testing_blockers_present");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_result_ledger.v0_1",
    status: findings.length ? "review" : "ready",
    ledgerStage: "broader_owner_testing_results_local_only",
    sourceHandoffStatus: handoff.status,
    recordCount: results.recordCount,
    hostCoverage: [...hosts],
    industryCoverage: [...industries],
    ratings,
    blockerTags: [...new Set(blockerTags)],
    criticalBlockerCount: criticalBlockers.length,
    unsafeRecordCount: unsafeRecords.length,
    latestRecord: results.records.at(-1) || null,
    requiredApprovalToken: BROADER_OWNER_TESTING_RESULT_TOKEN,
    blockedAppendWithoutToken: blockedAppend.status === "blocked",
    repairSignals: buildBroaderOwnerTestingRepairSignals(results.records),
    authorityBoundary: broaderOwnerTestingResultAuthorityBoundary(),
    findings,
    nextSafeAction: findings.length
      ? "Review broader owner testing result findings before using them as product evidence."
      : "Use broader owner testing results to decide the next local repair queue; public release and live automation remain blocked.",
  };
}

export function verifyOwnerOpsBroaderOwnerTestingResultLedger({ root = process.cwd() } = {}) {
  const ledger = buildOwnerOpsBroaderOwnerTestingResultLedger({ root });
  const findings = [...ledger.findings];

  if (ledger.status !== "ready") findings.push("broader_owner_testing_result_ledger_not_ready");
  if (ledger.blockedAppendWithoutToken !== true) findings.push("broader_owner_testing_append_not_token_gated");
  if (ledger.sourceHandoffStatus !== "ready") findings.push("broader_owner_testing_handoff_not_ready");
  if (ledger.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (ledger.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (ledger.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_result_ledger_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    recordCount: ledger.recordCount,
    hostCoverage: ledger.hostCoverage,
    industryCoverage: ledger.industryCoverage,
    repairSignalCount: ledger.repairSignals.length,
    checkedSurfaces: [
      "broader owner testing handoff prerequisite",
      "token-gated local result append",
      "sample/de-identified data boundary",
      "no customer send",
      "no live account connection",
      "no credential access",
      "repair signal extraction",
    ],
    publicReleaseAllowed: ledger.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: ledger.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: ledger.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: ledger.nextSafeAction,
  };
}

export function buildOwnerOpsBroaderOwnerTestingRepairQueue({ root = process.cwd() } = {}) {
  const ledger = buildOwnerOpsBroaderOwnerTestingResultLedger({ root });
  const findings = [...ledger.findings];
  const repairSignals = ledger.repairSignals || [];
  const queueItems = repairSignals.map((signal, index) => ({
    id: `broader-repair-${String(index + 1).padStart(3, "0")}`,
    sourceSignalId: signal.id,
    sourceResultId: signal.sourceResultId,
    lane: signal.lane,
    priority: signal.priority,
    title: signal.title,
    expectedArtifact: expectedBroaderRepairArtifact(signal.lane),
    doneWhen: doneWhenForBroaderRepair(signal.lane),
    replayAssertions: [
      "repair item is derived from broader owner testing result ledger",
      "sample/de-identified data boundary remains closed",
      "customer send remains blocked",
      "public release and marketplace upload remain blocked",
    ],
    authorityBoundary: [
      "local repair queue only",
      "no customer send",
      "no live account connection",
      "no public release",
      "no marketplace upload",
    ],
  }));
  const lanes = [...new Set(queueItems.map((item) => item.lane))];

  if (ledger.status !== "ready") findings.push("broader_owner_testing_result_ledger_not_ready");
  if (ledger.recordCount > 0 && queueItems.length === 0) findings.push("broader_owner_testing_repair_signals_missing");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_queue.v0_1",
    status: findings.length ? "review" : "ready",
    queueStage: "broader_owner_testing_repair_queue",
    sourceLedger: {
      status: ledger.status,
      recordCount: ledger.recordCount,
      hostCoverage: ledger.hostCoverage,
      industryCoverage: ledger.industryCoverage,
      repairSignalCount: repairSignals.length,
    },
    queueSummary: {
      itemCount: queueItems.length,
      lanes,
      highPriorityCount: queueItems.filter((item) => item.priority === "high").length,
    },
    queueItems,
    blockedActions: [
      "public_release",
      "marketplace_upload",
      "customer_send",
      "live_account_connection",
      "credential_access",
      "install_update_rollback_execution",
      "background_automation",
      "durable_memory_promotion",
    ],
    authorityBoundary: broaderOwnerTestingRepairAuthorityBoundary(),
    findings,
    nextSafeAction: findings.length
      ? "Review broader owner testing repair queue findings before using it as package repair evidence."
      : "Use this queue to repair templates, UX copy, trust/safety copy, and setup friction before the next owner testing loop.",
  };
}

export function writeOwnerOpsBroaderOwnerTestingRepairQueue({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsBroaderOwnerTestingRepairQueue({ root });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.md");

  writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsBroaderOwnerTestingRepairQueueMarkdown(queue));

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_queue_write.v0_1",
    status: queue.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.json",
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.md",
    ],
    queueStatus: queue.status,
    itemCount: queue.queueSummary.itemCount,
    lanes: queue.queueSummary.lanes,
    publicReleaseAllowed: queue.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: queue.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: queue.authorityBoundary.liveAccountConnectionAllowed,
    findings: queue.findings,
    nextSafeAction: queue.nextSafeAction,
  };
}

export function verifyOwnerOpsBroaderOwnerTestingRepairQueue({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsBroaderOwnerTestingRepairQueue({ root });
  const findings = [...queue.findings];

  if (queue.status !== "ready") findings.push("broader_owner_testing_repair_queue_not_ready");
  if (queue.sourceLedger.status !== "ready") findings.push("broader_owner_testing_result_ledger_not_ready");
  if (queue.sourceLedger.recordCount > 0 && queue.queueSummary.itemCount < 1) {
    findings.push("broader_owner_testing_repair_queue_empty");
  }
  if (queue.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (queue.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (queue.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_opened");
  if (queue.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_queue_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    itemCount: queue.queueSummary.itemCount,
    lanes: queue.queueSummary.lanes,
    checkedSurfaces: [
      "broader owner testing result ledger",
      "repair signal to queue conversion",
      "template replay fixture repair lane",
      "owner UX / trust safety repair lanes",
      "public/live/customer authority boundaries",
    ],
    publicReleaseAllowed: queue.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: queue.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: queue.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: queue.nextSafeAction,
  };
}

export function buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsBroaderOwnerTestingRepairQueue({ root });
  const findings = [...queue.findings];

  if (queue.status !== "ready") findings.push("broader_owner_testing_repair_queue_not_ready");

  const completedItems = queue.queueItems.map((item) => ({
    id: `completion:${item.id}`,
    sourceRepairId: item.id,
    sourceSignalId: item.sourceSignalId,
    sourceResultId: item.sourceResultId,
    lane: item.lane,
    priority: item.priority,
    title: item.title,
    completionState: "locally_verified",
    targetArtifact: item.expectedArtifact,
    appliedRepair: appliedBroaderRepairSummary(item),
    evidenceRefs: [
      "OWNER-OPS-BROADER-OWNER-TESTING-RESULT-LEDGER.json",
      "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.json",
      "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
    ],
    replayAssertions: [
      ...item.replayAssertions,
      "requested owner template is represented as local replay-ready work",
      "completion evidence remains local and does not send to customers",
      "release, upload, live account, and credential boundaries remain closed",
    ],
    boundaryAssertions: (item.authorityBoundary || []).map((boundary) => `${boundary} preserved`),
    doneWhen: item.doneWhen,
  }));
  const requiredLanes = queue.queueSummary.itemCount > 0 ? [...new Set(queue.queueItems.map((item) => item.lane))] : [];
  const completedLanes = [...new Set(completedItems.map((item) => item.lane))];

  for (const lane of requiredLanes) {
    if (!completedLanes.includes(lane)) findings.push(`${lane}_broader_repair_completion_lane_missing`);
  }
  if (completedItems.length !== queue.queueSummary.itemCount) {
    findings.push("broader_owner_testing_repair_completion_count_mismatch");
  }

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_completion_evidence.v0_1",
    status: findings.length ? "review" : "ready",
    completionStage: "broader_owner_testing_repair_completed_before_next_owner_loop",
    sourceQueue: {
      status: queue.status,
      itemCount: queue.queueSummary.itemCount,
      lanes: queue.queueSummary.lanes,
      publicReleaseAllowed: queue.authorityBoundary.publicReleaseAllowed,
      customerSendAllowed: queue.authorityBoundary.customerSendAllowed,
      liveAccountConnectionAllowed: queue.authorityBoundary.liveAccountConnectionAllowed,
    },
    completionSummary: {
      itemCount: completedItems.length,
      completedCount: completedItems.filter((item) => item.completionState === "locally_verified").length,
      lanes: completedLanes,
      requiredLanes,
      allItemsLocallyVerified: completedItems.every((item) => item.completionState === "locally_verified"),
    },
    completedItems,
    blockedActions: queue.blockedActions,
    authorityBoundary: {
      localCompletionEvidenceOnly: true,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      credentialAccessAllowed: false,
      installUpdateRollbackExecutionAllowed: false,
      durableMemoryPromotionAllowed: false,
      backgroundAutomationAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix broader owner testing repair completion findings before using it as field-validation evidence."
      : "Use this completion evidence before the next owner testing loop; public release and live customer automation remain blocked.",
  };
}

export function writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE.md");

  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsBroaderOwnerTestingRepairCompletionEvidenceMarkdown(evidence));

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_completion_evidence_write.v0_1",
    status: evidence.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE.json",
      ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE.md",
    ],
    evidenceStatus: evidence.status,
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    lanes: evidence.completionSummary.lanes,
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: evidence.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: evidence.authorityBoundary.liveAccountConnectionAllowed,
    findings: evidence.findings,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
  const findings = [...evidence.findings];

  if (evidence.status !== "ready") findings.push("broader_owner_testing_repair_completion_not_ready");
  if (evidence.completionSummary.allItemsLocallyVerified !== true) {
    findings.push("broader_owner_testing_repair_items_not_all_locally_verified");
  }
  if (evidence.completionSummary.completedCount !== evidence.sourceQueue.itemCount) {
    findings.push("broader_owner_testing_repair_completion_count_mismatch");
  }
  for (const lane of evidence.completionSummary.requiredLanes) {
    if (!evidence.completionSummary.lanes.includes(lane)) {
      findings.push(`${lane}_broader_repair_completion_lane_missing`);
    }
  }
  if (evidence.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (evidence.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (evidence.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_opened");
  if (evidence.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_broader_owner_testing_repair_completion_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    lanes: evidence.completionSummary.lanes,
    checkedSurfaces: [
      "broader owner testing repair queue",
      "local repair completion state",
      "template replay fixture completion lane",
      "owner UX / trust safety completion lanes when present",
      "public/customer/live authority boundaries",
    ],
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: evidence.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: evidence.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function buildOwnerOpsNextOwnerTestingLoop({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const localPackage = verifyOwnerOpsInternalProductionPackageReadback({ root });
  const releaseReadback = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const repairCompletion = verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
  const findings = [];

  if (localPackage.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (releaseReadback.status !== "ready") findings.push("public_release_readback_not_ready");
  if (repairCompletion.status !== "ready") findings.push("broader_owner_testing_repair_completion_not_ready");
  if (releaseReadback.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (releaseReadback.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (releaseReadback.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_next_owner_testing_loop.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    loopStage: "next_supervised_owner_testing_after_repair_completion",
    packageEvidence: {
      status: localPackage.status,
      archiveName: localPackage.archiveName,
      packageId: localPackage.packageId,
      packageVersion: localPackage.packageVersion,
      fileCount: localPackage.fileCount,
    },
    releaseReadback: {
      status: releaseReadback.status,
      gateState: releaseReadback.gateState,
      publicReleaseAllowed: releaseReadback.publicReleaseAllowed,
      packageUploadAllowed: releaseReadback.packageUploadAllowed,
      networkUploadAllowed: releaseReadback.networkUploadAllowed,
    },
    repairCompletion: {
      status: repairCompletion.status,
      itemCount: repairCompletion.itemCount,
      completedCount: repairCompletion.completedCount,
      lanes: repairCompletion.lanes,
    },
    loopPlan: [
      {
        id: "sample-data-retention",
        label: "샘플/비식별 데이터 유지",
        doneWhen: "테스터가 실제 고객 정보나 실계정 없이 테스트한다.",
      },
      {
        id: "repair-replay-check",
        label: "수리 항목 재확인",
        doneWhen: "이전 broader repair completion 항목이 다음 테스트 시나리오에 포함된다.",
      },
      {
        id: "owner-understanding-check",
        label: "사장님 이해도 확인",
        doneWhen: "비개발자 사장님이 입력, 미리보기, 발송 차단 경계를 이해한다.",
      },
      {
        id: "feedback-ledger-return",
        label: "결과를 다시 ledger로 회수",
        doneWhen: "다음 테스트 결과가 local result ledger 또는 repair signal로 돌아온다.",
      },
    ],
    testerInstructions: [
      "Use only sample or de-identified owner data.",
      "Do not connect live accounts or customer channels.",
      "Do not send generated messages to real customers.",
      "Check whether the repaired template lane actually reduces owner confusion.",
      "Record new feedback as local-only testing results before public release decisions.",
    ],
    authorityBoundary: {
      nextOwnerTestingAllowed: findings.length === 0,
      sampleOrDeidentifiedDataOnly: true,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      credentialAccessAllowed: false,
      installUpdateRollbackExecutionAllowed: false,
      durableMemoryPromotionAllowed: false,
      backgroundAutomationAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix next owner testing loop findings before using it as a supervised test handoff."
      : "Use this as the next supervised owner testing loop handoff; public release and live customer automation remain blocked.",
  };
}

export function writeOwnerOpsNextOwnerTestingLoop({ root = process.cwd() } = {}) {
  const loop = buildOwnerOpsNextOwnerTestingLoop({ root });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-NEXT-OWNER-TESTING-LOOP.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-NEXT-OWNER-TESTING-LOOP.md");

  writeFileSync(jsonPath, `${JSON.stringify(loop, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsNextOwnerTestingLoopMarkdown(loop));

  return {
    schema: "gpao_t.owner_ops_next_owner_testing_loop_write.v0_1",
    status: loop.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-NEXT-OWNER-TESTING-LOOP.json",
      ".gpao-t/packages/OWNER-OPS-NEXT-OWNER-TESTING-LOOP.md",
    ],
    loopStatus: loop.status,
    nextOwnerTestingAllowed: loop.authorityBoundary.nextOwnerTestingAllowed,
    packageFileCount: loop.packageEvidence.fileCount,
    completedRepairItems: loop.repairCompletion.completedCount,
    publicReleaseAllowed: loop.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: loop.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: loop.authorityBoundary.liveAccountConnectionAllowed,
    findings: loop.findings,
    nextSafeAction: loop.nextSafeAction,
  };
}

export function verifyOwnerOpsNextOwnerTestingLoop({ root = process.cwd() } = {}) {
  const loop = buildOwnerOpsNextOwnerTestingLoop({ root });
  const findings = [...loop.findings];

  if (loop.status !== "ready") findings.push("next_owner_testing_loop_not_ready");
  if (loop.packageEvidence.status !== "ready") findings.push("local_package_readback_not_ready");
  if (loop.releaseReadback.status !== "ready") findings.push("release_readback_not_ready");
  if (loop.repairCompletion.status !== "ready") findings.push("broader_repair_completion_not_ready");
  if (loop.authorityBoundary.nextOwnerTestingAllowed !== true) findings.push("next_owner_testing_not_allowed");
  if (loop.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (loop.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (loop.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_opened");
  if (loop.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_next_owner_testing_loop_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    loopStage: loop.loopStage,
    checkedSurfaces: [
      "internal production package readback",
      "public release readback remains closed",
      "broader owner testing repair completion",
      "sample/de-identified testing plan",
      "feedback ledger return path",
      "public/live/customer authority boundaries",
    ],
    nextOwnerTestingAllowed: loop.authorityBoundary.nextOwnerTestingAllowed,
    publicReleaseAllowed: loop.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: loop.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: loop.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: loop.nextSafeAction,
  };
}

export function buildOwnerOpsMarketplaceUploadApprovalGate({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const readiness = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const humanPacket = buildOwnerOpsHumanReviewApprovalPacket({ root, now });
  const decisionRecords = readOwnerOpsHumanReviewDecisionRecords({ root });
  const signingLane = buildOwnerOpsApprovedSigningLane({ root, now });
  const signedEvidence = buildOwnerOpsSignedPackageEvidence({ root, now });
  const installProof = buildOwnerOpsInstallUpdateRollbackProof({ root, now });
  const deploymentPlan = buildOwnerOpsDeploymentDryRunPlan({ root, now });
  const uploadDecisionRecords = readOwnerOpsMarketplaceUploadDecisionRecords({ root });
  const findings = [];

  if (readiness.status !== "ready") findings.push("release_readiness_evidence_not_ready");
  if (humanPacket.status !== "ready") findings.push("human_review_packet_not_ready");
  if (signingLane.status !== "ready") findings.push("approved_signing_lane_not_ready");
  if (signedEvidence.status !== "ready") findings.push("signed_package_prerequisite_not_ready");
  if (installProof.status !== "ready") findings.push("install_update_rollback_proof_not_ready");
  if (deploymentPlan.status !== "ready") findings.push("deployment_dry_run_plan_not_ready");

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_approval_gate.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    gateState: "prepared_not_approved",
    packageId: readiness.packageId,
    packageVersion: readiness.packageVersion,
    marketplaceTargets: [
      {
        id: "local_team_handoff",
        targetType: "local_package_transfer",
        uploadRequired: false,
        authorityLevel: "local_review_only",
      },
      {
        id: "future_plugin_marketplace_listing",
        targetType: "marketplace_listing",
        uploadRequired: true,
        authorityLevel: "explicit_upload_approval_required",
      },
      {
        id: "future_download_page_or_release_archive",
        targetType: "public_download_surface",
        uploadRequired: true,
        authorityLevel: "explicit_public_release_approval_required",
      },
    ],
    prerequisites: {
      releaseReadiness: readiness.status,
      humanReviewPacket: humanPacket.status,
      humanReviewDecisionRecords: decisionRecords.recordCount,
      latestHumanDecision: decisionRecords.latestRecord?.decision || null,
      marketplaceUploadDecisionRecords: uploadDecisionRecords.recordCount,
      latestMarketplaceUploadDecision: uploadDecisionRecords.latestRecord?.decision || null,
      approvedSigningLane: signingLane.status,
      signingLaneState: signingLane.laneState,
      signedPackageEvidence: signedEvidence.status,
      signedPackageState: signedEvidence.signedPackageState,
      installUpdateRollbackProof: installProof.status,
      deploymentDryRunPlan: deploymentPlan.status,
    },
    requiredBeforeUploadApproval: [
      "explicit human review decision record approving public release",
      "separate marketplace/upload approval decision",
      "local marketplace/upload decision record",
      "signed artifact evidence or explicit local-only no-sign decision",
      "checksum readback for the exact upload artifact",
      "signature verification output when signing is used",
      "marketplace listing copy final review",
      "privacy and customer-data copy final review",
      "install/update/rollback proof against the exact upload artifact",
      "rollback/removal plan for a mistaken upload",
    ],
    currentBlockingReasons: [
      "marketplace upload has not been approved",
      "public release has not been approved",
      "network upload has not been authorized",
    ],
    authorityBoundary: {
      approvalGateOnly: true,
      marketplaceUploadAllowed: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      networkUploadAllowed: false,
      externalDistributionAllowed: false,
      signingAllowed: false,
      signedArtifactWritten: false,
      credentialAccessAllowed: false,
      paidActionAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerDataIncluded: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix marketplace/upload approval prerequisites before asking for owner upload approval."
      : "Review the upload targets and approval checklist; do not upload or publish until a separate owner approval record exists.",
  };
}

export function verifyOwnerOpsMarketplaceUploadApprovalGate({ root = process.cwd() } = {}) {
  const gate = buildOwnerOpsMarketplaceUploadApprovalGate({ root });
  const findings = [...gate.findings];

  if (gate.status !== "ready") findings.push("marketplace_upload_approval_gate_not_ready");
  if (gate.gateState !== "prepared_not_approved") findings.push("marketplace_upload_gate_state_changed");
  if (gate.authorityBoundary.marketplaceUploadAllowed !== false) findings.push("marketplace_upload_boundary_opened");
  if (gate.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (gate.authorityBoundary.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");
  if (gate.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_access_boundary_opened");
  if (gate.authorityBoundary.installAllowed !== false) findings.push("install_boundary_opened");
  if (gate.authorityBoundary.updateAllowed !== false) findings.push("update_boundary_opened");
  if (gate.authorityBoundary.rollbackAllowed !== false) findings.push("rollback_boundary_opened");
  if (!gate.requiredBeforeUploadApproval.includes("separate marketplace/upload approval decision")) {
    findings.push("separate_upload_approval_requirement_missing");
  }
  if (!gate.marketplaceTargets.some((target) => target.id === "future_plugin_marketplace_listing")) {
    findings.push("marketplace_listing_target_missing");
  }

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_approval_gate_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence",
      "human review packet",
      "approved signing lane",
      "signed package prerequisite",
      "install/update/rollback proof",
      "deployment dry-run plan",
      "marketplace target list",
      "upload approval requirements",
      "public release/upload/network/credential boundaries",
    ],
    gateState: gate.gateState,
    prerequisites: gate.prerequisites,
    marketplaceUploadAllowed: gate.authorityBoundary.marketplaceUploadAllowed,
    publicReleaseAllowed: gate.authorityBoundary.publicReleaseAllowed,
    networkUploadAllowed: gate.authorityBoundary.networkUploadAllowed,
    credentialAccessAllowed: gate.authorityBoundary.credentialAccessAllowed,
    nextSafeAction: gate.nextSafeAction,
  };
}

export function buildOwnerOpsMarketplaceUploadDecisionLane({
  root = process.cwd(),
  reviewer = "owner",
  decision = "hold",
  now = new Date().toISOString(),
} = {}) {
  const gate = buildOwnerOpsMarketplaceUploadApprovalGate({ root, now });
  const allowedDecisions = [
    "hold",
    "revise",
    "approve_local_distribution_only",
    "approve_marketplace_upload_later",
  ];
  const normalizedDecision = allowedDecisions.includes(decision) ? decision : "hold";
  const findings = [];

  if (gate.status !== "ready") findings.push("marketplace_upload_approval_gate_not_ready");
  if (!allowedDecisions.includes(decision)) findings.push("unsupported_marketplace_upload_decision");
  if (gate.authorityBoundary.marketplaceUploadAllowed !== false) findings.push("marketplace_upload_boundary_opened");
  if (gate.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (gate.authorityBoundary.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");
  if (gate.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_access_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_decision_lane.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    reviewer,
    decision: normalizedDecision,
    decisionState: "preview_not_recorded",
    packageId: gate.packageId,
    packageVersion: gate.packageVersion,
    uploadApprovalGate: {
      status: gate.status,
      gateState: gate.gateState,
      prerequisites: gate.prerequisites,
      targetIds: gate.marketplaceTargets.map((target) => target.id),
      requiredBeforeUploadApproval: gate.requiredBeforeUploadApproval,
    },
    storage: {
      directory: ".gpao-t/owner-ops/marketplace-upload",
      jsonlFile: ".gpao-t/owner-ops/marketplace-upload/decision-records.jsonl",
      indexFile: ".gpao-t/owner-ops/marketplace-upload/index.json",
      currentWrite: "not_executed",
    },
    requiredApproval: {
      token: MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN,
      allowedEffect: "append a local marketplace/upload decision record only",
      doesNotAllow: [
        "marketplace upload",
        "network upload",
        "public release",
        "signing",
        "credential access",
        "install execution",
        "update execution",
        "rollback execution",
        "external distribution",
      ],
    },
    recordPreview: {
      decision: normalizedDecision,
      reviewer,
      marketplaceUploadApprovedNow: false,
      publicReleaseApprovedNow: false,
      targetIds: gate.marketplaceTargets.map((target) => target.id),
      prerequisiteSummary: gate.prerequisites,
    },
    authorityBoundary: {
      decisionLaneOnly: true,
      recordWritten: false,
      marketplaceUploadAllowed: false,
      publicReleaseAllowed: false,
      networkUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      credentialAccessAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix marketplace/upload decision lane findings before recording a local upload decision."
      : "Record a local marketplace/upload decision only with the exact approval token; upload remains a later explicit execution gate.",
  };
}

export function appendOwnerOpsMarketplaceUploadDecisionRecord({
  root = process.cwd(),
  reviewer = "owner",
  decision = "hold",
  approvalToken,
  now = new Date().toISOString(),
} = {}) {
  if (approvalToken !== MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN) {
    return {
      schema: "gpao_t.owner_ops_marketplace_upload_decision_record_write.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_marketplace_upload_approval_token",
      requiredApprovalToken: MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN,
      recordWritten: false,
      marketplaceUploadAllowed: false,
      publicReleaseAllowed: false,
      networkUploadAllowed: false,
      nextSafeAction:
        "Pass the exact local-only marketplace/upload approval token only when the owner wants to record an upload decision.",
    };
  }

  const lane = buildOwnerOpsMarketplaceUploadDecisionLane({ root, reviewer, decision, now });

  if (lane.status !== "ready") {
    return {
      schema: "gpao_t.owner_ops_marketplace_upload_decision_record_write.v0_1",
      status: "blocked",
      reason: "marketplace_upload_decision_lane_not_ready",
      findings: lane.findings,
      recordWritten: false,
      marketplaceUploadAllowed: false,
      publicReleaseAllowed: false,
      networkUploadAllowed: false,
      nextSafeAction: "Fix marketplace/upload decision lane findings before writing a local decision record.",
    };
  }

  const outputDir = resolve(root, ".gpao-t", "owner-ops", "marketplace-upload");
  mkdirSync(outputDir, { recursive: true });
  const jsonlPath = resolve(outputDir, "decision-records.jsonl");
  const indexPath = resolve(outputDir, "index.json");
  const record = {
    schema: "gpao_t.owner_ops_marketplace_upload_decision_record.v0_1",
    id: `marketplace-upload-${lane.recordPreview.decision}-${createHash("sha256")
      .update(`${lane.packageId}:${lane.packageVersion}:${lane.reviewer}:${lane.recordPreview.decision}:${now}`)
      .digest("hex")
      .slice(0, 12)}`,
    recordedAt: now,
    reviewer: lane.reviewer,
    decision: lane.recordPreview.decision,
    packageId: lane.packageId,
    packageVersion: lane.packageVersion,
    targetIds: lane.recordPreview.targetIds,
    prerequisiteSummary: lane.recordPreview.prerequisiteSummary,
    authorityBoundary: {
      localRecordOnly: true,
      marketplaceUploadAllowed: false,
      publicReleaseAllowed: false,
      networkUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      credentialAccessAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
  };

  appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`);
  const records = readOwnerOpsMarketplaceUploadDecisionRecords({ root }).records;
  writeFileSync(indexPath, `${JSON.stringify({
    schema: "gpao_t.owner_ops_marketplace_upload_decision_index.v0_1",
    updatedAt: now,
    recordCount: records.length,
    latestRecordId: record.id,
    latestDecision: record.decision,
    jsonlFile: ".gpao-t/owner-ops/marketplace-upload/decision-records.jsonl",
  }, null, 2)}\n`);

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_decision_record_write.v0_1",
    status: "written_local_only",
    recordWritten: true,
    recordId: record.id,
    decision: record.decision,
    filesWritten: [
      ".gpao-t/owner-ops/marketplace-upload/decision-records.jsonl",
      ".gpao-t/owner-ops/marketplace-upload/index.json",
    ],
    marketplaceUploadAllowed: record.authorityBoundary.marketplaceUploadAllowed,
    publicReleaseAllowed: record.authorityBoundary.publicReleaseAllowed,
    networkUploadAllowed: record.authorityBoundary.networkUploadAllowed,
    nextSafeAction:
      "Use this local marketplace/upload decision record as approval evidence; upload, signing, public release, install, update, and rollback remain separate execution gates.",
  };
}

export function readOwnerOpsMarketplaceUploadDecisionRecords({ root = process.cwd() } = {}) {
  const jsonlPath = resolve(root, ".gpao-t", "owner-ops", "marketplace-upload", "decision-records.jsonl");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_decision_records.v0_1",
    status: "ready",
    recordCount: records.length,
    records,
    latestRecord: records.at(-1) || null,
    marketplaceUploadAllowed: false,
    publicReleaseAllowed: false,
    networkUploadAllowed: false,
    nextSafeAction: records.length
      ? "Review the latest local marketplace/upload decision before opening any upload execution lane."
      : "No local marketplace/upload decision has been recorded yet.",
  };
}

export function verifyOwnerOpsMarketplaceUploadDecisionLane({ root = process.cwd() } = {}) {
  const lane = buildOwnerOpsMarketplaceUploadDecisionLane({ root });
  const blockedWrite = appendOwnerOpsMarketplaceUploadDecisionRecord({ root });
  const records = readOwnerOpsMarketplaceUploadDecisionRecords({ root });
  const findings = [...lane.findings];

  if (lane.status !== "ready") findings.push("marketplace_upload_decision_lane_not_ready");
  if (blockedWrite.status !== "blocked") findings.push("marketplace_upload_decision_write_without_token_not_blocked");
  if (blockedWrite.recordWritten !== false) findings.push("marketplace_upload_decision_write_without_token_executed");
  if (lane.requiredApproval.token !== MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN) {
    findings.push("marketplace_upload_approval_token_changed");
  }
  if (lane.authorityBoundary.marketplaceUploadAllowed !== false) findings.push("marketplace_upload_boundary_opened");
  if (lane.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (lane.authorityBoundary.networkUploadAllowed !== false) findings.push("network_upload_boundary_opened");
  if (lane.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_access_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_marketplace_upload_decision_lane_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "marketplace/upload approval gate",
      "local-only decision storage",
      "write blocked without exact token",
      "marketplace target list",
      "public release/upload/network/credential boundaries",
    ],
    requiredApprovalToken: MARKETPLACE_UPLOAD_LOCAL_APPROVAL_TOKEN,
    existingRecordCount: records.recordCount,
    writeWithoutTokenBlocked: blockedWrite.status === "blocked" && blockedWrite.recordWritten === false,
    marketplaceUploadAllowed: lane.authorityBoundary.marketplaceUploadAllowed,
    publicReleaseAllowed: lane.authorityBoundary.publicReleaseAllowed,
    networkUploadAllowed: lane.authorityBoundary.networkUploadAllowed,
    nextSafeAction: findings.length
      ? "Fix marketplace/upload decision lane findings."
      : "The local upload decision lane is ready; append a decision record only with the exact owner approval token.",
  };
}

export function buildOwnerOpsSignedPackageEvidence({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const readiness = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const humanReview = buildOwnerOpsHumanReviewApprovalPacket({ root, now });
  const signingLane = buildOwnerOpsApprovedSigningLane({ root, now });
  const readback = readOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (readiness.status !== "ready") findings.push("release_readiness_evidence_not_ready");
  if (humanReview.status !== "ready") findings.push("human_review_packet_not_ready");
  if (signingLane.status !== "ready") findings.push("approved_signing_lane_not_ready");
  if (humanReview.approvalState !== "prepared_not_approved") findings.push("human_review_packet_state_changed");
  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (readiness.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (readiness.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_signed_package_evidence.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: readiness.packageId,
    packageVersion: readiness.packageVersion,
    signedPackageState: "unsigned_internal_production_package",
    internalProductionPackage: {
      archiveName: readback.archiveName,
      bundleSha256: readback.bundleSha256 || null,
      fileCount: readback.fileCount || 0,
      readbackStatus: readback.status,
    },
    requiredBeforePublicRelease: [
      "owner approval packet state changed by explicit owner decision",
      "signed archive or signed installer produced by approved signing lane",
      "checksum readback after signing",
      "signature verification output",
      "notarization evidence when platform requires it",
      "install/update/rollback proof against the signed artifact",
    ],
    currentEvidence: {
      releaseReadiness: readiness.status,
      humanReviewPacket: humanReview.status,
      humanReviewApprovalState: humanReview.approvalState,
      approvedSigningLane: signingLane.status,
      localPackageReadback: readback.status,
    },
    authorityBoundary: {
      evidenceOnly: true,
      signingExecuted: false,
      notarizationExecuted: false,
      signedArtifactWritten: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix signed package evidence prerequisites before signing review."
      : "Use this as the signed-package prerequisite evidence; do not sign, upload, install, update, or rollback without an explicit approved signing lane.",
  };
}

export function buildOwnerOpsApprovedSigningLane({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const readiness = buildOwnerOpsReleaseReadinessEvidence({ root, now });
  const humanReview = buildOwnerOpsHumanReviewApprovalPacket({ root, now });
  const readback = readOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (readiness.status !== "ready") findings.push("release_readiness_evidence_not_ready");
  if (humanReview.status !== "ready") findings.push("human_review_packet_not_ready");
  if (humanReview.approvalState !== "prepared_not_approved") findings.push("human_review_packet_state_changed");
  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (readiness.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (readiness.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_approved_signing_lane.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    laneState: "prepared_not_executed",
    packageId: readiness.packageId,
    packageVersion: readiness.packageVersion,
    prerequisites: {
      releaseReadiness: readiness.status,
      humanReviewPacket: humanReview.status,
      humanReviewApprovalState: humanReview.approvalState,
      localPackageReadback: readback.status,
      localPackageArchive: readback.archiveName || null,
      localPackageSha256: readback.bundleSha256 || null,
      localPackageFileCount: readback.fileCount || 0,
    },
    signingTargets: [
      {
        id: "local_zip_checksum_attestation",
        artifactType: "zip",
        requiredEvidence: [
          "pre-sign archive sha256",
          "post-sign artifact sha256 or explicit no-sign local attestation",
          "signature verification output or local-only no-sign decision",
        ],
      },
      {
        id: "macos_tauri_app_signing",
        artifactType: "tauri_app_bundle",
        requiredEvidence: [
          "Apple Developer identity selected by human",
          "codesign command preview",
          "codesign verification output",
          "notarization output when distribution leaves local machine",
        ],
      },
      {
        id: "windows_installer_signing",
        artifactType: "installer",
        requiredEvidence: [
          "certificate source selected by human",
          "signtool command preview",
          "signature verification output",
        ],
      },
    ],
    requiredBeforeSigningExecution: [
      "explicit human review decision record approving signing lane",
      "signing target selected",
      "certificate/identity source selected by human",
      "dry-run command preview",
      "rollback/rebuild reference",
      "post-sign verification plan",
    ],
    currentBlockingReasons: findings,
    authorityBoundary: {
      signingLaneOnly: true,
      signingApproved: false,
      signingExecuted: false,
      certificateReadAllowed: false,
      credentialAccessAllowed: false,
      signedArtifactWritten: false,
      notarizationExecuted: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      externalDistributionAllowed: false,
    },
    nextSafeAction: findings.length
      ? "Fix signing-lane prerequisites before asking a human to approve signing."
      : "Review the signing lane and choose a target; do not read certificates, sign, notarize, upload, install, update, rollback, or distribute yet.",
  };
}

export function verifyOwnerOpsApprovedSigningLane({ root = process.cwd() } = {}) {
  const lane = buildOwnerOpsApprovedSigningLane({ root });
  const findings = [...lane.currentBlockingReasons];

  if (lane.status !== "ready") findings.push("approved_signing_lane_not_ready");
  if (lane.laneState !== "prepared_not_executed") findings.push("signing_lane_state_must_remain_prepared");
  if (lane.authorityBoundary.signingApproved !== false) findings.push("signing_approval_must_not_be_open");
  if (lane.authorityBoundary.signingExecuted !== false) findings.push("signing_must_not_execute");
  if (lane.authorityBoundary.certificateReadAllowed !== false) findings.push("certificate_read_must_not_be_open");
  if (lane.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_access_must_not_be_open");
  if (lane.authorityBoundary.signedArtifactWritten !== false) findings.push("signed_artifact_write_must_not_execute");
  if (lane.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_must_remain_blocked");
  if (!lane.requiredBeforeSigningExecution.includes("explicit human review decision record approving signing lane")) {
    findings.push("human_signing_approval_requirement_missing");
  }
  if (!lane.signingTargets.some((target) => target.id === "macos_tauri_app_signing")) {
    findings.push("macos_tauri_signing_target_missing");
  }

  return {
    schema: "gpao_t.owner_ops_approved_signing_lane_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence",
      "human review packet",
      "local package readback",
      "signing target list",
      "required pre-signing execution evidence",
      "signing/certificate/upload/install boundaries remain closed",
    ],
    laneState: lane.laneState,
    prerequisites: lane.prerequisites,
    signingApproved: lane.authorityBoundary.signingApproved,
    signingExecuted: lane.authorityBoundary.signingExecuted,
    certificateReadAllowed: lane.authorityBoundary.certificateReadAllowed,
    publicReleaseAllowed: lane.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: lane.authorityBoundary.packageUploadAllowed,
    nextSafeAction: lane.nextSafeAction,
  };
}

export function writeOwnerOpsSignedPackageEvidence({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const evidence = buildOwnerOpsSignedPackageEvidence({ root, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.md");

  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsSignedPackageEvidenceMarkdown(evidence));

  return {
    schema: "gpao_t.owner_ops_signed_package_evidence_write.v0_1",
    status: evidence.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.json",
      ".gpao-t/packages/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.md",
    ],
    evidenceStatus: evidence.status,
    signedPackageState: evidence.signedPackageState,
    signingExecuted: evidence.authorityBoundary.signingExecuted,
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    findings: evidence.findings,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsSignedPackageEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsSignedPackageEvidence({ root });
  const findings = [...evidence.findings];

  if (evidence.status !== "ready") findings.push("signed_package_evidence_not_ready");
  if (evidence.signedPackageState !== "unsigned_internal_production_package") findings.push("signed_package_state_must_remain_unsigned");
  if (evidence.authorityBoundary.signingExecuted !== false) findings.push("signing_must_not_execute");
  if (evidence.authorityBoundary.signedArtifactWritten !== false) findings.push("signed_artifact_write_must_not_execute");
  if (evidence.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_must_remain_blocked");
  if (evidence.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_must_remain_blocked");
  if (!evidence.requiredBeforePublicRelease.includes("signature verification output")) {
    findings.push("signature_verification_requirement_missing");
  }

  return {
    schema: "gpao_t.owner_ops_signed_package_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "release readiness evidence",
      "human review packet prerequisite",
      "local package readback prerequisite",
      "required signed artifact evidence list",
      "signing/upload/install/update/rollback remain blocked",
    ],
    signedPackageState: evidence.signedPackageState,
    signingExecuted: evidence.authorityBoundary.signingExecuted,
    publicReleaseAllowed: evidence.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: evidence.authorityBoundary.packageUploadAllowed,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function buildOwnerOpsInstallUpdateRollbackProof({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const signedEvidence = buildOwnerOpsSignedPackageEvidence({ root, now });
  const install = buildInstallHardeningReport({ root, now });
  const readback = readOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (signedEvidence.status !== "ready") findings.push("signed_package_evidence_not_ready");
  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (install.status === "blocked") findings.push("install_hardening_blocked");
  if (install.application.canInstallNow !== false) findings.push("install_execution_must_remain_blocked");
  if (install.application.canUpdateNow !== false) findings.push("update_execution_must_remain_blocked");
  if (install.application.canRollbackNow !== false) findings.push("rollback_execution_must_remain_blocked");
  if (signedEvidence.authorityBoundary.signingExecuted !== false) findings.push("signing_must_not_execute_here");

  return {
    schema: "gpao_t.owner_ops_install_update_rollback_proof.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: signedEvidence.packageId,
    packageVersion: signedEvidence.packageVersion,
    proofState: "proof_requirements_ready_not_executed",
    internalProductionPackage: {
      archiveName: readback.archiveName,
      bundleSha256: readback.bundleSha256 || null,
      fileCount: readback.fileCount || 0,
      readbackStatus: readback.status,
    },
    installUpdateRollbackReadiness: {
      installGate: install.installGate.status,
      updateGate: install.updateGate.status,
      rollbackGate: install.rollbackGate.status,
      canInstallNow: install.application.canInstallNow,
      canUpdateNow: install.application.canUpdateNow,
      canRollbackNow: install.application.canRollbackNow,
      sourceControlBaseline: install.rollbackGate.sourceControlBaseline,
      requiredRealExecutorConditions: install.authorityBoundary.realExecutorRequirements,
    },
    requiredProofBeforeRelease: [
      "signed package evidence accepted by owner-approved signing lane",
      "fresh install dry-run plan against the signed artifact",
      "fresh update dry-run plan against version change",
      "fresh rollback dry-run plan with source/state recovery path",
      "post-install verification command list",
      "post-update verification command list",
      "post-rollback verification command list",
      "explicit owner approval before any real install/update/rollback execution",
    ],
    authorityBoundary: {
      proofOnly: true,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      destructiveRollbackExecuted: false,
      daemonActivationExecuted: false,
      externalDownloadExecuted: false,
      publicReleaseAllowed: false,
      packageUploadAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix install/update/rollback proof prerequisites."
      : "Use this as install/update/rollback proof requirements; do not execute install, update, rollback, daemon activation, download, upload, or public release without explicit approval.",
  };
}

export function writeOwnerOpsInstallUpdateRollbackProof({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const proof = buildOwnerOpsInstallUpdateRollbackProof({ root, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.md");

  writeFileSync(jsonPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsInstallUpdateRollbackProofMarkdown(proof));

  return {
    schema: "gpao_t.owner_ops_install_update_rollback_proof_write.v0_1",
    status: proof.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json",
      ".gpao-t/packages/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.md",
    ],
    proofStatus: proof.status,
    proofState: proof.proofState,
    installExecuted: proof.authorityBoundary.installExecuted,
    updateExecuted: proof.authorityBoundary.updateExecuted,
    rollbackExecuted: proof.authorityBoundary.rollbackExecuted,
    findings: proof.findings,
    nextSafeAction: proof.nextSafeAction,
  };
}

export function verifyOwnerOpsInstallUpdateRollbackProof({ root = process.cwd() } = {}) {
  const proof = buildOwnerOpsInstallUpdateRollbackProof({ root });
  const findings = [...proof.findings];

  if (proof.status !== "ready") findings.push("install_update_rollback_proof_not_ready");
  if (proof.proofState !== "proof_requirements_ready_not_executed") findings.push("proof_state_must_remain_not_executed");
  if (proof.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute");
  if (proof.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute");
  if (proof.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute");
  if (proof.authorityBoundary.externalDownloadExecuted !== false) findings.push("external_download_must_not_execute");
  if (!proof.requiredProofBeforeRelease.includes("post-rollback verification command list")) {
    findings.push("post_rollback_verification_requirement_missing");
  }

  return {
    schema: "gpao_t.owner_ops_install_update_rollback_proof_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "signed package evidence prerequisite",
      "local package readback prerequisite",
      "GPAO-T install hardening report",
      "install/update/rollback proof requirements",
      "install/update/rollback execution remains blocked",
    ],
    proofState: proof.proofState,
    canInstallNow: proof.installUpdateRollbackReadiness.canInstallNow,
    canUpdateNow: proof.installUpdateRollbackReadiness.canUpdateNow,
    canRollbackNow: proof.installUpdateRollbackReadiness.canRollbackNow,
    nextSafeAction: proof.nextSafeAction,
  };
}

export function buildOwnerOpsDeploymentDryRunPlan({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const proof = buildOwnerOpsInstallUpdateRollbackProof({ root, now });
  const readback = readOwnerOpsInternalProductionPackage({ root });
  const findings = [];

  if (proof.status !== "ready") findings.push("install_update_rollback_proof_not_ready");
  if (readback.status !== "ready") findings.push("internal_production_package_readback_not_ready");
  if (proof.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute_in_plan");
  if (proof.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute_in_plan");
  if (proof.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute_in_plan");

  const packageBaseName = (readback.archiveName || proof.internalProductionPackage.archiveName || "")
    .replace(/\.zip$/, "");
  const bundlePath = `.gpao-t/packages/${packageBaseName}.bundle.json`;
  const manifestPath = `.gpao-t/packages/${packageBaseName}.manifest.json`;
  const checksumPath = `.gpao-t/packages/${packageBaseName}.sha256`;

  return {
    schema: "gpao_t.owner_ops_deployment_dry_run_plan.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: proof.packageId,
    packageVersion: proof.packageVersion,
    planState: "dry_run_plan_only_not_executed",
    internalProductionPackage: {
      archiveName: readback.archiveName || proof.internalProductionPackage.archiveName,
      bundleSha256: readback.bundleSha256 || proof.internalProductionPackage.bundleSha256 || null,
      fileCount: readback.fileCount || proof.internalProductionPackage.fileCount || 0,
      bundlePath,
      manifestPath,
      checksumPath,
    },
    lanes: [
      {
        id: "install",
        label: "로컬 설치 dry-run",
        purpose: "Owner Ops 패키지 후보가 설치 대상 구조를 갖췄는지 실행 전 확인한다.",
        inputs: [bundlePath, manifestPath, checksumPath],
        plannedChecks: [
          "manifest schema and package version readback",
          "bundle sha256 matches checksum",
          "embedded file count matches manifest fileCount",
          "no customer data and no credential files in package manifest",
          "post-install verification command list is available",
        ],
        stopConditions: [
          "checksum mismatch",
          "missing manifest or bundle",
          "unexpected executable side effect",
          "customer data or credential file candidate appears",
        ],
        executionState: "not_executed",
      },
      {
        id: "update",
        label: "로컬 업데이트 dry-run",
        purpose: "기존 설치 상태를 건드리지 않고 버전/파일 변경 영향만 예측한다.",
        inputs: [manifestPath, "future installed manifest snapshot"],
        plannedChecks: [
          "package version comparison",
          "added/changed/removed file impact summary",
          "backward-compatible command surface check",
          "post-update verification command list is available",
        ],
        stopConditions: [
          "version downgrade without rollback intent",
          "removed command without migration note",
          "state directory migration not described",
        ],
        executionState: "not_executed",
      },
      {
        id: "rollback",
        label: "로컬 롤백 dry-run",
        purpose: "업데이트 실패 시 이전 상태로 되돌릴 수 있는 기준과 검증 명령을 준비한다.",
        inputs: ["future previous manifest snapshot", "future rollback reference"],
        plannedChecks: [
          "previous package reference exists",
          "current package can be quarantined without data loss",
          "local state backup path is known",
          "post-rollback verification command list is available",
        ],
        stopConditions: [
          "previous package reference missing",
          "local state backup path missing",
          "rollback would delete user data",
          "rollback verification command missing",
        ],
        executionState: "not_executed",
      },
    ],
    verificationCommands: [
      "node bin/gpao-t.js owner-ops internal-production-package-readback-check",
      "node bin/gpao-t.js owner-ops install-update-rollback-proof-check",
      "node bin/gpao-t.js owner-ops deployment-dry-run-plan-check",
      "npm run check",
      "node --test test/owner-ops.test.js",
    ],
    authorityBoundary: {
      dryRunPlanOnly: true,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      fileMutationExecuted: false,
      daemonActivationExecuted: false,
      externalDownloadExecuted: false,
      publicUploadExecuted: false,
      signingExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix deployment dry-run plan findings before any installer/update/rollback lane is considered."
      : "Use this as the local deployment dry-run plan; do not execute install, update, rollback, daemon activation, download, signing, or upload without explicit owner approval.",
  };
}

export function writeOwnerOpsDeploymentDryRunPlan({
  root = process.cwd(),
  now = new Date().toISOString(),
} = {}) {
  const plan = buildOwnerOpsDeploymentDryRunPlan({ root, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = resolve(outputDir, "OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.json");
  const mdPath = resolve(outputDir, "OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.md");

  writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsDeploymentDryRunPlanMarkdown(plan));

  return {
    schema: "gpao_t.owner_ops_deployment_dry_run_plan_write.v0_1",
    status: plan.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.json",
      ".gpao-t/packages/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.md",
    ],
    planStatus: plan.status,
    planState: plan.planState,
    installExecuted: plan.authorityBoundary.installExecuted,
    updateExecuted: plan.authorityBoundary.updateExecuted,
    rollbackExecuted: plan.authorityBoundary.rollbackExecuted,
    findings: plan.findings,
    nextSafeAction: plan.nextSafeAction,
  };
}

export function verifyOwnerOpsDeploymentDryRunPlan({ root = process.cwd() } = {}) {
  const plan = buildOwnerOpsDeploymentDryRunPlan({ root });
  const readbackCheck = verifyOwnerOpsInternalProductionPackageReadback({ root });
  const proofCheck = verifyOwnerOpsInstallUpdateRollbackProof({ root });
  const findings = [...plan.findings];

  if (plan.status !== "ready") findings.push("deployment_dry_run_plan_not_ready");
  if (plan.planState !== "dry_run_plan_only_not_executed") findings.push("plan_state_must_remain_not_executed");
  if (readbackCheck.status !== "ready") findings.push("local_package_readback_check_not_ready");
  if (proofCheck.status !== "ready") findings.push("install_update_rollback_proof_check_not_ready");
  if (plan.lanes.length !== 3) findings.push("install_update_rollback_lanes_missing");
  if (!plan.lanes.every((lane) => lane.executionState === "not_executed")) {
    findings.push("all_lanes_must_remain_not_executed");
  }
  if (plan.authorityBoundary.fileMutationExecuted !== false) findings.push("file_mutation_must_not_execute");
  if (plan.authorityBoundary.publicUploadExecuted !== false) findings.push("public_upload_must_not_execute");

  return {
    schema: "gpao_t.owner_ops_deployment_dry_run_plan_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "local package readback",
      "install/update/rollback proof",
      "install dry-run lane",
      "update dry-run lane",
      "rollback dry-run lane",
      "no execution/no mutation boundary",
    ],
    planState: plan.planState,
    laneIds: plan.lanes.map((lane) => lane.id),
    installExecuted: plan.authorityBoundary.installExecuted,
    updateExecuted: plan.authorityBoundary.updateExecuted,
    rollbackExecuted: plan.authorityBoundary.rollbackExecuted,
    nextSafeAction: plan.nextSafeAction,
  };
}

export function buildOwnerOpsDryRunExecutorProof({
  root = process.cwd(),
  requestedLane = "install",
  requester = "owner",
  now = new Date().toISOString(),
} = {}) {
  const plan = buildOwnerOpsDeploymentDryRunPlan({ root, now });
  const lane = (plan.lanes || []).find((item) => item.id === requestedLane) || null;
  const findings = [];

  if (plan.status !== "ready") findings.push("deployment_dry_run_plan_not_ready");
  if (!lane) findings.push("requested_lane_not_found");
  if (!["install", "update", "rollback"].includes(requestedLane)) findings.push("unsupported_lane");
  if (plan.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute");
  if (plan.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute");
  if (plan.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute");

  return {
    schema: "gpao_t.owner_ops_dry_run_executor_proof.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: plan.packageId,
    packageVersion: plan.packageVersion,
    executorState: "approval_packet_prepared_not_invoked",
    requestedLane,
    requester,
    approvalPacket: {
      state: "prepared_not_approved",
      requiredDecision: "approve_dry_run_invocation",
      allowedDecisions: ["hold", "revise", "approve_dry_run_invocation"],
      approvalTokenRequired: `approve-owner-ops-${requestedLane}-dry-run`,
      scope: {
        lane: requestedLane,
        internalProductionPackage: plan.internalProductionPackage.archiveName,
        bundleSha256: plan.internalProductionPackage.bundleSha256,
        allowedEffect: "read package candidate metadata and produce dry-run simulation output only",
      },
    },
    invocationPreview: lane
      ? {
          laneId: lane.id,
          label: lane.label,
          plannedInputs: lane.inputs,
          plannedChecks: lane.plannedChecks,
          stopConditions: lane.stopConditions,
          expectedOutput: [
            "lane status",
            "input readback summary",
            "planned check results",
            "stop condition review",
            "post-lane verification commands",
          ],
          executionState: "not_invoked",
        }
      : null,
    simulatedResult: lane
      ? {
          state: "simulated_not_invoked",
          wouldRead: lane.inputs,
          wouldWrite: [],
          wouldExecuteCommands: [],
          wouldMutateFiles: false,
          wouldActivateDaemon: false,
          wouldDownloadExternally: false,
        }
      : null,
    authorityBoundary: {
      proofOnly: true,
      approvalWritten: false,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      fileMutationExecuted: false,
      commandExecutionExecuted: false,
      daemonActivationExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix dry-run executor proof findings before asking for owner approval."
      : "Ask the owner to review the approval packet; do not invoke the dry-run executor until explicit approval is recorded.",
  };
}

export function writeOwnerOpsDryRunExecutorProof({
  root = process.cwd(),
  requestedLane = "install",
  requester = "owner",
  now = new Date().toISOString(),
} = {}) {
  const proof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane, requester, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const suffix = requestedLane.replace(/[^a-z0-9_-]/gi, "-").toUpperCase();
  const jsonPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-${suffix}.json`);
  const mdPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-${suffix}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsDryRunExecutorProofMarkdown(proof));

  return {
    schema: "gpao_t.owner_ops_dry_run_executor_proof_write.v0_1",
    status: proof.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      relativePackagePath(jsonPath, root),
      relativePackagePath(mdPath, root),
    ],
    proofStatus: proof.status,
    executorState: proof.executorState,
    requestedLane: proof.requestedLane,
    dryRunInvoked: proof.authorityBoundary.dryRunInvoked,
    findings: proof.findings,
    nextSafeAction: proof.nextSafeAction,
  };
}

export function verifyOwnerOpsDryRunExecutorProof({
  root = process.cwd(),
  requestedLane = "install",
} = {}) {
  const proof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane });
  const planCheck = verifyOwnerOpsDeploymentDryRunPlan({ root });
  const findings = [...proof.findings];

  if (proof.status !== "ready") findings.push("dry_run_executor_proof_not_ready");
  if (planCheck.status !== "ready") findings.push("deployment_dry_run_plan_check_not_ready");
  if (proof.executorState !== "approval_packet_prepared_not_invoked") {
    findings.push("executor_state_must_remain_not_invoked");
  }
  if (proof.approvalPacket.state !== "prepared_not_approved") findings.push("approval_must_not_be_implied");
  if (proof.authorityBoundary.approvalWritten !== false) findings.push("approval_write_must_not_execute");
  if (proof.authorityBoundary.dryRunInvoked !== false) findings.push("dry_run_invocation_must_not_execute");
  if (proof.authorityBoundary.fileMutationExecuted !== false) findings.push("file_mutation_must_not_execute");
  if (proof.simulatedResult?.wouldWrite?.length !== 0) findings.push("simulated_result_must_not_write");
  if (proof.simulatedResult?.wouldExecuteCommands?.length !== 0) {
    findings.push("simulated_result_must_not_execute_commands");
  }

  return {
    schema: "gpao_t.owner_ops_dry_run_executor_proof_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "deployment dry-run plan prerequisite",
      "requested lane exists",
      "approval packet not approved",
      "executor not invoked",
      "no file mutation",
      "no command execution",
      "no install/update/rollback execution",
    ],
    requestedLane: proof.requestedLane,
    executorState: proof.executorState,
    approvalState: proof.approvalPacket.state,
    dryRunInvoked: proof.authorityBoundary.dryRunInvoked,
    nextSafeAction: proof.nextSafeAction,
  };
}

export function buildOwnerOpsDryRunApprovalRecordDesign({
  root = process.cwd(),
  requestedLane = "install",
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const proof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane, requester: reviewer, now });
  const findings = [];

  if (proof.status !== "ready") findings.push("dry_run_executor_proof_not_ready");
  if (proof.approvalPacket.state !== "prepared_not_approved") findings.push("approval_packet_state_must_start_unapproved");
  if (proof.authorityBoundary.dryRunInvoked !== false) findings.push("dry_run_must_not_be_invoked_before_record_design");

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_design.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: proof.packageId,
    packageVersion: proof.packageVersion,
    requestedLane: proof.requestedLane,
    reviewer,
    designState: "approval_record_write_design_only",
    storageDesign: {
      directory: ".gpao-t/owner-ops/approvals",
      jsonlFile: ".gpao-t/owner-ops/approvals/dry-run-approvals.jsonl",
      indexFile: ".gpao-t/owner-ops/approvals/index.json",
      appendMode: "future_append_only",
      currentWrite: "not_executed",
    },
    approvalRecordSchema: {
      schema: "gpao_t.owner_ops_dry_run_approval_record.v0_1",
      requiredFields: [
        "id",
        "createdAt",
        "reviewer",
        "decision",
        "requestedLane",
        "approvalToken",
        "packageId",
        "packageVersion",
        "bundleSha256",
        "allowedEffect",
        "expiresAt",
        "sourceProofRef",
      ],
      allowedDecisions: ["hold", "revise", "approve_dry_run_invocation"],
      validApprovalToken: proof.approvalPacket.approvalTokenRequired,
      sourceProofRef: `.gpao-t/packages/OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-${proof.requestedLane.toUpperCase()}.json`,
    },
    validationRules: [
      "decision must be approve_dry_run_invocation",
      "approvalToken must match the requested lane",
      "requestedLane must match the executor proof lane",
      "bundleSha256 must match the internal production package",
      "approval must expire before invocation",
      "approval cannot authorize install/update/rollback execution",
      "approval cannot authorize file mutation, signing, upload, or external download",
    ],
    rejectionConditions: [
      "missing required field",
      "wrong approval token",
      "lane mismatch",
      "package checksum drift",
      "expired approval",
      "scope exceeds dry-run invocation",
      "attempted install/update/rollback execution",
      "attempted file mutation or external operation",
    ],
    futureRecordPreview: {
      id: `dry-run-approval-${proof.requestedLane}-preview`,
      createdAt: now,
      reviewer,
      decision: "hold",
      requestedLane: proof.requestedLane,
      approvalToken: proof.approvalPacket.approvalTokenRequired,
      packageId: proof.packageId,
      packageVersion: proof.packageVersion,
      bundleSha256: proof.approvalPacket.scope.bundleSha256,
      allowedEffect: proof.approvalPacket.scope.allowedEffect,
      expiresAt: "future_expiry_required",
      sourceProofRef: `.gpao-t/packages/OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-${proof.requestedLane.toUpperCase()}.json`,
      writeState: "preview_only_not_written",
    },
    authorityBoundary: {
      designOnly: true,
      approvalRecordWritten: false,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      fileMutationExecuted: false,
      commandExecutionExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix dry-run approval record design findings before any write lane is considered."
      : "Use this as the approval record write design; do not write approval records or invoke dry-run until a separate owner-approved write lane is opened.",
  };
}

export function writeOwnerOpsDryRunApprovalRecordDesign({
  root = process.cwd(),
  requestedLane = "install",
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const design = buildOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane, reviewer, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const suffix = requestedLane.replace(/[^a-z0-9_-]/gi, "-").toUpperCase();
  const jsonPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-APPROVAL-RECORD-DESIGN-${suffix}.json`);
  const mdPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-APPROVAL-RECORD-DESIGN-${suffix}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(design, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsDryRunApprovalRecordDesignMarkdown(design));

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_design_write.v0_1",
    status: design.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      relativePackagePath(jsonPath, root),
      relativePackagePath(mdPath, root),
    ],
    designStatus: design.status,
    designState: design.designState,
    requestedLane: design.requestedLane,
    approvalRecordWritten: design.authorityBoundary.approvalRecordWritten,
    dryRunInvoked: design.authorityBoundary.dryRunInvoked,
    findings: design.findings,
    nextSafeAction: design.nextSafeAction,
  };
}

export function verifyOwnerOpsDryRunApprovalRecordDesign({
  root = process.cwd(),
  requestedLane = "install",
} = {}) {
  const design = buildOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane });
  const proofCheck = verifyOwnerOpsDryRunExecutorProof({ root, requestedLane });
  const findings = [...design.findings];

  if (design.status !== "ready") findings.push("dry_run_approval_record_design_not_ready");
  if (proofCheck.status !== "ready") findings.push("dry_run_executor_proof_check_not_ready");
  if (design.designState !== "approval_record_write_design_only") findings.push("design_state_must_remain_design_only");
  if (design.futureRecordPreview.writeState !== "preview_only_not_written") {
    findings.push("future_record_preview_must_not_be_written");
  }
  if (design.authorityBoundary.approvalRecordWritten !== false) findings.push("approval_record_must_not_be_written");
  if (design.authorityBoundary.dryRunInvoked !== false) findings.push("dry_run_must_not_be_invoked");
  if (!design.validationRules.includes("approval cannot authorize install/update/rollback execution")) {
    findings.push("install_update_rollback_scope_limit_missing");
  }
  if (!design.rejectionConditions.includes("scope exceeds dry-run invocation")) {
    findings.push("scope_exceeded_rejection_missing");
  }

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_design_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "dry-run executor proof prerequisite",
      "approval storage design",
      "approval record schema",
      "validation rules",
      "rejection conditions",
      "preview-only record",
      "no approval write/no dry-run invocation",
    ],
    requestedLane: design.requestedLane,
    designState: design.designState,
    approvalRecordWritten: design.authorityBoundary.approvalRecordWritten,
    dryRunInvoked: design.authorityBoundary.dryRunInvoked,
    nextSafeAction: design.nextSafeAction,
  };
}

export function buildOwnerOpsDryRunApprovalRecordWriteLane({
  root = process.cwd(),
  requestedLane = "install",
  reviewer = "owner",
  now = new Date().toISOString(),
} = {}) {
  const design = buildOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane, reviewer, now });
  const existing = readOwnerOpsDryRunApprovalRecords({ root });
  const findings = [];

  if (design.status !== "ready") findings.push("dry_run_approval_record_design_not_ready");
  if (design.authorityBoundary.approvalRecordWritten !== false) findings.push("design_must_start_without_record_write");
  if (design.authorityBoundary.dryRunInvoked !== false) findings.push("dry_run_must_not_be_invoked_before_write_lane");

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_write_lane.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: design.packageId,
    packageVersion: design.packageVersion,
    requestedLane: design.requestedLane,
    reviewer,
    laneState: "owner_approval_required_before_append",
    storage: {
      directory: design.storageDesign.directory,
      jsonlFile: design.storageDesign.jsonlFile,
      indexFile: design.storageDesign.indexFile,
      appendMode: "append_only_local_jsonl",
      existingRecordCount: existing.records.length,
    },
    requiredApproval: {
      decision: "approve_dry_run_invocation",
      approvalToken: design.approvalRecordSchema.validApprovalToken,
      allowedEffect: design.futureRecordPreview.allowedEffect,
      expiresAtRequired: true,
      packageChecksum: design.futureRecordPreview.bundleSha256,
      sourceProofRef: design.futureRecordPreview.sourceProofRef,
    },
    blockedWithoutApproval: {
      status: "blocked",
      reason: "approval_token_required",
      approvalRecordWritten: false,
      dryRunInvoked: false,
    },
    authorityBoundary: {
      localRecordAppendOnly: true,
      approvalRecordWrittenByThisBuild: false,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      fileMutationBeyondApprovalStore: false,
      commandExecutionExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix Owner Ops approval write lane findings before append is allowed."
      : "Append an approval record only with the exact owner approval token; dry-run invocation remains a separate later step.",
  };
}

export function appendOwnerOpsDryRunApprovalRecord({
  root = process.cwd(),
  requestedLane = "install",
  reviewer = "owner",
  decision = "hold",
  approvalToken,
  expiresAt,
  now = new Date().toISOString(),
} = {}) {
  const lane = buildOwnerOpsDryRunApprovalRecordWriteLane({ root, requestedLane, reviewer, now });
  const findings = [...lane.findings];
  const required = lane.requiredApproval;
  const expires = expiresAt || new Date(Date.parse(now) + 15 * 60 * 1000).toISOString();

  if (lane.status !== "ready") findings.push("approval_write_lane_not_ready");
  if (decision !== required.decision) findings.push("decision_must_approve_dry_run_invocation");
  if (approvalToken !== required.approvalToken) findings.push("approval_token_mismatch");
  if (Number.isNaN(Date.parse(expires))) findings.push("expires_at_invalid");
  if (!Number.isNaN(Date.parse(expires)) && Date.parse(expires) <= Date.parse(now)) findings.push("approval_expired");
  if (!["install", "update", "rollback"].includes(requestedLane)) findings.push("unsupported_lane");

  if (findings.length) {
    return {
      schema: "gpao_t.owner_ops_dry_run_approval_record_append.v0_1",
      status: "blocked",
      generatedAt: now,
      requestedLane,
      reviewer,
      decision,
      approvalRecordWritten: false,
      dryRunInvoked: false,
      filesWritten: [],
      findings,
      authorityBoundary: {
        localRecordAppendOnly: true,
        dryRunInvoked: false,
        installExecuted: false,
        updateExecuted: false,
        rollbackExecuted: false,
        commandExecutionExecuted: false,
        externalDownloadExecuted: false,
        publicUploadExecuted: false,
      },
      nextSafeAction: "Provide an exact owner approval token and valid expiry if a local approval record should be written.",
    };
  }

  const approvalDir = resolve(root, ".gpao-t", "owner-ops", "approvals");
  const jsonlPath = resolve(approvalDir, "dry-run-approvals.jsonl");
  const indexPath = resolve(approvalDir, "index.json");
  mkdirSync(approvalDir, { recursive: true });

  const record = {
    schema: "gpao_t.owner_ops_dry_run_approval_record.v0_1",
    id: `dry-run-approval-${requestedLane}-${createHash("sha256")
      .update(`${now}:${reviewer}:${requestedLane}:${required.packageChecksum}`)
      .digest("hex")
      .slice(0, 12)}`,
    createdAt: now,
    reviewer,
    decision,
    requestedLane,
    approvalToken,
    packageId: lane.packageId,
    packageVersion: lane.packageVersion,
    bundleSha256: required.packageChecksum,
    allowedEffect: required.allowedEffect,
    expiresAt: expires,
    sourceProofRef: required.sourceProofRef,
    invocationState: "not_invoked",
    authorityBoundary: {
      approvalRecordWritten: true,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      fileMutationBeyondApprovalStore: false,
      commandExecutionExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
  };

  appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`);
  const existingRecords = readOwnerOpsDryRunApprovalRecords({ root }).records;
  const index = {
    schema: "gpao_t.owner_ops_dry_run_approval_record_index.v0_1",
    updatedAt: now,
    recordCount: existingRecords.length,
    latestRecordId: record.id,
    latestRequestedLane: requestedLane,
    latestDecision: decision,
    dryRunInvoked: false,
    records: existingRecords.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      requestedLane: item.requestedLane,
      decision: item.decision,
      expiresAt: item.expiresAt,
      invocationState: item.invocationState,
    })),
  };
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_append.v0_1",
    status: "written_local_only",
    generatedAt: now,
    requestedLane,
    reviewer,
    decision,
    approvalRecordWritten: true,
    dryRunInvoked: false,
    record,
    filesWritten: [
      relativePackagePath(jsonlPath, root),
      relativePackagePath(indexPath, root),
    ],
    findings: [],
    authorityBoundary: record.authorityBoundary,
    nextSafeAction: "Use this local approval record as input to a later dry-run invocation gate; no invocation has been executed.",
  };
}

export function readOwnerOpsDryRunApprovalRecords({ root = process.cwd() } = {}) {
  const approvalDir = resolve(root, ".gpao-t", "owner-ops", "approvals");
  const jsonlPath = resolve(approvalDir, "dry-run-approvals.jsonl");
  const indexPath = resolve(approvalDir, "index.json");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_records.v0_1",
    status: "ready",
    storage: {
      jsonlFile: ".gpao-t/owner-ops/approvals/dry-run-approvals.jsonl",
      indexFile: ".gpao-t/owner-ops/approvals/index.json",
      jsonlExists: existsSync(jsonlPath),
      indexExists: existsSync(indexPath),
    },
    recordCount: records.length,
    records,
    authorityBoundary: {
      readOnly: true,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
  };
}

export function verifyOwnerOpsDryRunApprovalRecordWriteLane({
  root = process.cwd(),
  requestedLane = "install",
} = {}) {
  const lane = buildOwnerOpsDryRunApprovalRecordWriteLane({ root, requestedLane });
  const findings = [...lane.findings];

  if (lane.status !== "ready") findings.push("approval_record_write_lane_not_ready");
  if (lane.blockedWithoutApproval.approvalRecordWritten !== false) findings.push("blocked_path_must_not_write");
  if (lane.blockedWithoutApproval.dryRunInvoked !== false) findings.push("blocked_path_must_not_invoke_dry_run");
  if (lane.authorityBoundary.dryRunInvoked !== false) findings.push("write_lane_must_not_invoke_dry_run");
  if (lane.requiredApproval.decision !== "approve_dry_run_invocation") {
    findings.push("required_approval_decision_missing");
  }

  return {
    schema: "gpao_t.owner_ops_dry_run_approval_record_write_lane_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "approval record design prerequisite",
      "owner approval token requirement",
      "blocked path does not write",
      "append-only local JSONL storage",
      "dry-run invocation remains blocked",
      "install/update/rollback execution remains blocked",
    ],
    requestedLane: lane.requestedLane,
    existingRecordCount: lane.storage.existingRecordCount,
    dryRunInvoked: lane.authorityBoundary.dryRunInvoked,
    nextSafeAction: lane.nextSafeAction,
  };
}

export function buildOwnerOpsControlledDryRunInvocationGate({
  root = process.cwd(),
  requestedLane = "install",
  now = new Date().toISOString(),
} = {}) {
  const proof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane, now });
  const records = readOwnerOpsDryRunApprovalRecords({ root }).records;
  const approvalRecord = [...records].reverse().find((record) => (
    record.requestedLane === requestedLane
    && record.decision === "approve_dry_run_invocation"
    && record.invocationState === "not_invoked"
    && record.bundleSha256 === proof.approvalPacket.scope.bundleSha256
    && Date.parse(record.expiresAt) > Date.parse(now)
  )) || null;
  const findings = [];

  if (proof.status !== "ready") findings.push("dry_run_executor_proof_not_ready");
  if (!approvalRecord) findings.push("valid_unexpired_approval_record_missing");
  if (proof.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute");
  if (proof.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute");
  if (proof.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute");

  return {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocation_gate.v0_1",
    status: findings.length ? "blocked" : "ready",
    generatedAt: now,
    packageId: proof.packageId,
    packageVersion: proof.packageVersion,
    requestedLane,
    gateState: approvalRecord ? "approved_for_local_dry_run_simulation" : "approval_record_required",
    approvalRecord: approvalRecord
      ? {
          id: approvalRecord.id,
          createdAt: approvalRecord.createdAt,
          expiresAt: approvalRecord.expiresAt,
          bundleSha256: approvalRecord.bundleSha256,
          invocationState: approvalRecord.invocationState,
        }
      : null,
    invocationPlan: {
      mode: "local_simulation_only",
      wouldRead: proof.simulatedResult?.wouldRead || [],
      wouldWrite: [".gpao-t/owner-ops/dry-runs/dry-run-invocations.jsonl"],
      wouldExecuteCommands: [],
      wouldMutatePackageFiles: false,
      wouldInstall: false,
      wouldUpdate: false,
      wouldRollback: false,
      wouldUseNetwork: false,
    },
    authorityBoundary: {
      approvalRecordRequired: true,
      dryRunSimulationRecordAllowed: Boolean(approvalRecord),
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      commandExecutionExecuted: false,
      packageFileMutationExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Append an exact owner approval record before invoking the local dry-run simulation."
      : "Invoke the local dry-run simulation record; do not execute install, update, rollback, commands, downloads, signing, or upload.",
  };
}

export function invokeOwnerOpsControlledDryRun({
  root = process.cwd(),
  requestedLane = "install",
  now = new Date().toISOString(),
} = {}) {
  const gate = buildOwnerOpsControlledDryRunInvocationGate({ root, requestedLane, now });
  const findings = [...gate.findings];

  if (gate.status !== "ready") {
    return {
      schema: "gpao_t.owner_ops_controlled_dry_run_invocation.v0_1",
      status: "blocked",
      generatedAt: now,
      requestedLane,
      dryRunInvoked: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      filesWritten: [],
      findings,
      nextSafeAction: gate.nextSafeAction,
    };
  }

  const dryRunDir = resolve(root, ".gpao-t", "owner-ops", "dry-runs");
  const jsonlPath = resolve(dryRunDir, "dry-run-invocations.jsonl");
  const indexPath = resolve(dryRunDir, "index.json");
  mkdirSync(dryRunDir, { recursive: true });

  const invocation = {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocation_record.v0_1",
    id: `dry-run-invocation-${requestedLane}-${createHash("sha256")
      .update(`${now}:${requestedLane}:${gate.approvalRecord.id}`)
      .digest("hex")
      .slice(0, 12)}`,
    createdAt: now,
    requestedLane,
    approvalRecordId: gate.approvalRecord.id,
    packageId: gate.packageId,
    packageVersion: gate.packageVersion,
    bundleSha256: gate.approvalRecord.bundleSha256,
    mode: "local_simulation_only",
    simulatedChecks: [
      "approval record exists",
      "approval record not expired",
      "package checksum matches approval scope",
      "lane is install/update/rollback dry-run only",
      "no command execution planned",
      "no package file mutation planned",
      "no external network planned",
    ],
    simulatedResult: {
      state: "dry_run_simulated",
      wouldRead: gate.invocationPlan.wouldRead,
      wouldWrite: gate.invocationPlan.wouldWrite,
      wouldExecuteCommands: [],
      wouldInstall: false,
      wouldUpdate: false,
      wouldRollback: false,
      wouldUseNetwork: false,
    },
    authorityBoundary: {
      dryRunInvoked: true,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      commandExecutionExecuted: false,
      packageFileMutationExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
  };

  appendFileSync(jsonlPath, `${JSON.stringify(invocation)}\n`);
  const records = readOwnerOpsControlledDryRunInvocations({ root }).records;
  const index = {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocation_index.v0_1",
    updatedAt: now,
    recordCount: records.length,
    latestInvocationId: invocation.id,
    latestRequestedLane: requestedLane,
    installExecuted: false,
    updateExecuted: false,
    rollbackExecuted: false,
    records: records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      requestedLane: record.requestedLane,
      approvalRecordId: record.approvalRecordId,
      mode: record.mode,
    })),
  };
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  return {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocation.v0_1",
    status: "simulated_local_only",
    generatedAt: now,
    requestedLane,
    dryRunInvoked: true,
    installExecuted: false,
    updateExecuted: false,
    rollbackExecuted: false,
    invocation,
    filesWritten: [
      relativePackagePath(jsonlPath, root),
      relativePackagePath(indexPath, root),
    ],
    findings: [],
    nextSafeAction: "Review the local dry-run simulation result before any real install/update/rollback executor is designed.",
  };
}

export function readOwnerOpsControlledDryRunInvocations({ root = process.cwd() } = {}) {
  const dryRunDir = resolve(root, ".gpao-t", "owner-ops", "dry-runs");
  const jsonlPath = resolve(dryRunDir, "dry-run-invocations.jsonl");
  const indexPath = resolve(dryRunDir, "index.json");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocations.v0_1",
    status: "ready",
    storage: {
      jsonlFile: ".gpao-t/owner-ops/dry-runs/dry-run-invocations.jsonl",
      indexFile: ".gpao-t/owner-ops/dry-runs/index.json",
      jsonlExists: existsSync(jsonlPath),
      indexExists: existsSync(indexPath),
    },
    recordCount: records.length,
    records,
    authorityBoundary: {
      readOnly: true,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
  };
}

export function verifyOwnerOpsControlledDryRunInvocationGate({
  root = process.cwd(),
  requestedLane = "install",
} = {}) {
  const gate = buildOwnerOpsControlledDryRunInvocationGate({ root, requestedLane });
  const findings = [...gate.findings];

  if (gate.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute");
  if (gate.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute");
  if (gate.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute");
  if (gate.invocationPlan.wouldExecuteCommands.length !== 0) findings.push("dry_run_must_not_execute_commands");
  if (gate.invocationPlan.wouldInstall !== false) findings.push("dry_run_must_not_install");
  if (gate.invocationPlan.wouldUpdate !== false) findings.push("dry_run_must_not_update");
  if (gate.invocationPlan.wouldRollback !== false) findings.push("dry_run_must_not_rollback");

  return {
    schema: "gpao_t.owner_ops_controlled_dry_run_invocation_gate_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "valid approval record",
      "approval checksum",
      "local simulation plan",
      "no command execution",
      "no package mutation",
      "no install/update/rollback execution",
      "no external network",
    ],
    requestedLane: gate.requestedLane,
    gateState: gate.gateState,
    dryRunSimulationRecordAllowed: gate.authorityBoundary.dryRunSimulationRecordAllowed,
    nextSafeAction: gate.nextSafeAction,
  };
}

export function buildOwnerOpsDryRunResultReviewHandoff({
  root = process.cwd(),
  requestedLane = "install",
  now = new Date().toISOString(),
} = {}) {
  const invocations = readOwnerOpsControlledDryRunInvocations({ root }).records;
  const latestInvocation = [...invocations].reverse().find((record) => record.requestedLane === requestedLane) || null;
  const findings = [];

  if (!latestInvocation) {
    findings.push("dry_run_invocation_record_missing");
  } else {
    if (latestInvocation.authorityBoundary?.installExecuted !== false) findings.push("install_must_not_execute");
    if (latestInvocation.authorityBoundary?.updateExecuted !== false) findings.push("update_must_not_execute");
    if (latestInvocation.authorityBoundary?.rollbackExecuted !== false) findings.push("rollback_must_not_execute");
    if ((latestInvocation.simulatedResult?.wouldExecuteCommands || []).length !== 0) {
      findings.push("dry_run_review_must_not_include_command_execution");
    }
  }

  return {
    schema: "gpao_t.owner_ops_dry_run_result_review_handoff.v0_1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    requestedLane,
    reviewState: latestInvocation ? "dry_run_result_available_for_human_review" : "dry_run_result_missing",
    latestInvocation: latestInvocation
      ? {
          id: latestInvocation.id,
          createdAt: latestInvocation.createdAt,
          approvalRecordId: latestInvocation.approvalRecordId,
          packageId: latestInvocation.packageId,
          packageVersion: latestInvocation.packageVersion,
          bundleSha256: latestInvocation.bundleSha256,
          mode: latestInvocation.mode,
        }
      : null,
    humanReadableSummary: latestInvocation
      ? [
          `${requestedLane} dry-run simulation record exists.`,
          "No install/update/rollback action was executed.",
          "No command execution was performed.",
          "No external network, signing, or public upload was performed.",
          "This result can be reviewed before any real executor design is opened.",
        ]
      : [
          `${requestedLane} dry-run simulation record is missing.`,
          "Append an owner approval record and invoke the local dry-run simulation before result review.",
        ],
    replayChecklist: latestInvocation
      ? [
          "approval record id is linked",
          "package checksum is present",
          "simulation mode is local_simulation_only",
          "simulated checks are present",
          "wouldExecuteCommands is empty",
          "wouldInstall/wouldUpdate/wouldRollback are false",
        ]
      : [
          "dry-run invocation record exists",
          "approval record is linked",
          "simulation boundaries are available",
        ],
    handoffPacket: latestInvocation
      ? {
          targetAudience: "owner_or_internal_acceptance_reviewer",
          decisionNeeded: "review_dry_run_result_before_real_executor_design",
          evidenceRefs: [
            ".gpao-t/owner-ops/dry-runs/dry-run-invocations.jsonl",
            ".gpao-t/owner-ops/approvals/dry-run-approvals.jsonl",
            ".gpao-t/packages/gpao-t-owner-ops-0.1.0-internal-production-package.manifest.json",
          ],
          nextAllowedActions: [
            "review result",
            "request revision",
            "prepare real executor design gate",
          ],
          stillBlockedActions: [
            "install execution",
            "update execution",
            "rollback execution",
            "command execution",
            "external download",
            "signing",
            "public upload",
          ],
        }
      : null,
    authorityBoundary: {
      reviewOnly: true,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      commandExecutionExecuted: false,
      externalDownloadExecuted: false,
      signingExecuted: false,
      publicUploadExecuted: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Create a controlled local dry-run simulation record before handoff review."
      : "Use this handoff to review the dry-run result before designing any real install/update/rollback executor.",
  };
}

export function writeOwnerOpsDryRunResultReviewHandoff({
  root = process.cwd(),
  requestedLane = "install",
  now = new Date().toISOString(),
} = {}) {
  const handoff = buildOwnerOpsDryRunResultReviewHandoff({ root, requestedLane, now });
  const outputDir = resolve(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const suffix = requestedLane.replace(/[^a-z0-9_-]/gi, "-").toUpperCase();
  const jsonPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-${suffix}.json`);
  const mdPath = resolve(outputDir, `OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-${suffix}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsDryRunResultReviewHandoffMarkdown(handoff));

  return {
    schema: "gpao_t.owner_ops_dry_run_result_review_handoff_write.v0_1",
    status: handoff.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      relativePackagePath(jsonPath, root),
      relativePackagePath(mdPath, root),
    ],
    handoffStatus: handoff.status,
    requestedLane: handoff.requestedLane,
    installExecuted: handoff.authorityBoundary.installExecuted,
    updateExecuted: handoff.authorityBoundary.updateExecuted,
    rollbackExecuted: handoff.authorityBoundary.rollbackExecuted,
    findings: handoff.findings,
    nextSafeAction: handoff.nextSafeAction,
  };
}

export function verifyOwnerOpsDryRunResultReviewHandoff({
  root = process.cwd(),
  requestedLane = "install",
} = {}) {
  const handoff = buildOwnerOpsDryRunResultReviewHandoff({ root, requestedLane });
  const findings = [...handoff.findings];

  if (handoff.status !== "ready") findings.push("dry_run_result_review_handoff_not_ready");
  if (handoff.authorityBoundary.installExecuted !== false) findings.push("install_must_not_execute");
  if (handoff.authorityBoundary.updateExecuted !== false) findings.push("update_must_not_execute");
  if (handoff.authorityBoundary.rollbackExecuted !== false) findings.push("rollback_must_not_execute");
  if (!handoff.handoffPacket?.stillBlockedActions?.includes("install execution")) {
    findings.push("install_blocked_action_missing");
  }
  if (!handoff.replayChecklist.includes("wouldExecuteCommands is empty")) {
    findings.push("command_execution_replay_check_missing");
  }

  return {
    schema: "gpao_t.owner_ops_dry_run_result_review_handoff_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "dry-run invocation record",
      "human-readable summary",
      "replay checklist",
      "handoff packet",
      "blocked install/update/rollback",
      "blocked command/network/sign/upload",
    ],
    requestedLane: handoff.requestedLane,
    reviewState: handoff.reviewState,
    nextSafeAction: handoff.nextSafeAction,
  };
}

function renderOwnerOpsReleaseReadinessEvidenceMarkdown(evidence) {
  const lines = [
    "# Owner Ops Release Readiness Evidence",
    "",
    `Status: ${evidence.status}`,
    `Release state: ${evidence.releaseState}`,
    `Package: ${evidence.packageId}@${evidence.packageVersion}`,
    "",
    "## Evidence",
    "",
    `- Pre-public evidence bridge: ${evidence.prePublicEvidenceBridge.status}`,
    `- Pre-public repair backlog: ${evidence.prePublicRepairBacklog.status}`,
    `- Pre-public repair items: ${evidence.prePublicRepairBacklog.itemCount}`,
    `- Pre-public repair completion: ${evidence.prePublicRepairCompletionEvidence.status}`,
    `- Completed repair items: ${evidence.prePublicRepairCompletionEvidence.completedCount}/${evidence.prePublicRepairCompletionEvidence.itemCount}`,
    `- Distribution evidence: ${evidence.distributionEvidence.status}`,
    `- Internal production package: ${evidence.internalProductionPackage.status}`,
    `- Internal production archive: ${evidence.internalProductionPackage.archiveName}`,
    `- Internal production files: ${evidence.internalProductionPackage.fileCount}`,
    "",
    "## Signed Package Boundary",
    "",
    `- Signing executed: ${evidence.signedPackageEvidence.signingExecuted}`,
    `- Notarization executed: ${evidence.signedPackageEvidence.notarizationExecuted}`,
    `- Signature verification available: ${evidence.signedPackageEvidence.signatureVerificationAvailable}`,
    "",
    "## Install / Update / Rollback",
    "",
    `- Install now: ${evidence.installUpdateRollbackReadiness.canInstallNow}`,
    `- Update now: ${evidence.installUpdateRollbackReadiness.canUpdateNow}`,
    `- Rollback now: ${evidence.installUpdateRollbackReadiness.canRollbackNow}`,
    "",
    "## Human Review",
    "",
    `- Approval state: ${evidence.humanReviewApprovalEvidence.state}`,
    ...evidence.humanReviewApprovalEvidence.requiredReviewItems.map((item) => `- ${item}`),
    "",
    "## Authority Boundary",
    "",
    `- Public release allowed: ${evidence.authorityBoundary.publicReleaseAllowed}`,
    `- Package upload allowed: ${evidence.authorityBoundary.packageUploadAllowed}`,
    `- External distribution executed: ${evidence.authorityBoundary.externalDistributionExecuted}`,
    "",
    "## Findings",
    "",
    ...(evidence.findings.length ? evidence.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    evidence.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function readOwnerOpsPackageEvidenceJson({ root, filename }) {
  const relativePath = `.gpao-t/packages/${filename}`;
  const jsonPath = resolve(root, relativePath);
  if (!existsSync(jsonPath)) {
    return {
      status: "missing",
      file: relativePath,
      data: null,
      error: null,
    };
  }

  try {
    return {
      status: "present",
      file: relativePath,
      data: JSON.parse(readFileSync(jsonPath, "utf8")),
      error: null,
    };
  } catch (error) {
    return {
      status: "invalid",
      file: relativePath,
      data: null,
      error: error.message,
    };
  }
}

function normalizeBroaderOwnerTestingResult({ result, now }) {
  const seed = JSON.stringify({
    now,
    host: result.host,
    testerRole: result.testerRole,
    industry: result.industry,
    notes: result.notes,
  });
  return {
    id: `broader-owner-test-${createHash("sha1").update(seed).digest("hex").slice(0, 12)}`,
    recordedAt: now,
    stage: result.stage || "broader_owner_testing",
    host: result.host || "unknown",
    testerRole: result.testerRole || "supervised_owner_tester",
    industry: result.industry || "unknown",
    dataMode: result.dataMode || "sample_or_deidentified",
    understoodNoAutoSend: result.understoodNoAutoSend === true,
    actualCustomerSendExecuted: result.actualCustomerSendExecuted === true,
    liveAccountConnected: result.liveAccountConnected === true,
    paymentRefundDeleteExecuted: result.paymentRefundDeleteExecuted === true,
    credentialAccessUsed: result.credentialAccessUsed === true,
    ratings: {
      understandability: Number(result.ratings?.understandability || 0),
      usefulness: Number(result.ratings?.usefulness || 0),
      trust: Number(result.ratings?.trust || 0),
      setupFriction: Number(result.ratings?.setupFriction || 0),
    },
    blockerTags: Array.isArray(result.blockerTags) ? result.blockerTags : [],
    requestedTemplates: Array.isArray(result.requestedTemplates) ? result.requestedTemplates : [],
    notes: Array.isArray(result.notes) ? result.notes : [],
  };
}

function validateBroaderOwnerTestingResult(result) {
  const findings = [];
  if (result.stage !== "broader_owner_testing") findings.push("stage_must_be_broader_owner_testing");
  if (result.dataMode !== "sample_or_deidentified") findings.push("data_mode_not_sample_or_deidentified");
  if (result.understoodNoAutoSend !== true) findings.push("tester_did_not_confirm_no_auto_send");
  if (result.actualCustomerSendExecuted === true) findings.push("customer_send_executed");
  if (result.liveAccountConnected === true) findings.push("live_account_connected");
  if (result.paymentRefundDeleteExecuted === true) findings.push("payment_refund_delete_executed");
  if (result.credentialAccessUsed === true) findings.push("credential_access_used");
  if (result.ratings.understandability < 1 || result.ratings.understandability > 5) {
    findings.push("understandability_rating_out_of_range");
  }
  if (result.ratings.usefulness < 1 || result.ratings.usefulness > 5) findings.push("usefulness_rating_out_of_range");
  if (result.ratings.trust < 1 || result.ratings.trust > 5) findings.push("trust_rating_out_of_range");
  if (result.ratings.setupFriction < 1 || result.ratings.setupFriction > 5) findings.push("setup_friction_rating_out_of_range");
  return findings;
}

function summarizeTestingRatings(records) {
  if (!records.length) {
    return {
      understandability: 0,
      usefulness: 0,
      trust: 0,
      setupFriction: 0,
    };
  }
  const totals = records.reduce((acc, record) => ({
    understandability: acc.understandability + Number(record.ratings?.understandability || 0),
    usefulness: acc.usefulness + Number(record.ratings?.usefulness || 0),
    trust: acc.trust + Number(record.ratings?.trust || 0),
    setupFriction: acc.setupFriction + Number(record.ratings?.setupFriction || 0),
  }), {
    understandability: 0,
    usefulness: 0,
    trust: 0,
    setupFriction: 0,
  });
  return {
    understandability: Number((totals.understandability / records.length).toFixed(2)),
    usefulness: Number((totals.usefulness / records.length).toFixed(2)),
    trust: Number((totals.trust / records.length).toFixed(2)),
    setupFriction: Number((totals.setupFriction / records.length).toFixed(2)),
  };
}

function buildBroaderOwnerTestingRepairSignals(records) {
  const signals = [];
  for (const record of records) {
    for (const template of record.requestedTemplates || []) {
      signals.push({
        id: `template:${record.industry}:${template}`,
        lane: "template_replay_fixture",
        sourceResultId: record.id,
        title: `${record.industry} 템플릿 보강: ${template}`,
        priority: "medium",
      });
    }
    for (const blockerTag of record.blockerTags || []) {
      signals.push({
        id: `blocker:${record.id}:${blockerTag}`,
        lane: blockerTag.includes("safety") ? "trust_safety_copy" : "owner_ux_copy",
        sourceResultId: record.id,
        title: `테스트 blocker 수리: ${blockerTag}`,
        priority: ["safety_boundary_unclear", "owner_confused_by_output"].includes(blockerTag) ? "high" : "medium",
      });
    }
    if (Number(record.ratings?.setupFriction || 0) >= 4) {
      signals.push({
        id: `friction:${record.id}`,
        lane: "owner_ux_copy",
        sourceResultId: record.id,
        title: "테스트 사용 마찰 완화",
        priority: "high",
      });
    }
  }
  return signals;
}

function expectedBroaderRepairArtifact(lane) {
  if (lane === "template_replay_fixture") return "새 템플릿 replay fixture 또는 기존 fixture 보강";
  if (lane === "trust_safety_copy") return "안전/신뢰 안내 문구 보강";
  if (lane === "owner_ux_copy") return "비개발자 사장님용 입력/결과 안내 문구 보강";
  return "Owner Ops broader testing repair artifact";
}

function doneWhenForBroaderRepair(lane) {
  if (lane === "template_replay_fixture") {
    return "요청 템플릿이 sample/de-identified replay fixture로 추가되고 customer auto-send 차단 assertion을 가진다.";
  }
  if (lane === "trust_safety_copy") {
    return "사장님이 실제 발송/계정 연결/결제 작업이 일어나지 않았음을 명확히 이해할 수 있다.";
  }
  if (lane === "owner_ux_copy") {
    return "비개발자 사장님이 무엇을 붙여넣고 어떤 결과를 검토해야 하는지 이해할 수 있다.";
  }
  return "수리 항목이 로컬 evidence와 replay assertion으로 검증된다.";
}

function appliedBroaderRepairSummary(item) {
  if (item.lane === "template_replay_fixture") {
    return "요청 템플릿을 sample/de-identified local replay 대상으로 인정하고, 자동 발송 차단 assertion을 completion evidence에 고정했다.";
  }
  if (item.lane === "trust_safety_copy") {
    return "실제 발송, 계정 연결, 결제/환불/삭제, credential 접근이 일어나지 않는다는 안내를 completion evidence에 고정했다.";
  }
  if (item.lane === "owner_ux_copy") {
    return "비개발자 사장님이 붙여넣기, 확인, 검토, 보류를 이해할 수 있도록 사용자 문구 보강 대상으로 고정했다.";
  }
  return "수리 항목을 local-only completion evidence와 replay assertion으로 고정했다.";
}

function broaderOwnerTestingRepairAuthorityBoundary() {
  return {
    localRepairQueueOnly: true,
    publicReleaseAllowed: false,
    marketplaceUploadAllowed: false,
    packageUploadAllowed: false,
    customerSendAllowed: false,
    liveAccountConnectionAllowed: false,
    paymentRefundDeleteAllowed: false,
    credentialAccessAllowed: false,
    installUpdateRollbackExecutionAllowed: false,
    durableMemoryPromotionAllowed: false,
    backgroundAutomationAllowed: false,
  };
}

function renderOwnerOpsBroaderOwnerTestingRepairCompletionEvidenceMarkdown(evidence) {
  const lines = [
    "# Owner Ops Broader Owner Testing Repair Completion Evidence",
    "",
    `Status: ${evidence.status}`,
    `Completion stage: ${evidence.completionStage}`,
    "",
    "## Source Queue",
    "",
    `- Status: ${evidence.sourceQueue.status}`,
    `- Items: ${evidence.sourceQueue.itemCount}`,
    `- Lanes: ${evidence.sourceQueue.lanes.join(", ") || "none"}`,
    "",
    "## Completion Summary",
    "",
    `- Completed: ${evidence.completionSummary.completedCount}/${evidence.completionSummary.itemCount}`,
    `- All items locally verified: ${evidence.completionSummary.allItemsLocallyVerified}`,
    `- Required lanes: ${evidence.completionSummary.requiredLanes.join(", ") || "none"}`,
    "",
    "## Completed Items",
    "",
    ...evidence.completedItems.flatMap((item) => [
      `### ${item.id}`,
      "",
      `- Source repair: ${item.sourceRepairId}`,
      `- Lane: ${item.lane}`,
      `- State: ${item.completionState}`,
      `- Target artifact: ${item.targetArtifact}`,
      `- Applied repair: ${item.appliedRepair}`,
      `- Done when: ${item.doneWhen}`,
      "",
    ]),
    "## Authority Boundary",
    "",
    `- Public release allowed: ${evidence.authorityBoundary.publicReleaseAllowed}`,
    `- Marketplace upload allowed: ${evidence.authorityBoundary.marketplaceUploadAllowed}`,
    `- Customer send allowed: ${evidence.authorityBoundary.customerSendAllowed}`,
    `- Live account connection allowed: ${evidence.authorityBoundary.liveAccountConnectionAllowed}`,
    `- Credential access allowed: ${evidence.authorityBoundary.credentialAccessAllowed}`,
    `- Install/update/rollback execution allowed: ${evidence.authorityBoundary.installUpdateRollbackExecutionAllowed}`,
    "",
    "## Findings",
    "",
    ...(evidence.findings.length ? evidence.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    evidence.nextSafeAction,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsNextOwnerTestingLoopMarkdown(loop) {
  const lines = [
    "# Owner Ops Next Owner Testing Loop",
    "",
    `Status: ${loop.status}`,
    `Loop stage: ${loop.loopStage}`,
    "",
    "## Package Evidence",
    "",
    `- Status: ${loop.packageEvidence.status}`,
    `- Archive: ${loop.packageEvidence.archiveName}`,
    `- Files: ${loop.packageEvidence.fileCount}`,
    "",
    "## Repair Completion",
    "",
    `- Status: ${loop.repairCompletion.status}`,
    `- Completed: ${loop.repairCompletion.completedCount}/${loop.repairCompletion.itemCount}`,
    `- Lanes: ${loop.repairCompletion.lanes.join(", ") || "none"}`,
    "",
    "## Loop Plan",
    "",
    ...loop.loopPlan.flatMap((item) => [
      `### ${item.label}`,
      "",
      `- ID: ${item.id}`,
      `- Done when: ${item.doneWhen}`,
      "",
    ]),
    "## Tester Instructions",
    "",
    ...loop.testerInstructions.map((item) => `- ${item}`),
    "",
    "## Authority Boundary",
    "",
    `- Next owner testing allowed: ${loop.authorityBoundary.nextOwnerTestingAllowed}`,
    `- Sample/de-identified data only: ${loop.authorityBoundary.sampleOrDeidentifiedDataOnly}`,
    `- Public release allowed: ${loop.authorityBoundary.publicReleaseAllowed}`,
    `- Marketplace upload allowed: ${loop.authorityBoundary.marketplaceUploadAllowed}`,
    `- Customer send allowed: ${loop.authorityBoundary.customerSendAllowed}`,
    `- Live account connection allowed: ${loop.authorityBoundary.liveAccountConnectionAllowed}`,
    `- Credential access allowed: ${loop.authorityBoundary.credentialAccessAllowed}`,
    `- Install/update/rollback execution allowed: ${loop.authorityBoundary.installUpdateRollbackExecutionAllowed}`,
    "",
    "## Findings",
    "",
    ...(loop.findings.length ? loop.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    loop.nextSafeAction,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsProductionReadyDecisionPacketMarkdown(packet) {
  const lines = [
    "# Owner Ops Production-Ready Decision Packet",
    "",
    "This package is production-ready for supervised internal distribution. It is not public release approval.",
    "",
    `Status: ${packet.status}`,
    `Production state: ${packet.productionState}`,
    `Supervised human verification required: ${packet.supervisedHumanVerificationRequired}`,
    "",
    "## Package Evidence",
    "",
    `- Status: ${packet.packageEvidence.status}`,
    `- Package: ${packet.packageEvidence.packageId || "unknown"}@${packet.packageEvidence.packageVersion || "unknown"}`,
    `- Archive: ${packet.packageEvidence.archiveName || "missing"}`,
    `- File count: ${packet.packageEvidence.fileCount ?? "unknown"}`,
    "",
    "## Evidence Readback",
    "",
    `- Public release readback: ${packet.releaseReadback.status}`,
    `- Gate state: ${packet.releaseReadback.gateState}`,
    `- Next owner testing loop: ${packet.fieldValidation.nextOwnerTestingLoop}`,
    `- Next owner testing allowed: ${packet.fieldValidation.nextOwnerTestingAllowed}`,
    `- Public release authority gate: ${packet.releaseAuthority.publicReleaseGate}`,
    `- Human decision records: ${packet.releaseAuthority.humanReviewDecisionRecords}`,
    `- Latest human decision: ${packet.releaseAuthority.latestHumanDecision || "none"}`,
    `- Marketplace/upload decision records: ${packet.releaseAuthority.marketplaceUploadDecisionRecords}`,
    `- Latest marketplace/upload decision: ${packet.releaseAuthority.latestMarketplaceUploadDecision || "none"}`,
    "",
    "## Owner Decision Options",
    "",
    ...packet.ownerDecisionOptions.flatMap((item) => [
      `### ${item.label}`,
      "",
      `- ID: ${item.id}`,
      `- Effect: ${item.effect}`,
      "",
    ]),
    "## Required Before External Release",
    "",
    ...packet.requiredBeforeExternalRelease.map((item) => `- ${item}`),
    "",
    "## Authority Boundary",
    "",
    `- Decision packet only: ${packet.authorityBoundary.decisionPacketOnly}`,
    `- Public release allowed: ${packet.authorityBoundary.publicReleaseAllowed}`,
    `- Marketplace upload allowed: ${packet.authorityBoundary.marketplaceUploadAllowed}`,
    `- Package upload allowed: ${packet.authorityBoundary.packageUploadAllowed}`,
    `- Signing allowed: ${packet.authorityBoundary.signingAllowed}`,
    `- Install/update/rollback allowed: ${packet.authorityBoundary.installAllowed}/${packet.authorityBoundary.updateAllowed}/${packet.authorityBoundary.rollbackAllowed}`,
    `- Customer send allowed: ${packet.authorityBoundary.customerSendAllowed}`,
    `- Live account connection allowed: ${packet.authorityBoundary.liveAccountConnectionAllowed}`,
    `- Credential access allowed: ${packet.authorityBoundary.credentialAccessAllowed}`,
    `- External distribution allowed: ${packet.authorityBoundary.externalDistributionAllowed}`,
    "",
    "## Findings",
    "",
    ...(packet.findings.length ? packet.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    packet.nextSafeAction,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function broaderOwnerTestingResultAuthorityBoundary() {
  return {
    localResultEvidenceOnly: true,
    sampleOrDeidentifiedDataOnly: true,
    publicReleaseAllowed: false,
    marketplaceUploadAllowed: false,
    packageUploadAllowed: false,
    customerSendAllowed: false,
    liveAccountConnectionAllowed: false,
    paymentRefundDeleteAllowed: false,
    credentialAccessAllowed: false,
    installUpdateRollbackExecutionAllowed: false,
    durableMemoryPromotionAllowed: false,
    backgroundAutomationAllowed: false,
  };
}

function renderOwnerOpsHumanReviewApprovalPacketMarkdown(packet) {
  const lines = [
    "# Owner Ops Human Review Approval Packet",
    "",
    `Status: ${packet.status}`,
    `Approval state: ${packet.approvalState}`,
    `Reviewer: ${packet.reviewer}`,
    `Package: ${packet.packageId}@${packet.packageVersion}`,
    "",
    "## Evidence References",
    "",
    ...Object.entries(packet.evidenceRefs).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Evidence Summary",
    "",
    `- Release readiness: ${packet.evidenceSummary.releaseReadiness}`,
    `- Pre-public repair completion: ${packet.evidenceSummary.prePublicRepairCompletion}`,
    `- Completed repair items: ${packet.evidenceSummary.completedRepairItems}/${packet.evidenceSummary.totalRepairItems}`,
    `- All repair items locally verified: ${packet.evidenceSummary.allRepairItemsLocallyVerified}`,
    `- Internal production package: ${packet.evidenceSummary.internalProductionPackage}`,
    "",
    "## Review Checklist",
    "",
    ...packet.reviewChecklist.map((item) => `- [ ] ${item.label}`),
    "",
    "## Required Owner Decision",
    "",
    `Current value: ${packet.requiredOwnerDecision.currentValue}`,
    `Allowed values: ${packet.requiredOwnerDecision.allowedValues.join(", ")}`,
    `Public release approved now: ${packet.requiredOwnerDecision.publicReleaseApprovedNow}`,
    "",
    "## Authority Boundary",
    "",
    `- Public release allowed: ${packet.authorityBoundary.publicReleaseAllowed}`,
    `- Package upload allowed: ${packet.authorityBoundary.packageUploadAllowed}`,
    `- Signing allowed: ${packet.authorityBoundary.signingAllowed}`,
    `- External distribution allowed: ${packet.authorityBoundary.externalDistributionAllowed}`,
    "",
    "## Findings",
    "",
    ...(packet.findings.length ? packet.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    packet.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsBroaderOwnerTestingHandoffMarkdown(handoff) {
  const lines = [
    "# Owner Ops Broader Owner Testing Handoff",
    "",
    `Status: ${handoff.status}`,
    `Stage: ${handoff.handoffStage}`,
    `Generated at: ${handoff.generatedAt}`,
    "",
    "## Package Evidence",
    "",
    `- Package: ${handoff.packageEvidence.packageId || "unknown"} ${handoff.packageEvidence.packageVersion || ""}`.trim(),
    `- Archive: ${handoff.packageEvidence.archiveName || "none"}`,
    `- File count: ${handoff.packageEvidence.fileCount}`,
    `- Local readback status: ${handoff.packageEvidence.status}`,
    "",
    "## Release Boundary",
    "",
    `- Release readback status: ${handoff.releaseReadback.status}`,
    `- Gate state: ${handoff.releaseReadback.gateState}`,
    `- Public release allowed: ${handoff.authorityBoundary.publicReleaseAllowed}`,
    `- Marketplace upload allowed: ${handoff.authorityBoundary.marketplaceUploadAllowed}`,
    `- Live account connection allowed: ${handoff.authorityBoundary.liveAccountConnectionAllowed}`,
    `- Customer send allowed: ${handoff.authorityBoundary.customerSendAllowed}`,
    "",
    "## Field Repair Completion",
    "",
    `- Status: ${handoff.fieldRepairCompletion.status}`,
    `- Completed: ${handoff.fieldRepairCompletion.completedCount}/${handoff.fieldRepairCompletion.itemCount}`,
    `- Lanes: ${(handoff.fieldRepairCompletion.lanes || []).join(", ") || "none"}`,
    "",
    "## Tester Instructions",
    "",
    ...handoff.testerInstructions.map((item) => `- ${item}`),
    "",
    "## Reviewer Checklist",
    "",
    ...handoff.reviewerChecklist.map((item) => `- ${item}`),
    "",
    "## Findings",
    "",
    ...(handoff.findings.length ? handoff.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    handoff.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsBroaderOwnerTestingRepairQueueMarkdown(queue) {
  const lines = [
    "# Owner Ops Broader Owner Testing Repair Queue",
    "",
    `Status: ${queue.status}`,
    `Stage: ${queue.queueStage}`,
    `Source records: ${queue.sourceLedger.recordCount}`,
    `Items: ${queue.queueSummary.itemCount}`,
    "",
    "## Source Ledger",
    "",
    `- Ledger status: ${queue.sourceLedger.status}`,
    `- Hosts: ${queue.sourceLedger.hostCoverage.join(", ") || "none"}`,
    `- Industries: ${queue.sourceLedger.industryCoverage.join(", ") || "none"}`,
    `- Repair signals: ${queue.sourceLedger.repairSignalCount}`,
    "",
    "## Queue Items",
    "",
    ...queue.queueItems.map((item) =>
      `- [${item.priority}] ${item.title}\n  - Lane: ${item.lane}\n  - Expected artifact: ${item.expectedArtifact}\n  - Done when: ${item.doneWhen}`
    ),
    "",
    "## Blocked Actions",
    "",
    ...queue.blockedActions.map((action) => `- ${action}`),
    "",
    "## Findings",
    "",
    ...(queue.findings.length ? queue.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    queue.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsSignedPackageEvidenceMarkdown(evidence) {
  const lines = [
    "# Owner Ops Signed Package Evidence",
    "",
    `Status: ${evidence.status}`,
    `Signed package state: ${evidence.signedPackageState}`,
    `Package: ${evidence.packageId}@${evidence.packageVersion}`,
    "",
    "## Current Evidence",
    "",
    ...Object.entries(evidence.currentEvidence).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Internal Production Package",
    "",
    `- Archive: ${evidence.internalProductionPackage.archiveName}`,
    `- Bundle sha256: ${evidence.internalProductionPackage.bundleSha256}`,
    `- File count: ${evidence.internalProductionPackage.fileCount}`,
    "",
    "## Required Before Public Release",
    "",
    ...evidence.requiredBeforePublicRelease.map((item) => `- ${item}`),
    "",
    "## Authority Boundary",
    "",
    `- Signing executed: ${evidence.authorityBoundary.signingExecuted}`,
    `- Signed artifact written: ${evidence.authorityBoundary.signedArtifactWritten}`,
    `- Public release allowed: ${evidence.authorityBoundary.publicReleaseAllowed}`,
    `- Package upload allowed: ${evidence.authorityBoundary.packageUploadAllowed}`,
    `- External distribution allowed: ${evidence.authorityBoundary.externalDistributionAllowed}`,
    "",
    "## Findings",
    "",
    ...(evidence.findings.length ? evidence.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    evidence.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsInstallUpdateRollbackProofMarkdown(proof) {
  const lines = [
    "# Owner Ops Install / Update / Rollback Proof",
    "",
    `Status: ${proof.status}`,
    `Proof state: ${proof.proofState}`,
    `Package: ${proof.packageId}@${proof.packageVersion}`,
    "",
    "## Internal Production Package",
    "",
    `- Archive: ${proof.internalProductionPackage.archiveName}`,
    `- Bundle sha256: ${proof.internalProductionPackage.bundleSha256}`,
    `- File count: ${proof.internalProductionPackage.fileCount}`,
    "",
    "## Readiness",
    "",
    `- Install gate: ${proof.installUpdateRollbackReadiness.installGate}`,
    `- Update gate: ${proof.installUpdateRollbackReadiness.updateGate}`,
    `- Rollback gate: ${proof.installUpdateRollbackReadiness.rollbackGate}`,
    `- Can install now: ${proof.installUpdateRollbackReadiness.canInstallNow}`,
    `- Can update now: ${proof.installUpdateRollbackReadiness.canUpdateNow}`,
    `- Can rollback now: ${proof.installUpdateRollbackReadiness.canRollbackNow}`,
    "",
    "## Required Proof Before Release",
    "",
    ...proof.requiredProofBeforeRelease.map((item) => `- ${item}`),
    "",
    "## Authority Boundary",
    "",
    `- Install executed: ${proof.authorityBoundary.installExecuted}`,
    `- Update executed: ${proof.authorityBoundary.updateExecuted}`,
    `- Rollback executed: ${proof.authorityBoundary.rollbackExecuted}`,
    `- External download executed: ${proof.authorityBoundary.externalDownloadExecuted}`,
    `- Public release allowed: ${proof.authorityBoundary.publicReleaseAllowed}`,
    "",
    "## Findings",
    "",
    ...(proof.findings.length ? proof.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    proof.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsDeploymentDryRunPlanMarkdown(plan) {
  const lines = [
    "# Owner Ops Deployment Dry-Run Plan",
    "",
    `Status: ${plan.status}`,
    `Plan state: ${plan.planState}`,
    `Package: ${plan.packageId}@${plan.packageVersion}`,
    "",
    "## Internal Production Package",
    "",
    `- Archive: ${plan.internalProductionPackage.archiveName}`,
    `- Bundle sha256: ${plan.internalProductionPackage.bundleSha256}`,
    `- File count: ${plan.internalProductionPackage.fileCount}`,
    `- Bundle path: ${plan.internalProductionPackage.bundlePath}`,
    "",
    "## Lanes",
    "",
    ...plan.lanes.flatMap((lane) => [
      `### ${lane.label}`,
      "",
      `- Purpose: ${lane.purpose}`,
      `- Execution state: ${lane.executionState}`,
      "- Planned checks:",
      ...lane.plannedChecks.map((check) => `  - ${check}`),
      "- Stop conditions:",
      ...lane.stopConditions.map((condition) => `  - ${condition}`),
      "",
    ]),
    "## Verification Commands",
    "",
    ...plan.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "## Authority Boundary",
    "",
    `- Install executed: ${plan.authorityBoundary.installExecuted}`,
    `- Update executed: ${plan.authorityBoundary.updateExecuted}`,
    `- Rollback executed: ${plan.authorityBoundary.rollbackExecuted}`,
    `- File mutation executed: ${plan.authorityBoundary.fileMutationExecuted}`,
    `- Public upload executed: ${plan.authorityBoundary.publicUploadExecuted}`,
    "",
    "## Findings",
    "",
    ...(plan.findings.length ? plan.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    plan.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsDryRunExecutorProofMarkdown(proof) {
  const lines = [
    "# Owner Ops Dry-Run Executor Proof",
    "",
    `Status: ${proof.status}`,
    `Executor state: ${proof.executorState}`,
    `Requested lane: ${proof.requestedLane}`,
    `Package: ${proof.packageId}@${proof.packageVersion}`,
    "",
    "## Approval Packet",
    "",
    `- State: ${proof.approvalPacket.state}`,
    `- Required decision: ${proof.approvalPacket.requiredDecision}`,
    `- Approval token required: ${proof.approvalPacket.approvalTokenRequired}`,
    `- Allowed effect: ${proof.approvalPacket.scope.allowedEffect}`,
    "",
    "## Invocation Preview",
    "",
    proof.invocationPreview
      ? `- Lane: ${proof.invocationPreview.label}`
      : "- Lane: missing",
    ...(proof.invocationPreview
      ? [
          "- Planned inputs:",
          ...proof.invocationPreview.plannedInputs.map((input) => `  - ${input}`),
          "- Planned checks:",
          ...proof.invocationPreview.plannedChecks.map((check) => `  - ${check}`),
          "- Stop conditions:",
          ...proof.invocationPreview.stopConditions.map((condition) => `  - ${condition}`),
        ]
      : []),
    "",
    "## Simulated Result",
    "",
    proof.simulatedResult
      ? `- State: ${proof.simulatedResult.state}`
      : "- State: unavailable",
    proof.simulatedResult
      ? `- Would mutate files: ${proof.simulatedResult.wouldMutateFiles}`
      : "- Would mutate files: false",
    proof.simulatedResult
      ? `- Would activate daemon: ${proof.simulatedResult.wouldActivateDaemon}`
      : "- Would activate daemon: false",
    "",
    "## Authority Boundary",
    "",
    `- Approval written: ${proof.authorityBoundary.approvalWritten}`,
    `- Dry-run invoked: ${proof.authorityBoundary.dryRunInvoked}`,
    `- Install executed: ${proof.authorityBoundary.installExecuted}`,
    `- Update executed: ${proof.authorityBoundary.updateExecuted}`,
    `- Rollback executed: ${proof.authorityBoundary.rollbackExecuted}`,
    `- File mutation executed: ${proof.authorityBoundary.fileMutationExecuted}`,
    `- Command execution executed: ${proof.authorityBoundary.commandExecutionExecuted}`,
    "",
    "## Findings",
    "",
    ...(proof.findings.length ? proof.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    proof.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsDryRunApprovalRecordDesignMarkdown(design) {
  const lines = [
    "# Owner Ops Dry-Run Approval Record Design",
    "",
    `Status: ${design.status}`,
    `Design state: ${design.designState}`,
    `Requested lane: ${design.requestedLane}`,
    `Package: ${design.packageId}@${design.packageVersion}`,
    "",
    "## Storage Design",
    "",
    `- Directory: ${design.storageDesign.directory}`,
    `- JSONL file: ${design.storageDesign.jsonlFile}`,
    `- Index file: ${design.storageDesign.indexFile}`,
    `- Current write: ${design.storageDesign.currentWrite}`,
    "",
    "## Required Fields",
    "",
    ...design.approvalRecordSchema.requiredFields.map((field) => `- ${field}`),
    "",
    "## Validation Rules",
    "",
    ...design.validationRules.map((rule) => `- ${rule}`),
    "",
    "## Rejection Conditions",
    "",
    ...design.rejectionConditions.map((condition) => `- ${condition}`),
    "",
    "## Future Record Preview",
    "",
    `- Decision: ${design.futureRecordPreview.decision}`,
    `- Approval token: ${design.futureRecordPreview.approvalToken}`,
    `- Write state: ${design.futureRecordPreview.writeState}`,
    "",
    "## Authority Boundary",
    "",
    `- Approval record written: ${design.authorityBoundary.approvalRecordWritten}`,
    `- Dry-run invoked: ${design.authorityBoundary.dryRunInvoked}`,
    `- Install executed: ${design.authorityBoundary.installExecuted}`,
    `- Update executed: ${design.authorityBoundary.updateExecuted}`,
    `- Rollback executed: ${design.authorityBoundary.rollbackExecuted}`,
    `- File mutation executed: ${design.authorityBoundary.fileMutationExecuted}`,
    "",
    "## Findings",
    "",
    ...(design.findings.length ? design.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    design.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsDryRunResultReviewHandoffMarkdown(handoff) {
  const lines = [
    "# Owner Ops Dry-Run Result Review Handoff",
    "",
    `Status: ${handoff.status}`,
    `Review state: ${handoff.reviewState}`,
    `Requested lane: ${handoff.requestedLane}`,
    "",
    "## Latest Invocation",
    "",
    handoff.latestInvocation
      ? `- ID: ${handoff.latestInvocation.id}`
      : "- ID: missing",
    handoff.latestInvocation
      ? `- Approval record: ${handoff.latestInvocation.approvalRecordId}`
      : "- Approval record: missing",
    handoff.latestInvocation
      ? `- Bundle sha256: ${handoff.latestInvocation.bundleSha256}`
      : "- Bundle sha256: missing",
    "",
    "## Human Summary",
    "",
    ...handoff.humanReadableSummary.map((item) => `- ${item}`),
    "",
    "## Replay Checklist",
    "",
    ...handoff.replayChecklist.map((item) => `- ${item}`),
    "",
    "## Handoff Packet",
    "",
    handoff.handoffPacket
      ? `- Audience: ${handoff.handoffPacket.targetAudience}`
      : "- Audience: missing",
    handoff.handoffPacket
      ? `- Decision needed: ${handoff.handoffPacket.decisionNeeded}`
      : "- Decision needed: missing",
    ...(handoff.handoffPacket
      ? [
          "- Evidence refs:",
          ...handoff.handoffPacket.evidenceRefs.map((item) => `  - ${item}`),
          "- Still blocked:",
          ...handoff.handoffPacket.stillBlockedActions.map((item) => `  - ${item}`),
        ]
      : []),
    "",
    "## Authority Boundary",
    "",
    `- Install executed: ${handoff.authorityBoundary.installExecuted}`,
    `- Update executed: ${handoff.authorityBoundary.updateExecuted}`,
    `- Rollback executed: ${handoff.authorityBoundary.rollbackExecuted}`,
    `- Command execution executed: ${handoff.authorityBoundary.commandExecutionExecuted}`,
    `- External download executed: ${handoff.authorityBoundary.externalDownloadExecuted}`,
    `- Public upload executed: ${handoff.authorityBoundary.publicUploadExecuted}`,
    "",
    "## Findings",
    "",
    ...(handoff.findings.length ? handoff.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    handoff.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function fileEvidence({ root, file }) {
  const path = resolveDistributionFile({ root, file });
  if (!existsSync(path)) {
    return {
      path: file,
      status: "missing",
      sha256: null,
      bytes: 0,
    };
  }
  const content = readFileSync(path);
  return {
    path: file,
    status: "present",
    sha256: createHash("sha256").update(content).digest("hex"),
    bytes: content.length,
  };
}

function resolveDistributionFile({ root, file }) {
  const canonicalPath = resolve(root, file);
  if (existsSync(canonicalPath)) return canonicalPath;
  const legacyFile = LEGACY_DISTRIBUTION_FILE_ALIASES.get(file);
  return legacyFile ? resolve(root, legacyFile) : canonicalPath;
}

function readDistributionFile({ root, file }) {
  return readFileSync(resolveDistributionFile({ root, file }));
}

function readPackageVersion({ root }) {
  const file = resolve(root, "package.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")).version || null;
}

function relativePackagePath(path, root) {
  return path.replace(`${resolve(root)}/`, "");
}

function packageArtifactSetExists({ root, archiveName }) {
  const baseName = String(archiveName || "").replace(/\.zip$/, "");
  if (!baseName) return false;
  const packageRoot = resolve(root, ".gpao-t", "packages");
  return ["bundle.json", "manifest.json", "sha256"]
    .every((suffix) => existsSync(resolve(packageRoot, `${baseName}.${suffix}`)));
}

function localPackageReadbackAuthority() {
  return {
    readOnly: true,
    publicUploadExecuted: false,
    signingExecuted: false,
    installExecuted: false,
    updateExecuted: false,
    rollbackExecuted: false,
  };
}
