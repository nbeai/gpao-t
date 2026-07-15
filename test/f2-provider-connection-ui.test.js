import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("F2 connection UI presents API key and OAuth as ordinary equal connection choices", async () => {
  const app = await readFile(new URL("src/ui/app.js", root), "utf8");
  const html = await readFile(new URL("src/ui/index.html", root), "utf8");
  assert.match(app, /API 키로 연결/);
  assert.match(app, /계정으로 연결/);
  assert.match(app, /\/v1\/connections\/\$\{encodeURIComponent\(providerId\)\}/);
  assert.match(app, /\/refresh/);
  assert.match(app, /method:"DELETE"/);
  assert.doesNotMatch(app, /codex-oauth\/recheck/);
  assert.doesNotMatch(app, /Codex 로그인 확인/);
  assert.match(html, /연결 정보는 대화에 입력하지 않고 안전한 연결 절차에서만 처리합니다/);
});
