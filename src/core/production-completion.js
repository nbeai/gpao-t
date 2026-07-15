import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApprovalAuditLocalRecordSubstrate } from "./approval-audit-records.js";
import { buildExecutionRuntimePlan, inspectReadOnlyConnector, verifyExecutionRuntimeInvocation } from "./execution-runtime.js";
import { buildFirstLocalWorkLoop, verifyFirstLocalWorkLoop } from "./first-local-work-loop.js";
import { buildInstallHardeningReport } from "./install-hardening.js";
import { buildModelProviderRegistry, invokeModelLocally, verifyModelInvocation } from "./model-invocation.js";
import { buildStage4ProductionHardening, verifyStage4ProductionHardening } from "./stage-4-production-hardening.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const STAGES = [
  {
    id: "stage_5_desktop_product_hardening",
    label: "5단계 Desktop Product Hardening",
    productMeaning: "로컬 앱/데스크톱 제품화에 필요한 소스, 검증, rollback posture, read-only shell 기준을 묶습니다.",
  },
  {
    id: "stage_6_first_production",
    label: "6단계 1차 프로덕션",
    productMeaning: "AI/developer가 첫 작업 루프, 빈 상태, 실패/복구, 모델/도구 경계를 반복 검증합니다.",
  },
  {
    id: "stage_7_internal_production_package",
    label: "7단계 내부 프로덕션 패키지",
    productMeaning: "내부 사용자가 검토할 수 있는 프로덕션 패키지 manifest, 실행 순서, 권한 경계를 준비합니다.",
  },
  {
    id: "stage_8_internal_distribution_readiness",
    label: "8단계 내부 배포 준비",
    productMeaning: "외부 전송 전 내부 배포 패키지, 업데이트/롤백 기준, 승인 경계를 로컬 산출물로 고정합니다.",
  },
];

const LOCAL_RELEASE_FILES = [
  "package.json",
  "README.md",
  "bin/gpao-t.js",
  "src/index.js",
  "src/core/model-invocation.js",
  "src/core/execution-runtime.js",
  "src/core/production-completion.js",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "tauri-shell/index.html",
  "docs/03-engineering/STAGE-4-LOCAL-APP-PRODUCTION-HARDENING.md",
  "docs/03-engineering/FIRST-LOCAL-WORK-LOOP-V1.md",
  "docs/03-engineering/WORK-SURFACE-EXECUTION-GOVERNANCE-FLOW-V1.md",
];

const STILL_APPROVAL_BOUND = [
  "real external OAuth login",
  "real API key storage",
  "paid provider call",
  "external send",
  "public release upload",
  "installer signing/notarization",
  "destructive rollback execution",
  "durable memory promotion",
];

export function buildProductionCompletion({
  root = PROJECT_ROOT,
  now = new Date().toISOString(),
  writePackage = false,
} = {}) {
  const stage5 = buildStage5DesktopProductHardening({ root, now });
  const stage6 = buildStage6FirstProduction({ root, now });
  const stage7 = buildStage7InternalProductionPackage({ root, now, writePackage });
  const stage8 = buildStage8InternalDistributionReadiness({ root, now, internalProductionPackage: stage7 });
  const stages = [stage5, stage6, stage7, stage8];
  const findings = stages.flatMap((stage) => stage.findings.map((finding) => `${stage.id}:${finding}`));

  return {
    schema: "gpao_t.production_completion.v1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    stages,
    stageLabels: STAGES,
    productionBoundary: {
      productionReady: findings.length === 0,
      internalProductionPackagePrepared: stage7.packageStatus === "written_local_only" || stage7.packageStatus === "preview_only",
      internalDistributionPrepared: stage8.status === "ready",
      supervisedHumanVerificationRequired: true,
      externalDistributionExecuted: false,
      realProviderCredentialStored: false,
      publicReleasePublished: false,
    },
    stillApprovalBound: STILL_APPROVAL_BOUND,
    findings,
    nextSafeAction: findings.length
      ? "Repair stage findings before declaring the package production-ready."
      : "Run supervised human verification, then decide whether to open real provider credentials, packaged build, and external distribution.",
  };
}

export function verifyProductionCompletion({
  root = PROJECT_ROOT,
} = {}) {
  const completion = buildProductionCompletion({ root });
  const findings = [...completion.findings];

  if (completion.schema !== "gpao_t.production_completion.v1") findings.push("invalid_schema");
  if (completion.stages.length !== 4) findings.push("stage_count_mismatch");
  if (!completion.stages.every((stage) => stage.status === "ready")) findings.push("stage_not_ready");
  if (completion.productionBoundary.externalDistributionExecuted !== false) findings.push("external_distribution_executed");
  if (completion.productionBoundary.realProviderCredentialStored !== false) findings.push("credential_storage_open");

  return {
    schema: "gpao_t.production_completion_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedStages: completion.stages.map((stage) => stage.id),
    nextSafeAction: findings.length
      ? "Fix stages 5-8 completion findings."
      : "Write the internal production package manifest and keep external distribution behind approval.",
  };
}

export function writeInternalProductionPackage({
  root = PROJECT_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const outputDir = join(root, ".gpao-t", "release");
  mkdirSync(outputDir, { recursive: true });
  const stage7 = buildStage7InternalProductionPackage({ root, now, writePackage: false });
  const stage8 = buildStage8InternalDistributionReadiness({ root, now, internalProductionPackage: stage7 });
  const manifest = {
    schema: "gpao_t.internal_production_package_manifest.v1",
    status: stage7.findings.length || stage8.findings.length ? "review" : "ready",
    generatedAt: now,
    packageName: "GPAO-T Internal Production Package",
    packageVersion: readPackageJson({ root })?.version || "0.1.0",
    includedFiles: stage7.includedFiles,
    installCommand: "npm run verify",
    runCommand: "node bin/gpao-t.js control serve-check",
    firstUseCommand: "node bin/gpao-t.js control work-surface",
    verificationCommands: [
      "npm run verify",
      "node bin/gpao-t.js adapters model-provider-runtime-check",
      "node bin/gpao-t.js connectors execution-invocation-check",
      "node bin/gpao-t.js production stages-5-8-check",
    ],
    authorityBoundary: {
      externalSend: "not_included",
      credentialStorage: "not_included",
      publicRelease: "not_included",
      destructiveRollback: "not_included",
    },
    supervisedHumanVerification: [
      "Open Work Surface first, not the Control Center.",
      "Run local verification before judging product behavior.",
      "Do not add real API keys, OAuth accounts, or external sends without a separate approval pass.",
      "Report friction in speed, session flow, authority wording, and work-loop clarity.",
    ],
  };
  const manifestPath = join(outputDir, "gpao-t-internal-production-package-manifest.json");
  const guidePath = join(outputDir, "INTERNAL-PRODUCTION-README.md");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(guidePath, renderInternalProductionReadme({ manifest }));

  return {
    schema: "gpao_t.internal_production_package_write.v1",
    status: manifest.status === "ready" ? "written_local_only" : "review",
    outputDir,
    manifestPath,
    guidePath,
    manifest,
    externalDistributionExecuted: false,
    nextSafeAction: "Complete supervised human verification of the internal production package, then explicitly approve any real sharing or upload.",
  };
}

export function verifyInternalProductionPackage({
  root = PROJECT_ROOT,
} = {}) {
  const outputDir = join(root, ".gpao-t", "release");
  const currentManifestPath = join(outputDir, "gpao-t-internal-production-package-manifest.json");
  const currentGuidePath = join(outputDir, "INTERNAL-PRODUCTION-README.md");
  const legacyManifestPath = join(outputDir, "gpao-t-team-alpha-package-manifest.json");
  const legacyGuidePath = join(outputDir, "TEAM-ALPHA-README.md");
  const manifestPath = existsSync(currentManifestPath) ? currentManifestPath : legacyManifestPath;
  const guidePath = existsSync(currentGuidePath) ? currentGuidePath : legacyGuidePath;
  const findings = [];

  if (!existsSync(manifestPath)) findings.push("manifest_missing");
  if (!existsSync(guidePath)) findings.push("guide_missing");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.status !== "ready") findings.push("manifest_not_ready");
    if (manifest.authorityBoundary?.externalSend !== "not_included") findings.push("external_send_boundary_missing");
    if (!manifest.verificationCommands?.includes("npm run verify")) findings.push("verify_command_missing");
  }

  return {
    schema: "gpao_t.internal_production_package_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    manifestPath,
    guidePath,
    nextSafeAction: findings.length
      ? "Regenerate the internal production package."
      : "Keep the production-ready package under supervised human verification; external sharing remains a separate approval boundary.",
  };
}

function buildStage5DesktopProductHardening({ root, now }) {
  const stage4 = buildStage4ProductionHardening({ root, sourceRoot: root, now });
  const stage4Check = verifyStage4ProductionHardening({ state: stage4 });
  const install = buildInstallHardeningReport({ root, now });
  const findings = [];

  if (stage4Check.status !== "ready") findings.push("stage_4_hardening_not_ready");
  if (install.status !== "review") findings.push("install_hardening_not_review_ready");
  if (!existsSync(join(root, "src-tauri", "tauri.conf.json"))) findings.push("tauri_config_missing");
  if (!existsSync(join(root, "tauri-shell", "index.html"))) findings.push("tauri_shell_missing");

  return {
    id: "stage_5_desktop_product_hardening",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    checks: {
      stage4: stage4.status,
      installHardening: install.status,
      tauriConfig: existsSync(join(root, "src-tauri", "tauri.conf.json")) ? "present" : "missing",
      tauriShell: existsSync(join(root, "tauri-shell", "index.html")) ? "present" : "missing",
    },
    authorityBoundary: {
      actualTauriBuild: "approval_required",
      installerSigning: "approval_required",
      updateRollbackExecution: "approval_required",
    },
    findings,
  };
}

function buildStage6FirstProduction({ root, now }) {
  const firstLoop = buildFirstLocalWorkLoop({
    root,
    request: "GPAO-T 1차 프로덕션 검증 루프",
    writeRecords: true,
    now,
  });
  const firstLoopCheck = verifyFirstLocalWorkLoop({ loop: firstLoop });
  const providerRegistry = buildModelProviderRegistry();
  const localModel = invokeModelLocally({
    request: "GPAO-T 1차 프로덕션 검증 루프",
    now,
  });
  const modelInvocation = verifyModelInvocation({
    registry: providerRegistry,
    localResult: localModel,
  });
  const executionRuntime = verifyExecutionRuntimeInvocation({ root });
  const findings = [];

  if (firstLoopCheck.status !== "ready") findings.push("first_local_work_loop_not_ready");
  if (modelInvocation.status !== "ready") findings.push("model_invocation_not_ready");
  if (executionRuntime.status !== "ready") findings.push("execution_runtime_not_ready");

  return {
    id: "stage_6_first_production",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    checks: {
      firstLocalWorkLoop: firstLoopCheck.status,
      modelInvocation: modelInvocation.status,
      dryRunExecutionRuntime: executionRuntime.status,
      localRecords: firstLoop.localRecords?.status || null,
    },
    userLoop: {
      request: firstLoop.taskPacket?.userInput?.text,
      modelInvocation: firstLoop.modelInvocation?.status,
      executionDryRunInvocation: firstLoop.executionDryRunInvocation?.status,
      readOnlyConnectorInspection: firstLoop.readOnlyConnectorInspection?.status,
    },
    findings,
  };
}

function buildStage7InternalProductionPackage({ root, now, writePackage }) {
  const includedFiles = LOCAL_RELEASE_FILES.map((file) => ({
    file,
    status: existsSync(join(root, file)) ? "present" : "missing",
  }));
  const missing = includedFiles.filter((file) => file.status !== "present").map((file) => file.file);
  const packageJson = readPackageJson({ root });
  const findings = [];

  if (missing.length) findings.push(`missing_files:${missing.join(",")}`);
  if (packageJson?.name !== "gpao-t") findings.push("package_name_mismatch");
  if (!packageJson?.scripts?.verify) findings.push("verify_script_missing");

  return {
    id: "stage_7_internal_production_package",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    packageStatus: writePackage ? "write_requested" : "preview_only",
    includedFiles,
    internalProductionUsePath: [
      "clone_or_copy_local_package",
      "npm run verify",
      "node bin/gpao-t.js control serve-check",
      "node bin/gpao-t.js control work-surface",
      "record supervised human verification feedback without external sends",
    ],
    comparisonQuestions: [
      "다른 AI 런타임보다 작업 시작이 이해하기 쉬운가?",
      "세션/작업 흐름이 자연스러운가?",
      "권한 경계가 안전하면서도 방해가 적은가?",
      "맥락/스킬/모델/도구 후보가 사용자를 피곤하게 만들지 않는가?",
    ],
    findings,
  };
}

function buildStage8InternalDistributionReadiness({ root, now, internalProductionPackage }) {
  const findings = [];
  const packageReady = internalProductionPackage.status === "ready" || internalProductionPackage.packageStatus === "preview_only";
  const hasGit = existsSync(join(root, ".git"));
  const packageJson = readPackageJson({ root });

  if (!packageReady) findings.push("internal_production_package_not_ready");
  if (!hasGit) findings.push("git_rollback_not_available");
  if (!packageJson?.version) findings.push("version_missing");

  return {
    id: "stage_8_internal_distribution_readiness",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    distributionMode: "local_package_ready_no_external_send",
    version: packageJson?.version || null,
    channels: [
      {
        id: "internal_distribution",
        status: packageReady ? "ready" : "review",
        externalSendExecuted: false,
      },
      {
        id: "external_distribution",
        status: packageReady && hasGit ? "ready_after_explicit_distribution_approval" : "review",
        externalSendExecuted: false,
      },
    ],
    updateRollbackPolicy: {
      updateRequiresVersionManifest: true,
      rollbackRequiresPreviousPackageAndGitReference: true,
      destructiveRollbackRequiresExplicitApproval: true,
    },
    findings,
  };
}

function readPackageJson({ root }) {
  const file = join(root, "package.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function renderInternalProductionReadme({ manifest }) {
  return `# GPAO-T Internal Production Package

Status: ${manifest.status}
Version: ${manifest.packageVersion}

## Run

\`\`\`bash
${manifest.installCommand}
${manifest.runCommand}
${manifest.firstUseCommand}
\`\`\`

## Verification

${manifest.verificationCommands.map((command) => `- \`${command}\``).join("\n")}

## Authority Boundary

- External send: ${manifest.authorityBoundary.externalSend}
- Credential storage: ${manifest.authorityBoundary.credentialStorage}
- Public release: ${manifest.authorityBoundary.publicRelease}
- Destructive rollback: ${manifest.authorityBoundary.destructiveRollback}

## Tester Notes

${manifest.supervisedHumanVerification.map((item) => `- ${item}`).join("\n")}
`;
}

// Undocumented compatibility aliases for the previous maturity labels.
export const buildStages5To8Completion = buildProductionCompletion;
export const verifyStages5To8Completion = verifyProductionCompletion;
export const writeTeamAlphaPackage = writeInternalProductionPackage;
export const verifyTeamAlphaPackage = verifyInternalProductionPackage;
