import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NativeRuntime } from "../src/core/runtime.js";
import { SecureConnectionProcessClient } from "../src/core/secure-connection-process-client.js";
import { MACOS_PROVIDER_DEFINITIONS } from "../src/core/macos-provider-connection-backend.js";

function percentile(values, value) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] || 0;
}

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-wp6-qualification-"));
const secureConnectionAgent = new SecureConnectionProcessClient();
const runtime = await new NativeRuntime({ stateDir, secureConnectionAgent }).start();
const latency = [];
try {
  const opened = await runtime.beginProviderConnection({ providerId: "local-model", authMethod: "local" });
  await runtime.setDefaultModelSelection({ providerId: "local-model", modelId: "deterministic-echo" });
  const turn = await runtime.runOsTurn({ principalId: "owner:wp6", sessionId: "wp6-local", requestId: "wp6-local-fresh-turn", input: "GPAO-T3 local protected provider qualification" });
  for (let index = 0; index < 100; index += 1) {
    const started = performance.now();
    await secureConnectionAgent.invoke({ requestId: `local-ipc-${index}`, credentialRef: "local:local-model", providerId: "local-model", modelId: "deterministic-echo", input: { message: "ping" }, deadline: Date.now() + 5_000 });
    latency.push(performance.now() - started);
  }
  const disconnected = await runtime.disconnectProvider("local-model");
  const report = {
    schema: "gpao_t3.wp6_provider_platform_qualification.v1", generatedAt: new Date().toISOString(),
    protectedBoundary: {
      isolation: runtime.health().protectedConnection.isolation,
      apiKeyAcquisition: "native_prompt_to_keychain_inside_secure_process",
      oauth: "provider_managed_session_inside_secure_process",
      coreSecretIngress: "forbidden"
    },
    providerContracts: Object.entries(MACOS_PROVIDER_DEFINITIONS).map(([providerId, definition]) => ({
      providerId,
      authMethod: definition.authMethod,
      models: [...definition.models],
      lifecycle: "connect_status_invoke_revoke",
      state: providerId === "local-model"
        ? "qualified_internal_deterministic_engine"
        : providerId === "local-ollama"
          ? "implemented_real_local_connector_host_service_required"
          : "implemented_external_authority_required"
    })),
    localFreshTurn: { connectionState: opened.state, turnStatus: turn.turn.status, replyMode: turn.replyMode, disconnectedState: disconnected.state },
    performance: { samples: latency.length, protectedLocalIpcP50Ms: percentile(latency, 0.5), protectedLocalIpcP95Ms: percentile(latency, 0.95), budgetP95Ms: 10 },
    recoveryMatrix: ["auth_required", "rate_limited", "provider_timeout", "provider_unavailable", "content_blocked", "external_outcome_unknown"],
    externalQualification: {
      codexOAuth: "previous_owner_approved_evidence",
      openaiApiKey: "requires_owner_credential",
      anthropicApiKey: "requires_owner_credential",
      geminiApiKey: "requires_owner_credential",
      ollamaLocalModel: "requires_running_loopback_service_and_installed_model"
    }
  };
  report.wp6LocalPlatformGate = report.protectedBoundary.isolation === "separate_process" && report.localFreshTurn.connectionState === "ready" && report.localFreshTurn.turnStatus === "succeeded" && report.localFreshTurn.disconnectedState === "not_configured" && report.performance.protectedLocalIpcP95Ms <= report.performance.budgetP95Ms ? "pass" : "fail";
  const output = JSON.stringify(report, null, 2);
  const outputArg = process.argv.find(argument => argument.startsWith("--out="));
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice(6)), `${output}\n`);
  process.stdout.write(`${output}\n`);
  if (report.wp6LocalPlatformGate !== "pass") process.exitCode = 1;
} finally {
  await runtime.stop();
  fs.rmSync(stateDir, { recursive: true, force: true });
}
