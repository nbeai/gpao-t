import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-f6-dashboard-"));
}

test("F6 dashboard is a conversation-first workspace with session-scoped assistance", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    assert.equal(dashboard.status, 200);
    const cookie = dashboard.headers.get("set-cookie");
    const html = await dashboard.text();
    assert.match(html, /class="conversation"/);
    assert.match(html, /id="assistant-panel"/);
    assert.match(html, /작업 보조/);
    assert.match(html, /data-panel-content="activity"/);
    assert.match(html, /AI 연결/);
    assert.match(html, /도구/);
    assert.match(html, /기억/);
    assert.match(html, /복구/);
    assert.match(html, /\/assets\/gpao-t3-logo\.jpeg/);
    assert.match(html, /id="session-menu"/);
    assert.match(html, /id="session-dialog"/);
    assert.match(html, /id="settings-dialog"/);
    assert.match(html, /id="rail-collapse"/);
    assert.match(html, /id="composer-settings"/);
    assert.doesNotMatch(html, /GPAO-T3 운영 상태|schema|replay|raw receipt|stack trace|evidence|WP 검증/i);
    assert.doesNotMatch(html, /token|authorization|credentialRef/i);

    const app = await fetch(`${base}/app.js`).then(response => response.text());
    assert.match(app, /승인된 영향 없음/);
    assert.match(app, /기억은 검토 전까지 답변 기준이 아닙니다/);
    assert.match(app, /알 수 없는 결과는 자동으로 반복하지 않습니다/);
    assert.match(app, /되돌리기/);
    assert.match(app, /summary:"기본 응답 준비됨"/);
    assert.match(app, /aria-label="이름 변경"/);
    assert.match(app, /class="session-context-menu"/);
    assert.match(app, /data-session-menu/);
    assert.match(app, /gpao-t3:rail-collapsed/);
    assert.match(app, /function applyRailPreference/);
    assert.match(app, /renderSessions\(\)/);
    assert.match(app, /ArrowDown/);
    assert.match(app, /aria-modal/);
    assert.match(app, /sessions-open/);
    assert.match(app, /gpao-t3:assistant-panel:/);
    assert.match(app, /sessionStorage\.setItem/);
    assert.match(app, /userClosed/);
    assert.match(app, /setPanelOpen\(false, \{ userClosed:true \}\)/);
    assert.doesNotMatch(app, /window\.(prompt|confirm)/);
    assert.doesNotMatch(app, /credentialRef|ownerToken|GPAO_T3_OPENAI_API_KEY/);

    const css = await fetch(`${base}/app.css`).then(response => response.text());
    assert.match(css, /\.workbench\.panel-open/);
    assert.match(css, /position:fixed; z-index:30/);
    assert.match(css, /height:100vh; max-height:none/);

    const logo = await fetch(`${base}/assets/gpao-t3-logo.jpeg`);
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get("content-type"), "image/jpeg");
    assert.ok((await logo.arrayBuffer()).byteLength > 1000);

    const headers = { cookie, "content-type": "application/json" };
    const influence = await fetch(`${base}/v1/context-influence`, { headers }).then(response => response.json());
    assert.equal(influence.schema, "gpao_t3.context_influence_ledger.v1");
    assert.equal(influence.durableMemoryPromotion, false);

    const doctor = await fetch(`${base}/v1/doctor`, { headers }).then(response => response.json());
    assert.equal(doctor.readOnly, true);
    assert.equal(doctor.integrity.ok, true);
    assert.equal("stateDir" in doctor, true);
    assert.doesNotMatch(JSON.stringify(doctor.publicHealth || {}), /ownerToken|credentialRef/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});

test("F6 context influence rollback path is available through the local dashboard authority", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const turn = await fetch(`${base}/v1/os-turns`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ requestId: "f6-memory-seed", sessionId: "56a09944-c239-4a14-a2c0-70d58a3f1fa0", input: "F6는 기억 상태를 화면에서 보여준다" })
    }).then(response => response.json());
    assert.equal(turn.turn.status, "succeeded");
    const ledger = await fetch(`${base}/v1/context-influence`, { headers: { cookie } }).then(response => response.json());
    assert.equal(ledger.schema, "gpao_t3.context_influence_ledger.v1");
    assert.equal(ledger.durableMemoryPromotion, false);
    const rollback = await fetch(`${base}/v1/context-influence/not-found/rollback`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ reason: "f6_ui_smoke" })
    }).then(response => response.json());
    assert.equal(rollback.schema, "gpao_t3.context_influence_rollback.v1");
    assert.equal(rollback.rolledBack, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
