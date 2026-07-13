import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRuntimeHeartHardening,
  verifyRuntimeHeartHardening,
} from "../src/core/runtime-heart-hardening.js";

const SOURCE_ROOT = fileURLToPath(new URL("..", import.meta.url));

function authReadyFixture() {
  const stateRoot = mkdtempSync(join(tmpdir(), "gpao-t-runtime-heart-"));
  const stateDir = join(stateRoot, ".gpao-t");
  const legacyStateDir = join(stateRoot, ".openclaw");
  const canonicalDir = join(stateDir, "agents", "main", "agent");
  const compatibilityDir = join(legacyStateDir, "agents", "main", "agent");
  mkdirSync(canonicalDir, { recursive: true });
  mkdirSync(compatibilityDir, { recursive: true });
  writeFileSync(join(canonicalDir, "gpao-t-agent.sqlite"), "test-auth-store");
  writeFileSync(join(compatibilityDir, "openclaw-agent.sqlite"), "test-auth-store");
  return { root: SOURCE_ROOT, stateDir, legacyStateDir };
}

test("Runtime Heart Hardening aggregates all five heart gates without opening completion claims", () => {
  const fixture = authReadyFixture();
  const hardening = buildRuntimeHeartHardening(fixture);

  assert.equal(hardening.schema, "gpao_t.runtime_heart_hardening.v1.summary");
  assert.equal(hardening.completionClaimAllowed, false);
  assert.equal(hardening.hearts.providerAuth.completionClaimAllowed, false);
  assert.equal(hardening.hearts.doctorRecovery.completionClaimAllowed, false);
  assert.equal(hardening.hearts.sessionEvent.completionClaimAllowed, false);
  assert.equal(hardening.hearts.memoryContext.completionClaimAllowed, false);
  assert.equal(hardening.hearts.toolAuthority.completionClaimAllowed, false);
  assert.equal(verifyRuntimeHeartHardening({ hardening }).status, "ready");
});

test("Runtime Heart Hardening preserves review state when Doctor/Recovery asks for fresh chat evidence", () => {
  const fixture = authReadyFixture();
  const hardening = buildRuntimeHeartHardening(fixture);

  assert.equal(hardening.status, "review");
  assert.equal(hardening.severity, "P1");
  assert.ok(hardening.observations.some((item) => item.id === "doctor_recovery_gate_review"));
  assert.equal(hardening.userVisibleStatus.language, "gpao_t_user_safe");
});

test("Runtime Heart Hardening verification blocks if a child heart opens completion", () => {
  const fixture = authReadyFixture();
  const hardening = buildRuntimeHeartHardening(fixture);
  const unsafe = {
    ...hardening,
    hearts: {
      ...hardening.hearts,
      toolAuthority: {
        ...hardening.hearts.toolAuthority,
        completionClaimAllowed: true,
      },
    },
  };

  const verification = verifyRuntimeHeartHardening({ hardening: unsafe });
  assert.equal(verification.status, "blocked");
  assert.ok(verification.findings.includes("tool_authority_completion_gate_open"));
});
