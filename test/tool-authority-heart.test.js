import test from "node:test";
import assert from "node:assert/strict";

import {
  buildToolAuthorityHeart,
  verifyToolAuthorityHeart,
} from "../src/core/tool-authority-heart.js";

test("Tool/Authority Heart keeps model output, MCP, connector, and send authority closed", () => {
  const heart = buildToolAuthorityHeart({ root: process.cwd() });

  assert.equal(heart.status, "ready");
  assert.equal(heart.governance.modelOutputIsExecutionAuthority, false);
  assert.equal(heart.authorityBoundary.mcpInvocationNow, false);
  assert.equal(heart.authorityBoundary.connectorActivationNow, false);
  assert.equal(heart.authorityBoundary.externalSendNow, false);
  assert.equal(heart.authorityBoundary.credentialReadWriteNow, false);
  assert.equal(heart.authorityBoundary.destructiveActionNow, false);
  assert.equal(verifyToolAuthorityHeart({ heart }).status, "ready");
});

test("Tool/Authority Heart separates readable connector preview from executable access", () => {
  const heart = buildToolAuthorityHeart({ root: process.cwd() });

  assert.equal(heart.connectors.localReadStatus, "preview");
  assert.equal(heart.connectors.externalSendStatus, "blocked");
  assert.ok(heart.observations.some((item) => item.id === "connector_permission_separation_ready"));
});

test("Tool/Authority Heart blocks risky secret, send, and delete request", () => {
  const heart = buildToolAuthorityHeart({ root: process.cwd() });

  assert.equal(heart.authority.riskyStatus, "needs_approval");
  assert.ok(heart.authority.riskyRequiredApprovals.includes("secret_or_account_boundary"));
  assert.ok(heart.authority.riskyRequiredApprovals.includes("external_send"));
  assert.ok(heart.authority.riskyRequiredApprovals.includes("data_deletion"));
  assert.ok(heart.observations.some((item) => item.id === "authority_decision_blocks_risky_request"));
});

test("Tool/Authority Heart verification blocks if external send boundary opens", () => {
  const heart = buildToolAuthorityHeart({ root: process.cwd() });
  const unsafe = {
    ...heart,
    authorityBoundary: {
      ...heart.authorityBoundary,
      externalSendNow: true,
    },
  };

  const verification = verifyToolAuthorityHeart({ heart: unsafe });
  assert.equal(verification.status, "blocked");
  assert.ok(verification.findings.includes("external_send_open"));
});
