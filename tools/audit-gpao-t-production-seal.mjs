#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { auditGpaoTCompleteSeal } from "./audit-gpao-t-complete-seal.mjs";
import { auditGpaoTRuntimeNamespace } from "./audit-gpao-t-runtime-namespace.mjs";
import { auditLivePatchReproducibility } from "./audit-live-patch-reproducibility.mjs";
import { buildSourceEvidenceGroupAudit } from "./audit-source-evidence-groups.mjs";
import { runGpaoTDashboardRouteCrawl } from "./run-gpao-t-dashboard-route-crawl.mjs";
import {
  MANIFEST_NAME,
  extractZipArchive,
  validateContainedSymlinks,
  verifyArchiveChecksum,
  verifyCurrentSourceBuild,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGE_ROOT = join(REPO_ROOT, ".gpao-t", "releases");
const PACKAGE_BASE = "gpao-t-0.1.0";
const RUNTIME_SOURCE_BUILD =
  process.env.GPAO_T_RUNTIME_SOURCE_BUILD ||
  join(homedir(), ".gpao-t", "current", "compatibility", "gpao-t");

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

async function auditDistributionPackageIntegrity({ packageRoot, packageBase }) {
  const archive = join(packageRoot, `${packageBase}.zip`);
  const archiveSha = join(packageRoot, `${packageBase}.zip.sha256`);
  const distributionRoot = join(packageRoot, packageBase);
  const manifestPath = join(distributionRoot, MANIFEST_NAME);
  const required = { archive, archiveSha, distributionRoot, manifest: manifestPath };
  const missing = Object.entries(required)
    .filter(([, path]) => !existsSync(path))
    .map(([id, path]) => ({ id, path }));
  if (missing.length) {
    return {
      schema: "gpao_t.package_integrity_audit.v0_2",
      format: "production_distribution",
      status: "blocked",
      packageRoot,
      packageBase,
      missing,
      checks: [],
      completionRule: "ready requires the current production distribution directory, manifest, ZIP, checksum, source-tree match, and extracted manifest verification.",
    };
  }

  const workRoot = await mkdtemp(join(tmpdir(), "gpao-t-final-package-audit-"));
  try {
    const archiveSha256 = await verifyArchiveChecksum(archive, archiveSha);
    const extractedRoot = await extractZipArchive(archive, join(workRoot, "extract"));
    await validateContainedSymlinks(extractedRoot);
    const [{ manifest, runtimeRecords }, installed] = await Promise.all([
      verifyDistributionManifest(extractedRoot),
      verifyDistributionManifest(distributionRoot),
    ]);
    const currentSourceBuildSha256 = await verifyCurrentSourceBuild({
      sourceBuild: RUNTIME_SOURCE_BUILD,
      runtimeRecords,
      provenance: manifest.runtimeProvenance,
    });
    const extractedManifestSha256 = await sha256File(join(extractedRoot, MANIFEST_NAME));
    const installedManifestSha256 = await sha256File(manifestPath);
    const checks = [
      {
        id: "archive_sha256",
        status: "ready",
        actual: archiveSha256,
        file: basename(archive),
      },
      {
        id: "extracted_manifest",
        status: extractedManifestSha256 === installedManifestSha256 ? "ready" : "blocked",
        expected: installedManifestSha256,
        actual: extractedManifestSha256,
        file: MANIFEST_NAME,
      },
      {
        id: "source_runtime_tree",
        status:
          currentSourceBuildSha256 === manifest.runtimeProvenance.sourceBuildTreeSha256 &&
          manifest.runtimeProvenance.sourceBuildTreeSha256 ===
            manifest.runtimeProvenance.runtimeStageTreeSha256
            ? "ready"
            : "blocked",
        expected: manifest.runtimeProvenance.sourceBuildTreeSha256,
        actual: currentSourceBuildSha256,
      },
      {
        id: "distribution_manifest",
        status:
          manifest.fileCount === installed.manifest.fileCount && manifest.fileCount > 0
            ? "ready"
            : "blocked",
        actual: manifest.fileCount,
        file: MANIFEST_NAME,
      },
    ];
    return {
      schema: "gpao_t.package_integrity_audit.v0_2",
      format: "production_distribution",
      generatedAt: new Date().toISOString(),
      status: checks.some((check) => check.status !== "ready") ? "blocked" : "ready",
      packageRoot,
      packageBase,
      archive: { path: archive, sha256: archiveSha256 },
      manifest: {
        path: manifestPath,
        schema: manifest.schema,
        version: manifest.version,
        fileCount: manifest.fileCount,
        sourceBuildTreeSha256: manifest.runtimeProvenance.sourceBuildTreeSha256,
        runtimeStageTreeSha256: manifest.runtimeProvenance.runtimeStageTreeSha256,
      },
      checks,
      completionRule: "ready requires the current production distribution directory, manifest, ZIP, checksum, source-tree match, and extracted manifest verification.",
    };
  } catch (error) {
    return {
      schema: "gpao_t.package_integrity_audit.v0_2",
      format: "production_distribution",
      status: "blocked",
      packageRoot,
      packageBase,
      error: error instanceof Error ? error.message : String(error),
      checks: [],
      completionRule: "ready requires the current production distribution directory, manifest, ZIP, checksum, source-tree match, and extracted manifest verification.",
    };
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

async function auditLegacyLocalBundleIntegrity({ packageRoot, packageBase }) {
  const archive = join(packageRoot, `${packageBase}.zip`);
  const archiveSha = join(packageRoot, `${packageBase}.zip.sha256`);
  const manifest = join(packageRoot, `${packageBase}.manifest.json`);
  const bundle = join(packageRoot, `${packageBase}.bundle.json`);
  const files = { archive, archiveSha, manifest, bundle };
  const missing = Object.entries(files)
    .filter(([, path]) => !existsSync(path))
    .map(([id, path]) => ({ id, path }));

  if (missing.length) {
    return {
      schema: "gpao_t.package_integrity_audit.v0_1",
      status: "blocked",
      packageRoot,
      packageBase,
      missing,
      checks: [],
      completionRule:
        "ready requires archive, sha256 receipt, manifest, and bundle files to exist and the archive hash to match its receipt.",
    };
  }

  const expectedLine = (await readFile(archiveSha, "utf8")).trim();
  const expectedArchiveSha = expectedLine.split(/\s+/)[0];
  const actualArchiveSha = await sha256File(archive);
  const manifestJson = JSON.parse(await readFile(manifest, "utf8"));
  const bundleJson = JSON.parse(await readFile(bundle, "utf8"));
  const checks = [
    {
      id: "archive_sha256",
      status: expectedArchiveSha === actualArchiveSha ? "ready" : "blocked",
      expected: expectedArchiveSha,
      actual: actualArchiveSha,
      file: basename(archive),
    },
    {
      id: "manifest_archive_name",
      status: manifestJson.archiveName === basename(archive) ? "ready" : "blocked",
      expected: basename(archive),
      actual: manifestJson.archiveName || null,
      file: basename(manifest),
    },
    {
      id: "manifest_bundle_file",
      status: manifestJson.bundleFile === basename(bundle) ? "ready" : "blocked",
      expected: basename(bundle),
      actual: manifestJson.bundleFile || null,
      file: basename(manifest),
    },
    {
      id: "manifest_file_count",
      status: Number.isInteger(manifestJson.fileCount) && manifestJson.fileCount > 0 ? "ready" : "blocked",
      actual: manifestJson.fileCount ?? null,
      file: basename(manifest),
    },
    {
      id: "bundle_schema",
      status: typeof bundleJson === "object" && bundleJson !== null ? "ready" : "blocked",
      file: basename(bundle),
    },
  ];

  return {
    schema: "gpao_t.package_integrity_audit.v0_1",
    generatedAt: new Date().toISOString(),
    status: checks.some((check) => check.status !== "ready") ? "blocked" : "ready",
    packageRoot,
    packageBase,
    archive: {
      path: archive,
      sha256: actualArchiveSha,
    },
    manifest: {
      path: manifest,
      schema: manifestJson.schema || null,
      packageId: manifestJson.packageId || null,
      packageVersion: manifestJson.packageVersion || null,
      fileCount: manifestJson.fileCount || null,
    },
    checks,
    completionRule:
      "ready requires archive, sha256 receipt, manifest, and bundle files to exist and the archive hash to match its receipt.",
  };
}

export async function auditPackageIntegrity({
  packageRoot = PACKAGE_ROOT,
  packageBase = PACKAGE_BASE,
} = {}) {
  return existsSync(join(packageRoot, packageBase, MANIFEST_NAME))
    ? await auditDistributionPackageIntegrity({ packageRoot, packageBase })
    : await auditLegacyLocalBundleIntegrity({ packageRoot, packageBase });
}

function summarizeGate(id, report, acceptedStatuses = ["ready"]) {
  const status = report?.status || "missing";
  return {
    id,
    status,
    accepted: acceptedStatuses.includes(status),
  };
}

function buildGateSummary(reports) {
  const gates = [
    summarizeGate("user_surface_identity", reports.completeSeal),
    summarizeGate("dashboard_routes", reports.dashboardRoutes),
    summarizeGate("live_patch_reproducibility", reports.livePatches),
    summarizeGate("source_evidence_ownership", reports.sourceGroups),
    summarizeGate("package_integrity", reports.packageIntegrity),
    summarizeGate("runtime_namespace", reports.runtimeNamespace),
  ];
  const routeReadbackBlockers = reports.dashboardRoutes?.findings?.length
    ? [
        {
          id: "authenticated_route_readback",
          severity: "P0",
          status: "blocked",
          description:
            "Every user-accessible dashboard route requires a fresh authenticated DOM and visual readback before completion.",
          findings: reports.dashboardRoutes.findings,
        },
      ]
    : [];
  const hardBlockers = [
    ...gates.filter((gate) => !gate.accepted),
    ...routeReadbackBlockers,
  ];
  const rebuildDebt =
    reports.runtimeNamespace?.status === "bundle_alias_bridge_ready_rebuild_required"
      ? [
          {
            id: "runtime_namespace_rebuild",
            severity: "P1",
            status: "blocked_until_source_rebuild_and_live_readback",
            description:
              "Built runtime chunks still contain inherited OpenClaw namespace identifiers, but GPAO-T alias bridge and compatibility mirrors are present. Full standalone purity requires a source rebuild pass.",
            evidence: {
              hitCount: reports.runtimeNamespace.hitCount,
              byRisk: reports.runtimeNamespace.byRisk,
              migrationEvidence: reports.runtimeNamespace.migrationEvidence,
            },
          },
        ]
      : [];
  return {
    gates,
    hardBlockers,
    acceptedDebts: [],
    blockingDebts: rebuildDebt,
  };
}

export async function buildProductionSeal({
  repoRoot = REPO_ROOT,
  strictStandalone = true,
  includeLive = true,
} = {}) {
  const porcelain = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const reports = {
    completeSeal: await auditGpaoTCompleteSeal({ repoRoot, includeLive }),
    dashboardRoutes: await runGpaoTDashboardRouteCrawl(),
    runtimeNamespace: await auditGpaoTRuntimeNamespace(),
    livePatches: await auditLivePatchReproducibility({ repoRoot }),
    sourceGroups: buildSourceEvidenceGroupAudit({ porcelain, repoRoot }),
    packageIntegrity: await auditPackageIntegrity(),
  };
  const summary = buildGateSummary(reports);
  const standaloneBlocked =
    strictStandalone && reports.runtimeNamespace.status !== "ready";
  const status = summary.hardBlockers.length
    ? "blocked"
    : standaloneBlocked
      ? "standalone_rebuild_required"
      : "production_ready";

  return {
    schema: "gpao_t.production_seal.v1",
    generatedAt: new Date().toISOString(),
    repoRoot,
    status,
    strictStandalone,
    productState:
      status === "blocked"
        ? "not_ready"
        : "GPAO-T 0.1.0 is production-ready for internal distribution with source-built runtime identity, authenticated route evidence, reproducible installation, rollback proof, and package integrity. Public release and external distribution remain separate authority gates.",
    gateSummary: summary,
    reports,
    completionRule:
      "This seal closes only when user-visible identity, every authenticated route, live reproducibility, source ownership, package integrity, and source-built GPAO-T runtime namespace all pass with no accepted product debt.",
  };
}

async function main() {
  const repoRoot = readArg("--repo-root", REPO_ROOT);
  const out = readArg("--out", "");
  const strictStandalone = !hasArg("--allow-incomplete-compatibility");
  const report = await buildProductionSeal({ repoRoot, strictStandalone });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, json);
  }
  console.log(json);
  if (report.status === "blocked" || report.status === "standalone_rebuild_required") {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
