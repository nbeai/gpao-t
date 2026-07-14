import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-http-"));
}

async function eventually(url, predicate, init) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < 4000) {
    const response = await fetch(url, init);
    const body = await response.json();
    last = { status: response.status, body };
    if (predicate(response, body)) return body;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for HTTP state: ${JSON.stringify(last)}`);
}

test("HTTP health is public, work is owner-authenticated, and turn state is scoped", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then(response => response.json());
  assert.equal(health.status, "ready");
  const unauthorized = await fetch(`${base}/v1/doctor`);
  assert.equal(unauthorized.status, 401);

  const accepted = await fetch(`${base}/v1/turns`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "http-1", payload: { input: "http" } })
  }).then(response => response.json());
  const completed = await eventually(`${base}/v1/turns/${accepted.commandId}`, (_response, body) => body.status === "succeeded", { headers: { authorization: `Bearer ${runtime.ownerToken}` } });
  assert.equal(completed.receipt.result.echo, "http");

  const progress = await fetch(`${base}/v1/progress/${accepted.commandId}`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.text());
  assert.match(progress, /event: snapshot/);
  const doctor = await fetch(`${base}/v1/doctor`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(doctor.readOnly, true);
  assert.equal(doctor.integrity.ok, true);

  await new Promise(resolve => server.close(resolve));
  await runtime.stop();
});
