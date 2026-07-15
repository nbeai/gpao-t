import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-f2-dashboard-smoke-"));
}

async function json(response) {
  return response.json();
}

test("F2 dashboard smoke exposes API key, OAuth, and local model paths without provider calls", async () => {
  let externalProviderCalls = 0;
  const runtime = await new NativeRuntime({
    stateDir: tempState(),
    providerEnvironment: {
      GPAO_T3_OPENAI_API_KEY: "must-not-be-used-by-dashboard-smoke"
    },
    providerFetch: async () => {
      externalProviderCalls += 1;
      throw new Error("dashboard smoke must not call an external provider");
    }
  }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    assert.equal(dashboard.status, 200);
    const cookie = dashboard.headers.get("set-cookie");
    const html = await dashboard.text();
    assert.match(html, /AI 연결/);
    assert.match(html, /연결 정보는 대화에 입력하지 않고 안전한 연결 절차에서만 처리합니다/);
    assert.doesNotMatch(html, /GPAO_T3_OPENAI_API_KEY|must-not-be-used/);

    const app = await fetch(`${base}/app.js`).then(response => response.text());
    assert.match(app, /API 키로 연결/);
    assert.match(app, /계정으로 연결/);
    assert.match(app, /로컬 모델 연결/);
    assert.match(app, /연결 정보는 대화에 입력하지 마세요/);
    assert.match(app, /연결 결과를 확인하지 못했습니다/);
    assert.doesNotMatch(app, /token|authorization code|GPAO_T3_OPENAI_API_KEY/);

    const headers = { cookie, origin: base, "content-type": "application/json" };
    const center = await fetch(`${base}/v1/connection-center`, { headers: { cookie } }).then(json);
    const openai = center.providers.find(provider => provider.id === "openai");
    const codex = center.providers.find(provider => provider.id === "codex-oauth");
    const local = center.providers.find(provider => provider.id === "local-model");
    assert.deepEqual(openai.display.authMethods, ["api_key"]);
    assert.deepEqual(codex.display.authMethods, ["oauth"]);
    assert.deepEqual(local.display.authMethods, ["local"]);
    assert.equal(local.auth.state, "configured");
    assert.equal(local.health.state, "ready");
    assert.doesNotMatch(JSON.stringify(center), /must-not-be-used|api[_-]?key\s*[:=]|access[_-]?token|refresh[_-]?token/i);

    const secretProposal = await fetch(`${base}/v1/connection-proposals`, {
      method: "POST",
      headers,
      body: JSON.stringify({ input: "OpenAI API key sk-test-dashboard-secret" })
    }).then(json);
    assert.equal(secretProposal.status, "rejected");
    assert.equal(secretProposal.reason, "secret_like_input");
    assert.doesNotMatch(JSON.stringify(secretProposal), /sk-test-dashboard-secret/);

    const rejectedSecretConnection = await fetch(`${base}/v1/connections/openai`, {
      method: "POST",
      headers,
      body: JSON.stringify({ authMethod: "api_key", secret: "sk-test-dashboard-secret" })
    });
    assert.equal(rejectedSecretConnection.status, 400);
    const rejectedSecretBody = await rejectedSecretConnection.json();
    assert.equal(rejectedSecretBody.code, "protected_connection_secret_forbidden");
    assert.doesNotMatch(JSON.stringify(rejectedSecretBody), /sk-test-dashboard-secret/);

    const unavailableProtectedPath = await fetch(`${base}/v1/connections/openai`, {
      method: "POST",
      headers,
      body: JSON.stringify({ authMethod: "api_key" })
    });
    assert.equal(unavailableProtectedPath.status, 503);
    const unavailableBody = await unavailableProtectedPath.json();
    assert.equal(unavailableBody.code, "protected_connection_agent_unavailable");
    assert.doesNotMatch(JSON.stringify(unavailableBody), /must-not-be-used|sk-/);

    const savedLocalDefault = await fetch(`${base}/v1/model-selection/default`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ providerId: "local-model", modelId: "deterministic-echo" })
    }).then(json);
    assert.deepEqual(savedLocalDefault.selection, {
      preferredProviderId: "local-model",
      preferredModelId: "deterministic-echo"
    });

    const refreshed = await fetch(`${base}/v1/connection-center`, { headers: { cookie } }).then(json);
    assert.deepEqual(refreshed.defaultSelection, {
      preferredProviderId: "local-model",
      preferredModelId: "deterministic-echo"
    });
    assert.equal(externalProviderCalls, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
