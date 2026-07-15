import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { handleGatewayRequest } from "../src/index.js";
import {
  buildProductionCompletion,
  verifyProductionCompletion,
  verifyInternalProductionPackage,
  writeInternalProductionPackage,
} from "../src/core/production-completion.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T production completion", () => {
  it("reports production-ready while keeping external distribution closed", () => {
    const completion = buildProductionCompletion({ root: ROOT });
    const verification = verifyProductionCompletion({ root: ROOT });

    assert.equal(completion.schema, "gpao_t.production_completion.v1");
    assert.equal(completion.status, "ready");
    assert.equal(completion.stages.length, 4);
    assert.equal(completion.productionBoundary.productionReady, true);
    assert.equal(completion.productionBoundary.supervisedHumanVerificationRequired, true);
    assert.equal(completion.productionBoundary.externalDistributionExecuted, false);
    assert.equal(completion.productionBoundary.realProviderCredentialStored, false);
    assert.ok(completion.stillApprovalBound.includes("paid provider call"));
    assert.ok(completion.stillApprovalBound.includes("public release upload"));
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("writes and verifies an internal production package manifest", () => {
    const result = writeInternalProductionPackage({ root: ROOT, now: "2026-07-09T00:00:00.000Z" });
    const verification = verifyInternalProductionPackage({ root: ROOT });

    assert.equal(result.schema, "gpao_t.internal_production_package_write.v1");
    assert.equal(result.status, "written_local_only");
    assert.equal(result.externalDistributionExecuted, false);
    assert.equal(existsSync(result.manifestPath), true);
    assert.equal(existsSync(result.guidePath), true);
    assert.equal(result.manifest.authorityBoundary.externalSend, "not_included");
    assert.equal(result.manifest.verificationCommands.includes("npm run verify"), true);
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("exposes production completion through CLI and Gateway", () => {
    const cliCompletion = JSON.parse(execFileSync(process.execPath, [CLI, "production", "completion"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "production", "completion-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliAlpha = JSON.parse(execFileSync(process.execPath, [CLI, "production", "internal-production-package"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliAlphaCheck = JSON.parse(execFileSync(process.execPath, [CLI, "production", "internal-production-package-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayCompletion = handleGatewayRequest({ root: ROOT, method: "GET", path: "/production/completion" });
    const gatewayCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/production/completion/verify" });
    const gatewayAlpha = handleGatewayRequest({ root: ROOT, method: "POST", path: "/production/internal-production-package" });
    const gatewayAlphaCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/production/internal-production-package/verify" });

    assert.equal(cliCompletion.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliAlpha.status, "written_local_only");
    assert.equal(cliAlphaCheck.status, "ready");
    assert.equal(gatewayCompletion.status, 200);
    assert.equal(gatewayCompletion.body.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(gatewayAlpha.status, 200);
    assert.equal(gatewayAlpha.body.status, "written_local_only");
    assert.equal(gatewayAlphaCheck.status, 200);
    assert.equal(gatewayAlphaCheck.body.status, "ready");
  });
});
