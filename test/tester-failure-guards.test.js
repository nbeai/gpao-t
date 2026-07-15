import assert from "node:assert/strict";
import test from "node:test";

import {
  buildModelRouterPolicy,
  buildTesterFailureGuardSummary,
  buildToolAuthorityHeart,
  buildTimeoutBudget,
  guardExternalWriteCompletion,
  handleGatewayRequest,
  isolateHeartbeatFailures,
  sanitizeChatSendParams,
  verifyChatSendSanitizer,
  verifyExternalWriteCompletionGuard,
  verifyHeartbeatFailureIsolation,
  verifyModelRouterPolicy,
  verifyTimeoutBudget,
  verifyToolAuthorityHeart,
} from "../src/index.js";

test("chat.send sanitizer strips UI reconnect resume control fields before provider payload", () => {
  const result = sanitizeChatSendParams({
    request: "API 연결 이후 첫 메시지를 보내줘.",
    sessionKey: "agent:main:main",
    model: "gpt-5.5",
    __controlUiReconnectResume: {
      oldToken: "must-not-leak",
    },
    controlUiPanelState: "open",
  });

  assert.equal(result.status, "ready");
  assert.equal(result.payload.request, "API 연결 이후 첫 메시지를 보내줘.");
  assert.equal(result.payload.sessionKey, "agent:main:main");
  assert.equal(result.payload.__controlUiReconnectResume, undefined);
  assert.equal(result.payload.controlUiPanelState, undefined);
  assert.deepEqual(result.strippedControlKeys, ["__controlUiReconnectResume", "controlUiPanelState"]);
  assert.equal(verifyChatSendSanitizer().status, "ready");
});

test("long GitHub clone analysis receives staged timeout budget instead of one blocking call", () => {
  const budget = buildTimeoutBudget({
    request: "깃허브에 연결해서 로컬에 클론 만든 이후 서비스 전체를 파악해 달라.",
    runTimeoutSeconds: 240,
    providerTimeoutSeconds: 120,
    operationTimeoutSeconds: 45,
  });

  assert.equal(budget.status, "ready");
  assert.equal(budget.longContextLikely, true);
  assert.equal(budget.stagedExecutionRequired, true);
  assert.deepEqual(budget.stagedPlan, [
    "file_inventory",
    "package_and_script_map",
    "source_map",
    "risk_map",
    "summary_with_next_actions",
  ]);
  assert.equal(verifyTimeoutBudget({ budget }).status, "ready");

  const mismatch = buildTimeoutBudget({
    request: "로컬 클론 전체 분석",
    runTimeoutSeconds: 60,
    providerTimeoutSeconds: 120,
    operationTimeoutSeconds: 30,
  });
  assert.equal(mismatch.status, "blocked");
  assert.ok(verifyTimeoutBudget({ budget: mismatch }).findings.includes("run_timeout_below_provider_timeout"));
});

test("model router policy carries timeout budget for long-context analysis", () => {
  const policy = buildModelRouterPolicy({
    request: "GitHub repo clone 서비스 전체 코드와 구조를 파악해줘.",
  });

  assert.equal(policy.timeoutBudget.longContextLikely, true);
  assert.equal(policy.timeoutBudget.stagedExecutionRequired, true);
  assert.equal(verifyModelRouterPolicy({ policy }).status, "ready");
});

test("external GitHub push completion is blocked without real receipt", () => {
  const blocked = guardExternalWriteCompletion({
    action: "git.push",
    claim: "푸시 완료했습니다.",
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.canClaimCompletion, false);
  assert.doesNotMatch(blocked.safeClaim, /푸시 완료했습니다/);
  assert.equal(verifyExternalWriteCompletionGuard().status, "ready");

  const ready = guardExternalWriteCompletion({
    action: "git.push",
    claim: "푸시 완료했습니다.",
    receipt: {
      action: "git.push",
      exitCode: 0,
      remote: "https://github.com/nbeai/gpao-t.git",
      branch: "main",
      commit: "abc1234",
      remoteConfirmed: true,
    },
  });

  assert.equal(ready.status, "ready");
  assert.equal(ready.canClaimCompletion, true);
});

test("heartbeat failures are coalesced into Doctor and do not pollute normal chat", () => {
  const isolation = isolateHeartbeatFailures({
    failures: [
      { id: "h1", message: "Heartbeat check failed before it could produce an update." },
      { id: "h2", message: "Heartbeat check failed before it could produce an update." },
      { id: "h3", message: "Heartbeat check failed before it could produce an update." },
    ],
    mainChatStatus: "ready",
    now: "2026-07-15T12:00:00.000Z",
  });

  assert.equal(isolation.status, "isolated");
  assert.equal(isolation.visibleChatMessages.length, 0);
  assert.equal(isolation.doctorEvents.length, 1);
  assert.equal(isolation.doctorEvents[0].count, 3);
  assert.equal(verifyHeartbeatFailureIsolation({ isolation }).status, "ready");
});

test("Tool/Authority Heart includes external write and heartbeat tester guards", () => {
  const heart = buildToolAuthorityHeart({ root: process.cwd() });

  assert.equal(heart.testerFailureGuards.externalWriteCompletionStatus, "blocked");
  assert.equal(heart.testerFailureGuards.externalWriteCanClaimCompletion, false);
  assert.equal(heart.testerFailureGuards.heartbeatIsolationStatus, "isolated");
  assert.equal(heart.testerFailureGuards.heartbeatVisibleChatMessages, 0);
  assert.ok(heart.observations.some((item) => item.id === "external_write_claim_guard_ready"));
  assert.ok(heart.observations.some((item) => item.id === "heartbeat_failure_isolation_ready"));
  assert.equal(verifyToolAuthorityHeart({ heart }).status, "ready");
});

test("Gateway exposes Stage -1 tester failure guards", () => {
  const summary = handleGatewayRequest({ method: "GET", path: "/stage-1/tester-failure-guards" });
  const sanitized = handleGatewayRequest({
    method: "POST",
    path: "/stage-1/chat-send/sanitize",
    body: {
      request: "연결 이후 첫 메시지",
      __controlUiReconnectResume: true,
    },
  });
  const writeGuard = handleGatewayRequest({
    method: "POST",
    path: "/stage-1/external-write/guard",
    body: {
      action: "git.push",
      claim: "푸시 완료했습니다.",
    },
  });

  assert.equal(summary.status, 200);
  assert.equal(summary.body.status, "ready");
  assert.equal(sanitized.status, 200);
  assert.equal(sanitized.body.payload.__controlUiReconnectResume, undefined);
  assert.equal(writeGuard.status, 409);
  assert.equal(writeGuard.body.canClaimCompletion, false);
  assert.equal(buildTesterFailureGuardSummary().status, "ready");
});
