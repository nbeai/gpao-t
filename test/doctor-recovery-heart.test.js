import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDoctorRecoveryHeart,
  verifyDoctorRecoveryHeart,
} from "../src/core/doctor-recovery-heart.js";

test("Doctor/Recovery Heart keeps completion claims closed", () => {
  const heart = buildDoctorRecoveryHeart({
    sourceDoctor: { status: "ready" },
    providerAuthInventory: {
      status: "ready",
      userVisibleState: {
        label: "모델 연결 가능",
        message: "GPAO-T 모델 연결 저장소가 준비되어 있습니다.",
      },
    },
    providerAuthRepairPlan: { status: "no_repair_needed" },
  });

  assert.equal(heart.completionClaimAllowed, false);
  assert.equal(heart.status, "review");
  assert.equal(heart.userVisibleStatus.language, "gpao_t_user_safe");
  assert.ok(heart.observations.some((item) => item.id === "provider_auth_completion_requires_fresh_chat"));
  assert.equal(verifyDoctorRecoveryHeart({ heart }).status, "ready");
});

test("Doctor/Recovery Heart classifies distribution drift as install integrity review", () => {
  const heart = buildDoctorRecoveryHeart({
    installHealth: {
      checks: [
        { id: "distribution", ok: false, reason: "sha256 mismatch" },
        { id: "health", ok: true, status: 200 },
      ],
    },
  });

  assert.equal(heart.status, "review");
  assert.equal(heart.severity, "P1");
  assert.ok(heart.observations.some((item) => item.id === "install_integrity_drift"));
  assert.ok(heart.recoveryPlan.actions.some((item) => item.id === "rebuild_or_reinstall_from_canonical_distribution"));
});

test("Doctor/Recovery Heart separates sandbox loopback failure from product outage", () => {
  const heart = buildDoctorRecoveryHeart({
    installHealth: {
      checks: [
        { id: "health", ok: false, reason: "fetch failed: EPERM 127.0.0.1" },
      ],
    },
  });

  assert.equal(heart.status, "review");
  assert.equal(heart.severity, "P1");
  assert.ok(heart.observations.some((item) => item.id === "loopback_blocked_by_sandbox"));
  assert.ok(heart.recoveryPlan.actions.some((item) => item.id === "rerun_health_outside_sandbox"));
});

test("Doctor/Recovery Heart treats real service health failure as P0", () => {
  const heart = buildDoctorRecoveryHeart({
    installHealth: {
      checks: [
        { id: "health", ok: false, reason: "ECONNREFUSED" },
      ],
    },
  });

  assert.equal(heart.status, "blocked");
  assert.equal(heart.severity, "P0");
  assert.ok(heart.observations.some((item) => item.id === "service_health_unreachable"));
  assert.ok(heart.recoveryPlan.actions.some((item) => item.id === "restart_local_service_after_backup"));
});

test("Doctor/Recovery Heart blocks on provider auth inventory repair requirement", () => {
  const heart = buildDoctorRecoveryHeart({
    providerAuthInventory: {
      status: "repair_required",
      userVisibleState: {
        label: "모델 연결 복구 필요",
        message: "GPAO-T 모델 연결 저장소가 맞지 않습니다.",
      },
    },
    providerAuthRepairPlan: { status: "copy_required" },
  });

  assert.equal(heart.status, "blocked");
  assert.equal(heart.severity, "P0");
  assert.ok(heart.observations.some((item) => item.id === "provider_auth_inventory_repair_required"));
  assert.ok(heart.recoveryPlan.actions.some((item) => item.id === "run_provider_auth_repair_plan"));
});
