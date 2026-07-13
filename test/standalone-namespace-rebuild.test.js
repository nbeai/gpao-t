import test from "node:test";
import assert from "node:assert/strict";

import {
  patchStandaloneNamespaceSource,
} from "../tools/rebuild-gpao-t-standalone-namespace.mjs";

test("standalone namespace patch rewrites visible inherited names to GPAO-T", () => {
  const source = `
    customElements.define("openclaw-app", class extends HTMLElement {});
    const key = "openclaw.control.settings.v1";
    const mount = document.getElementById("openclaw-mount-fallback");
    const constant = "__OPENCLAW_CONTROL_UI_BASE_PATH__";
    <openclaw-tooltip></openclaw-tooltip>
  `;

  const patched = patchStandaloneNamespaceSource(source, { path: "assets/index.js" });

  assert.equal(/openclaw/i.test(patched), false);
  assert.match(patched, /gpao-t-app/);
  assert.match(patched, /gpao-t\.control\.settings\.v1/);
  assert.match(patched, /gpao-t-mount/);
  assert.match(patched, /__GPAO_T_CONTROL_UI_BASE_PATH__/);
});

test("standalone namespace patch preserves encoded legacy aliases in index html", () => {
  const source = `
    <html>
      <body>
        <gpao-t-app></gpao-t-app>
        <script>console.log("ready")</script>
      </body>
    </html>
  `;

  const patched = patchStandaloneNamespaceSource(source, {
    path: "index.html",
    legacyCustomElements: [
      "openclaw-about-page",
      "openclaw-agent-select",
      "openclaw-workboard-page",
    ],
  });

  assert.match(patched, /gpao_t_standalone_namespace_rebuild_v0_1/);
  assert.match(patched, /"about-page"/);
  assert.match(patched, /"agent-select"/);
  assert.match(patched, /"workboard-page"/);
  assert.equal(/openclaw/i.test(patched), false);
});
