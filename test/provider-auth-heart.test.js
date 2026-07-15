import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildProviderAuthHeartContract,
  buildProviderAuthRepairPlan,
  inspectProviderAuthStores,
  verifyProviderAuthHeart,
  handleGatewayRequest,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempState() {
  return mkdtempSync(join(tmpdir(), "gpao-t-provider-auth-heart-"));
}

function writeStore(path, value = "sqlite-placeholder") {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, value);
}

function storePath(root, name) {
  return join(root, "agents", "main", "agent", name);
}

describe("Provider/Auth Heart", () => {
  it("defines the active store under the GPAO-T state root without making compatibility identity user-facing", () => {
    const stateDir = tempState();
    const legacyStateDir = tempState();
    const contract = buildProviderAuthHeartContract({ stateDir, legacyStateDir });

    assert.equal(contract.schema, "gpao_t.provider_auth_heart_contract.v1");
    assert.equal(contract.canonicalStateRoot, stateDir);
    assert.equal(contract.activeRuntimeStore, storePath(stateDir, "gpao-t-agent.sqlite"));
    assert.equal(contract.canonicalStore, storePath(stateDir, "gpao-t-agent.sqlite"));
    assert.equal(contract.runtimeCompatibilityStore, storePath(stateDir, "openclaw-agent.sqlite"));
    assert.equal(contract.productNamedMirror, storePath(stateDir, "gpao-t-agent.sqlite"));
    assert.equal(contract.productBoundary.userFacingName, "GPAO-T");
    assert.equal(contract.productBoundary.openClawVisibleToUser, false);
    assert.equal(contract.invariants.canonicalStoreNameIsGpaoT, true);
    assert.equal(contract.invariants.runtimeCompatibilityStoreIsMirrorOnly, true);
    assert.equal(contract.invariants.freshChatRequiredAfterRepair, true);
    assert.equal(contract.invariants.health200IsNotCompletion, true);
  });

  it("detects repairable split auth state without reading or recording secret values", () => {
    const stateDir = tempState();
    const legacyStateDir = tempState();
    writeStore(storePath(stateDir, "openclaw-agent.sqlite"), "portable-profile");
    const inventory = inspectProviderAuthStores({ stateDir, legacyStateDir });
    const repairPlan = buildProviderAuthRepairPlan({ inventory });
    const verification = verifyProviderAuthHeart({ inventory, repairPlan });

    assert.equal(inventory.status, "repair_required");
    assert.equal(inventory.findings.includes("active_auth_store_missing"), true);
    assert.equal(inventory.findings.includes("repairable_from_compatibility_store"), true);
    assert.equal(inventory.secretSafety.readsSecretValues, false);
    assert.equal(inventory.secretSafety.recordsSecretValues, false);
    assert.equal(repairPlan.status, "repair_available");
    assert.equal(repairPlan.requiredApplyGate, true);
    assert.equal(repairPlan.actions[0].id, "copy_compatibility_store_to_canonical_gpao_t_store");
    assert.equal(repairPlan.requiredVerificationAfterRepair.includes("fresh_chat_turn"), true);
    assert.equal(repairPlan.forbiddenActions.includes("print_api_key_or_oauth_token"), true);
    assert.equal(verification.status, "ready");
    assert.equal(verification.completionClaimAllowed, false);
  });

  it("keeps completion blocked even when canonical metadata is present", () => {
    const stateDir = tempState();
    const legacyStateDir = tempState();
    writeStore(storePath(stateDir, "gpao-t-agent.sqlite"), "portable-profile");
    const inventory = inspectProviderAuthStores({ stateDir, legacyStateDir });
    const repairPlan = buildProviderAuthRepairPlan({ inventory });
    const verification = verifyProviderAuthHeart({ inventory, repairPlan });

    assert.equal(inventory.status, "ready");
    assert.equal(inventory.userVisibleState.status, "connected_candidate");
    assert.equal(repairPlan.status, "repair_available");
    assert.equal(repairPlan.actions[0].id, "create_internal_runtime_compatibility_mirror");
    assert.equal(verification.status, "ready");
    assert.equal(verification.completionClaimAllowed, false);
    assert.match(verification.completionClaimReason, /fresh chat/i);
  });

  it("does not treat a stale internal compatibility mirror as an auth outage", () => {
    const stateDir = tempState();
    const legacyStateDir = tempState();
    writeStore(storePath(stateDir, "gpao-t-agent.sqlite"), "canonical-profile");
    writeStore(storePath(stateDir, "openclaw-agent.sqlite"), "different-compatibility-profile");
    const inventory = inspectProviderAuthStores({ stateDir, legacyStateDir });
    const repairPlan = buildProviderAuthRepairPlan({ inventory });

    assert.equal(inventory.status, "ready");
    assert.equal(inventory.findings.includes("runtime_compatibility_mirror_stale_after_runtime_activity"), true);
    assert.equal(repairPlan.status, "repair_available");
    assert.equal(repairPlan.actions[0].id, "refresh_internal_runtime_compatibility_mirror");
  });

  it("exposes Provider/Auth Heart through gateway and CLI readback", () => {
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/runtime/provider-auth-heart/verify",
    });
    const cli = JSON.parse(execFileSync(process.execPath, [CLI, "adapters", "provider-auth-heart-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, "gpao_t.provider_auth_heart.v1.verification");
    assert.equal(cli.schema, "gpao_t.provider_auth_heart.v1.verification");
    assert.equal(cli.completionClaimAllowed, false);
  });
});
