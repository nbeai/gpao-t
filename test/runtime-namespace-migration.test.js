import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNamespaceMirrorScript,
  extractLegacyCustomElementNames,
  patchIndexHtmlNamespaceSource,
  patchServiceWorkerNamespaceSource,
} from "../tools/migrate-gpao-t-runtime-namespace.mjs";

test("patchIndexHtmlNamespaceSource installs GPAO-T storage and element alias mirror", () => {
  const source = "<!doctype html>\n<html><head>\n    <script>\n      console.log('theme');\n    </script>\n</head><body><openclaw-app></openclaw-app></body></html>";
  const patched = patchIndexHtmlNamespaceSource(source);

  assert.match(patched, /gpao_t_runtime_namespace_mirror_v0_1/);
  assert.match(patched, /gpao_t_custom_element_alias_bridge_v0_1/);
  assert.match(patched, /gpao-t\./);
  assert.match(patched, /legacyElementNames/);
  assert.match(patched, /replace\(\/\^openclaw-/);
  assert.equal(patchIndexHtmlNamespaceSource(patched), patched);
});

test("extractLegacyCustomElementNames finds bundle-level OpenClaw custom elements for GPAO-T aliases", () => {
  const source = [
    "customElements.define(`openclaw-about-page`, C);",
    "<openclaw-tooltip .content=${label}></openclaw-tooltip>",
    "customElements.get('openclaw-agent-select')",
  ].join("\n");
  assert.deepEqual(extractLegacyCustomElementNames(source), [
    "openclaw-about-page",
    "openclaw-agent-select",
    "openclaw-tooltip",
  ]);
});

test("buildNamespaceMirrorScript emits manifest-backed aliases for discovered legacy elements", () => {
  const script = buildNamespaceMirrorScript({
    legacyCustomElements: ["openclaw-about-page", "openclaw-tooltip"],
  });

  assert.match(script, /gpao_t_custom_element_alias_bridge_v0_1/);
  assert.match(script, /"openclaw-about-page"/);
  assert.match(script, /oldName\.replace\(\/\^openclaw-/);
  assert.match(script, /"openclaw-app"/);
});

test("patchServiceWorkerNamespaceSource moves active cache and notification names to GPAO-T with legacy cache compatibility", () => {
  const source = [
    'const CACHE_PREFIX = "openclaw-control-";',
    "const controlKeys = cacheKeys.filter((key) => key.startsWith(CACHE_PREFIX));",
    'tag: data.tag || "openclaw-notification",',
  ].join("\n");
  const patched = patchServiceWorkerNamespaceSource(source);

  assert.match(patched, /const CACHE_PREFIX = "gpao-t-control-";/);
  assert.match(patched, /const LEGACY_CACHE_PREFIX = "openclaw-control-";/);
  assert.match(patched, /key\.startsWith\(LEGACY_CACHE_PREFIX\)/);
  assert.match(patched, /"gpao-t-notification"/);
  assert.equal(patchServiceWorkerNamespaceSource(patched), patched);
});
