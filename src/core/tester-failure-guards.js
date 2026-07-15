const CHAT_SEND_ALLOWED_FIELDS = new Set([
  "messages",
  "message",
  "input",
  "request",
  "session",
  "sessionId",
  "sessionKey",
  "model",
  "modelId",
  "provider",
  "providerId",
  "tools",
  "toolChoice",
  "context",
  "metadata",
  "stream",
  "temperature",
  "maxTokens",
  "timeoutSeconds",
]);

const CONTROL_FIELD_PATTERNS = [
  /^__/,
  /controlUi/i,
  /reconnect/i,
  /resume/i,
  /browserOnly/i,
  /csrf/i,
  /sessionToken/i,
];

const RECEIPT_REQUIRED_ACTIONS = new Set([
  "git.push",
  "github.push",
  "github.release.publish",
  "release.publish",
  "external.write",
  "external.send",
  "deploy",
]);

export function sanitizeChatSendParams(params = {}) {
  const input = isPlainObject(params) ? params : {};
  const payload = {};
  const stripped = [];

  for (const [key, value] of Object.entries(input)) {
    if (CHAT_SEND_ALLOWED_FIELDS.has(key) && !isControlField(key)) {
      payload[key] = value;
      continue;
    }
    stripped.push(key);
  }

  return {
    schema: "gpao_t.chat_send_sanitized_payload.v1",
    status: "ready",
    payload,
    strippedControlKeys: stripped.sort(),
    providerSafe: true,
    userVisibleRecovery: stripped.length
      ? "요청 내부 제어값을 정리한 뒤 안전한 형식으로 다시 보냅니다."
      : "요청 형식이 안전합니다.",
  };
}

export function verifyChatSendSanitizer({
  params = {
    request: "GPAO-T 상태를 알려줘.",
    sessionKey: "agent:main:main",
    model: "gpt-5.5",
    __controlUiReconnectResume: true,
  },
} = {}) {
  const sanitized = sanitizeChatSendParams(params);
  const findings = [];
  for (const key of Object.keys(sanitized.payload)) {
    if (!CHAT_SEND_ALLOWED_FIELDS.has(key)) findings.push(`unexpected_payload_key:${key}`);
    if (isControlField(key)) findings.push(`control_key_leaked:${key}`);
  }
  if (!sanitized.strippedControlKeys.includes("__controlUiReconnectResume")) {
    findings.push("control_reconnect_resume_not_stripped");
  }
  if (sanitized.payload.__controlUiReconnectResume !== undefined) {
    findings.push("control_reconnect_resume_leaked");
  }

  return {
    schema: "gpao_t.chat_send_sanitizer_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    sanitized,
  };
}

export function buildTimeoutBudget({
  request = "",
  runTimeoutSeconds = 180,
  providerTimeoutSeconds = 90,
  operationTimeoutSeconds = 30,
  toolTimeoutSeconds = operationTimeoutSeconds,
} = {}) {
  const text = String(request || "");
  const heavySignals = [
    "clone",
    "repository",
    "repo",
    "github",
    "전체",
    "파악",
    "분석",
    "서비스",
    "코드",
  ];
  const longContextLikely = heavySignals.some((signal) => text.toLowerCase().includes(signal.toLowerCase()));
  const mismatch = !(
    Number(runTimeoutSeconds) >= Number(providerTimeoutSeconds)
    && Number(providerTimeoutSeconds) >= Number(operationTimeoutSeconds)
    && Number(providerTimeoutSeconds) >= Number(toolTimeoutSeconds)
  );

  return {
    schema: "gpao_t.runtime_timeout_budget.v1",
    status: mismatch ? "blocked" : "ready",
    runTimeoutSeconds: Number(runTimeoutSeconds),
    providerTimeoutSeconds: Number(providerTimeoutSeconds),
    operationTimeoutSeconds: Number(operationTimeoutSeconds),
    toolTimeoutSeconds: Number(toolTimeoutSeconds),
    longContextLikely,
    stagedExecutionRequired: longContextLikely,
    stagedPlan: longContextLikely ? [
      "file_inventory",
      "package_and_script_map",
      "source_map",
      "risk_map",
      "summary_with_next_actions",
    ] : [],
    userVisibleRecovery: mismatch
      ? "작업 제한 시간이 서로 맞지 않아 먼저 실행 시간 설정을 정리해야 합니다."
      : longContextLikely
        ? "큰 저장소 분석은 한 번에 멈추지 않도록 단계별로 나누어 진행합니다."
        : "현재 요청은 일반 실행 시간 안에서 처리할 수 있습니다.",
  };
}

export function verifyTimeoutBudget({
  budget = buildTimeoutBudget({
    request: "GitHub에서 로컬에 clone한 서비스 전체를 파악해줘.",
  }),
} = {}) {
  const findings = [];
  if (budget.runTimeoutSeconds < budget.providerTimeoutSeconds) findings.push("run_timeout_below_provider_timeout");
  if (budget.providerTimeoutSeconds < budget.operationTimeoutSeconds) findings.push("provider_timeout_below_operation_timeout");
  if (budget.providerTimeoutSeconds < budget.toolTimeoutSeconds) findings.push("provider_timeout_below_tool_timeout");
  if (budget.longContextLikely && !budget.stagedExecutionRequired) findings.push("long_context_not_staged");
  if (budget.longContextLikely && (budget.stagedPlan || []).length < 5) findings.push("staged_repo_scan_plan_incomplete");

  return {
    schema: "gpao_t.runtime_timeout_budget_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    budget,
  };
}

export function guardExternalWriteCompletion({
  action = "git.push",
  claim = "",
  receipt,
} = {}) {
  const normalizedAction = String(action || "").trim();
  const requiresReceipt = RECEIPT_REQUIRED_ACTIONS.has(normalizedAction) || normalizedAction.includes("push");
  const receiptOk = hasValidExternalWriteReceipt({ action: normalizedAction, receipt });
  const canClaimCompletion = !requiresReceipt || receiptOk;
  const safeClaim = canClaimCompletion
    ? String(claim || receipt?.summary || "실행 증거가 확인되었습니다.")
    : "아직 원격 반영으로 확인되지 않았습니다. 실제 실행 영수증과 원격 확인이 필요합니다.";

  return {
    schema: "gpao_t.external_write_completion_guard.v1",
    status: canClaimCompletion ? "ready" : "blocked",
    action: normalizedAction,
    requiresReceipt,
    receiptOk,
    canClaimCompletion,
    safeClaim,
    requiredReceiptFields: requiresReceipt ? [
      "action",
      "exitCode",
      "remote",
      "branch",
      "commit",
      "remoteConfirmed",
    ] : [],
  };
}

export function verifyExternalWriteCompletionGuard({
  action = "git.push",
  claim = "푸시 완료했습니다.",
  receipt,
} = {}) {
  const guard = guardExternalWriteCompletion({ action, claim, receipt });
  const findings = [];
  if (guard.requiresReceipt && guard.canClaimCompletion && !guard.receiptOk) {
    findings.push("completion_claim_without_receipt");
  }
  if (!receipt && guard.status !== "blocked") findings.push("missing_receipt_not_blocked");
  if (!receipt && /완료|pushed|push complete/i.test(guard.safeClaim)) {
    findings.push("unsafe_completion_language_without_receipt");
  }

  return {
    schema: "gpao_t.external_write_completion_guard_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    guard,
  };
}

export function isolateHeartbeatFailures({
  failures = [],
  mainChatStatus = "ready",
  now = new Date().toISOString(),
} = {}) {
  const normalizedFailures = failures.map((failure, index) => ({
    id: failure.id || `heartbeat.${index + 1}`,
    message: failure.message || "Heartbeat check failed before it could produce an update.",
    occurredAt: failure.occurredAt || now,
    severity: failure.severity || "warning",
  }));
  const userBlocking = mainChatStatus !== "ready"
    && normalizedFailures.some((failure) => failure.severity === "P0");

  return {
    schema: "gpao_t.heartbeat_failure_isolation.v1",
    status: userBlocking ? "blocked" : "isolated",
    mainChatStatus,
    failureCount: normalizedFailures.length,
    visibleChatMessages: userBlocking ? [normalizedFailures[0].message] : [],
    doctorEvents: coalesceHeartbeatFailures(normalizedFailures),
    debounceApplied: normalizedFailures.length > 1,
    userVisibleState: userBlocking ? {
      label: "복구 필요",
      message: "상태 점검 실패가 대화 흐름에도 영향을 주고 있습니다.",
    } : {
      label: "대화 가능",
      message: "상태 점검 경고는 Doctor에서 확인할 수 있고, 현재 대화 흐름은 유지됩니다.",
    },
  };
}

export function verifyHeartbeatFailureIsolation({
  isolation = isolateHeartbeatFailures({
    failures: [
      { id: "h1" },
      { id: "h2" },
      { id: "h3" },
    ],
    mainChatStatus: "ready",
  }),
} = {}) {
  const findings = [];
  if (isolation.mainChatStatus === "ready" && isolation.visibleChatMessages.length > 0) {
    findings.push("heartbeat_warning_leaked_to_main_chat");
  }
  if (isolation.failureCount > 1 && isolation.doctorEvents.length !== 1) {
    findings.push("heartbeat_failures_not_coalesced");
  }
  if (isolation.status !== "isolated") findings.push("heartbeat_not_isolated");

  return {
    schema: "gpao_t.heartbeat_failure_isolation_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    isolation,
  };
}

export function sanitizeUserFacingRuntimeAnswer({
  request = "",
  answerText = "",
  audience = "ordinary_user",
} = {}) {
  const originalText = String(answerText || "");
  const normalizedRequest = String(request || "");
  const stabilityIntent = /안정|정상|상태|health|stable|ready|점검|확인/i.test(normalizedRequest);
  const developerIntent = /git|커밋|commit|untracked|dirty|소스|source|repo|repository|개발|릴리스|release/i.test(normalizedRequest);
  const ordinaryStability = audience === "ordinary_user" && stabilityIntent && !developerIntent;
  const replacements = [];
  const suppressedDeveloperLines = [];

  let sanitized = originalText
    .replace(/\bopenclaw\s+memory\s+index\s+(?:—|--)?force\b/gi, () => {
      replacements.push("openclaw_memory_index_command");
      return "gpao-t memory index --force";
    })
    .replace(/\bopenclaw\s+logs\s+--follow\b/gi, () => {
      replacements.push("openclaw_logs_command");
      return "gpao-t logs --follow";
    })
    .replace(/\bopenclaw\s+doctor\b/gi, () => {
      replacements.push("openclaw_doctor_command");
      return "gpao-t doctor";
    })
    .replace(/\bOpenClaw\s+세션\b/g, () => {
      replacements.push("openclaw_session_label");
      return "GPAO-T 세션";
    })
    .replace(/\bOpenClaw\s+런타임\b/g, () => {
      replacements.push("openclaw_runtime_label");
      return "GPAO-T 런타임";
    })
    .replace(/\bOpenClaw\b/g, () => {
      replacements.push("openclaw_product_name");
      return "GPAO-T";
    })
    .replace(/\bopenclaw\b/g, () => {
      replacements.push("openclaw_lowercase");
      return "gpao-t";
    });

  if (ordinaryStability) {
    const keptLines = [];
    for (const line of sanitized.split("\n")) {
      if (/\bgit\b|untracked|첫\s*커밋|dirty worktree|rollback anchor|소스\s*제어|source control/i.test(line)) {
        suppressedDeveloperLines.push(line.trim());
        continue;
      }
      keptLines.push(line);
    }
    sanitized = keptLines.join("\n").trim();
  }

  const findings = [];
  if (/\bOpenClaw\b|\bopenclaw\b/.test(sanitized)) findings.push("compatibility_name_leaked");
  if (/openclaw\s+\w+/i.test(sanitized)) findings.push("compatibility_command_leaked");
  if (ordinaryStability && /\bgit\b|untracked|첫\s*커밋|dirty worktree/i.test(sanitized)) {
    findings.push("developer_source_state_leaked_to_stability_answer");
  }

  return {
    schema: "gpao_t.user_facing_runtime_answer_guard.v1",
    status: findings.length ? "blocked" : "ready",
    request: normalizedRequest,
    audience,
    stabilityIntent,
    developerIntent,
    sanitizedText: sanitized,
    replacements: [...new Set(replacements)],
    suppressedDeveloperLines,
    findings,
    userVisibleRecovery: findings.length
      ? "사용자 답변에 내부 호환층 명칭이나 개발자 상태가 남아 있어 다시 정리해야 합니다."
      : "사용자 답변이 GPAO-T 제품 언어와 복구 명령으로 정리되었습니다.",
  };
}

export function verifyUserFacingRuntimeAnswerGuard({
  sample = {
    request: "지금 전체 안정화 되었는지 확인해",
    answerText: [
      "현재 OpenClaw 세션은 살아 있고 큐 depth 0입니다.",
      "메모리 검색 인덱스가 아직 비활성입니다.",
      "openclaw memory index --force를 실행해보세요.",
      "git은 아직 첫 커밋 전이고 untracked 상태입니다.",
    ].join("\n"),
  },
} = {}) {
  const guarded = sanitizeUserFacingRuntimeAnswer(sample);
  const findings = [...guarded.findings];
  if (!guarded.sanitizedText.includes("GPAO-T 세션")) findings.push("gpao_t_session_label_missing");
  if (!guarded.sanitizedText.includes("gpao-t memory index --force")) findings.push("gpao_t_memory_rebuild_command_missing");
  if (guarded.suppressedDeveloperLines.length < 1) findings.push("developer_git_line_not_suppressed");

  return {
    schema: "gpao_t.user_facing_runtime_answer_guard_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    guarded,
  };
}

export function buildTesterFailureGuardSummary(options = {}) {
  const chat = verifyChatSendSanitizer(options.chat || {});
  const timeout = verifyTimeoutBudget(options.timeout || {});
  const externalWrite = verifyExternalWriteCompletionGuard(options.externalWrite || {});
  const heartbeat = verifyHeartbeatFailureIsolation(options.heartbeat || {});
  const userFacingRuntimeAnswer = verifyUserFacingRuntimeAnswerGuard(options.userFacingRuntimeAnswer || {});
  const checks = { chat, timeout, externalWrite, heartbeat, userFacingRuntimeAnswer };
  const findings = Object.entries(checks)
    .flatMap(([key, value]) => (value.findings || []).map((finding) => `${key}:${finding}`));

  return {
    schema: "gpao_t.tester_failure_guard_summary.v1",
    status: findings.length ? "blocked" : "ready",
    checks,
    findings,
    completionClaimAllowed: findings.length === 0,
    nextSafeAction: findings.length
      ? "Repair Stage -1 tester failure guards before source-of-truth update rail work."
      : "Proceed to release source-of-truth cleanup and provider registry work.",
  };
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isControlField(key) {
  return CONTROL_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function hasValidExternalWriteReceipt({ action, receipt } = {}) {
  if (!isPlainObject(receipt)) return false;
  if (receipt.action !== action) return false;
  if (receipt.exitCode !== 0) return false;
  if (!receipt.remote || !receipt.branch || !receipt.commit) return false;
  if (receipt.remoteConfirmed !== true) return false;
  return true;
}

function coalesceHeartbeatFailures(failures) {
  if (!failures.length) return [];
  return [{
    id: "heartbeat.coalesced",
    count: failures.length,
    firstOccurredAt: failures[0].occurredAt,
    lastOccurredAt: failures[failures.length - 1].occurredAt,
    sampleMessage: failures[failures.length - 1].message,
    surface: "doctor_status",
  }];
}
