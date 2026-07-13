import assert from "node:assert/strict";
import test from "node:test";

import { patchSurfaceFile } from "../tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs";

test("patchSurfaceFile seals fallback OpenClaw Control UI copy", () => {
  const source = `
    <h1>Control UI did not start</h1>
    <a href="https://docs.openclaw.ai/web/control-ui#blank-control-ui-page">Control UI troubleshooting</a>
    <script>"A fresh page still could not start the Control UI."</script>
  `;
  const patched = patchSurfaceFile({ path: "index.html", source }).source;

  assert.match(patched, /GPAO-T 화면을 시작하지 못했습니다/);
  assert.match(patched, /GPAO-T 복구 안내/);
  assert.doesNotMatch(patched, /docs\.openclaw\.ai/);
  assert.doesNotMatch(patched, /Control UI did not start/);
});

test("patchSurfaceFile does not mutate JavaScript bundles", () => {
  const source = [
    "`OpenClaw mobile`",
    "`Official OpenClaw mobile apps`",
    "`OpenClaw 모바일`",
    "`공식 OpenClaw 모바일 앱`",
    "`Search plugins and ClawHub`",
    "`ClawHub에서 찾기`",
    "`ClawHub`",
    "`clawhub`",
    "`Keep Last Assistants`",
    "`Last Assistants`",
    "`Clawdette`",
    "`Optional OpenClaw capability.`",
    "`선택적 OpenClaw 기능입니다.`",
  ].join("\n");

  const patched = patchSurfaceFile({ path: "assets/i18n.js", source }).source;

  assert.equal(patched, source);
});

test("patchSurfaceFile seals connection and pairing screen copy", () => {
  const source = [
    "`WebSocket URL`",
    "`OPENCLAW_GATEWAY_TOKEN (선택 사항)`",
    "`비밀번호(저장되지 않음)`",
    "`연결할 수 없음`",
    "`브라우저가 로컬 런타임 연결을 완료할 수 없습니다. 자격 증명을 다시 시도하기 전에 대상과 전송 방식을 확인하세요.`",
    "`gpao-t status 또는 gpao-t gateway run으로 GPAO-T 런타임이 실행 중인지 확인하세요.`",
    "`gpao-t dashboard --no-open으로 dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요.`",
    "`GPAO-T 화면 인증 문서`",
    "`원시 오류`",
  ].join("\n");

  const patched = patchSurfaceFile({ path: "index.html", source }).source;

  assert.match(patched, /연결 주소/);
  assert.match(patched, /연결키 \(필요할 때만\)/);
  assert.match(patched, /로컬 연결 비밀번호 \(저장되지 않음\)/);
  assert.match(patched, /GPAO-T 로컬 런타임에 연결하지 못했습니다/);
  assert.match(patched, /GPAO-T 런타임이 켜져 있는지 확인하세요/);
  assert.match(patched, /GPAO-T 연결 도움말/);
  assert.match(patched, /상세 오류/);
  assert.doesNotMatch(patched, /WebSocket URL/);
  assert.doesNotMatch(patched, /OPENCLAW_GATEWAY_TOKEN/);
  assert.doesNotMatch(patched, /gpao-t gateway run/);
  assert.doesNotMatch(patched, /dashboard --no-open/);
  assert.doesNotMatch(patched, /GPAO-T 화면 인증 문서/);
});

test("patchSurfaceFile leaves service worker runtime keys intact", () => {
  const source = `
    const CACHE_PREFIX = "openclaw-control-";
    const options = { tag: data.tag || "openclaw-notification" };
  `;
  const patched = patchSurfaceFile({ path: "sw.js", source }).source;

  assert.match(patched, /openclaw-control-/);
  assert.match(patched, /openclaw-notification/);
});

test("patchSurfaceFile replaces legacy favicon svg with GPAO-T svg", () => {
  const source = `<svg><!-- openclaw.ai hero mascot --><path id="claw"/></svg>`;
  const patched = patchSurfaceFile({ path: "favicon.svg", source }).source;

  assert.match(patched, /nBeAI\. GPAO-T/);
  assert.doesNotMatch(patched, /openclaw\.ai hero mascot/);
});
