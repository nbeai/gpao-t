import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendInstallHardeningReport,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  handleGatewayRequest,
  readInstallHardeningReports,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-install-hardening-"));
}

describe("GPAO-T install/update/rollback hardening", () => {
  it("blocks readiness when required package files are missing", () => {
    const root = tempRoot();
    const report = buildInstallHardeningReport({ root });

    assert.equal(report.schema, "gpao_t.install_hardening_report.v0_1");
    assert.equal(report.status, "blocked");
    assert.ok(report.installGate.missingFiles.includes("package.json"));
    assert.equal(report.application.canInstallNow, false);
    assert.equal(report.authorityBoundary.deployment, "blocked_until_explicit_approval");
  });

  it("reviews the current package without executing install, update, daemon, or rollback", () => {
    const report = buildInstallHardeningReport({ root: ROOT });

    assert.equal(report.status, "review");
    assert.equal(report.package.name, "gpao-t");
    assert.equal(report.package.scripts.verify, true);
    assert.equal(report.installGate.installerExecution, "not_implemented");
    assert.equal(report.updateGate.updateMode, "local_manifest_review_only");
    assert.equal(report.rollbackGate.rollbackExecution, "not_implemented");
    assert.deepEqual(report.authorityBoundary.realExecutorRequirements, [
      "explicit_approval",
      "recovery_evidence",
      "post_operation_verification",
    ]);
    assert.equal(report.application.canInstallNow, false);
    assert.equal(report.application.canUpdateNow, false);
    assert.equal(report.application.canRollbackNow, false);
  });

  it("records hardening reports as local review evidence", () => {
    const root = tempRoot();
    const report = appendInstallHardeningReport({ root, now: "2026-07-08T00:00:00.000Z" });
    const reports = readInstallHardeningReports({ root });
    const summary = buildInstallHardeningSummary({ root });

    assert.equal(report.status, "blocked");
    assert.equal(reports.length, 1);
    assert.equal(summary.schema, "gpao_t.install_hardening_summary.v0_1");
    assert.equal(summary.totalReports, 1);
    assert.equal(summary.latest.id, undefined);
  });

  it("exposes hardening through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "ops", "hardening"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliReport = JSON.parse(cliOutput);
    const report = handleGatewayRequest({ root: ROOT, method: "GET", path: "/ops/install-hardening" });
    const record = handleGatewayRequest({ root: tempRoot(), method: "POST", path: "/ops/install-hardening/record" });
    const history = handleGatewayRequest({ root: tempRoot(), method: "GET", path: "/ops/install-hardening/history" });
    const summary = handleGatewayRequest({ root: ROOT, method: "GET", path: "/ops/install-hardening/summary" });

    assert.equal(cliReport.schema, "gpao_t.install_hardening_report.v0_1");
    assert.equal(report.status, 200);
    assert.equal(record.status, 200);
    assert.equal(history.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(report.body.application.canInstallNow, false);
    assert.equal(summary.body.schema, "gpao_t.install_hardening_summary.v0_1");
  });
});
