import test from "node:test";
import assert from "node:assert/strict";

import {
  GPAO_T_RELEASE_CONTRACT,
  assertGpaoTReleaseIdentity,
} from "../src/core/release-contract.js";

test("GPAO-T production release identity is date-based and public-source-prep", () => {
  assert.equal(GPAO_T_RELEASE_CONTRACT.version, "2026.07.15-r3");
  assert.equal(GPAO_T_RELEASE_CONTRACT.distributionChannel, "public-source-prep");
  assert.equal(GPAO_T_RELEASE_CONTRACT.intendedAudience, "public");
  assert.equal(GPAO_T_RELEASE_CONTRACT.sourceVisibilityTarget, "public");
  assert.equal(GPAO_T_RELEASE_CONTRACT.publicRelease, false);
  assert.equal(assertGpaoTReleaseIdentity(GPAO_T_RELEASE_CONTRACT), true);
});

test("GPAO-T release identity rejects non-date versions and channel drift", () => {
  assert.throws(
    () => assertGpaoTReleaseIdentity({ ...GPAO_T_RELEASE_CONTRACT, version: "0.1.0" }),
    /version mismatch/,
  );
  assert.throws(
    () => assertGpaoTReleaseIdentity({ ...GPAO_T_RELEASE_CONTRACT, distributionChannel: "test-team" }),
    /distributionChannel mismatch/,
  );
});
