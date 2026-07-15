import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  OUTBOUND_BOUNDARY_APPLY_TOKEN,
  patchApnsOutboundSource,
  patchClawHubOutboundSource,
  patchClawRouterOutboundSource,
  patchDocsOutboundSource,
  patchGpaoTOutboundBoundaryFiles,
  patchProviderAttributionSource,
  patchPushOutboundSource,
  planGpaoTOutboundBoundary,
} from "../tools/apply-live-gpao-t-outbound-boundary-patch.mjs";
import { auditLivePatchReproducibility } from "../tools/audit-live-patch-reproducibility.mjs";

function idempotent(patcher, source, marker) {
  const patched = patcher(source);
  assert.match(patched, new RegExp(marker));
  assert.equal(patcher(patched), patched);
  return patched;
}

test("outbound source transforms are exact, fail-closed, and idempotent", () => {
  idempotent(patchProviderAttributionSource, `function listProviderAttributionPolicies() {}\nconst OPENCLAW_ATTRIBUTION_PRODUCT = "OpenClaw";\nfunction resolveProviderRequestPolicy(input, env = process.env) {\n\tconst attributionHeaders = attributionPolicy?.enabledByDefault ? attributionPolicy.headers : void 0;\n\treturn {\n\t\tpolicy: attributionPolicy ?? policy,\n\t\tattributionProvider,\n\t\tattributionHeaders,\n\t\tallowsHiddenAttribution: attributionProvider !== void 0 && attributionPolicy?.verification === "vendor-hidden-api-spec",\n\t};\n}`, "gpao_t_outbound_provider_attribution_v1");
  idempotent(patchClawHubOutboundSource, "async function clawhubRequest(params) {\n}", "gpao_t_outbound_clawhub_v1");
  idempotent(patchClawRouterOutboundSource, "const plugin = {\n\tregister(api) {\n\t}\n};", "gpao_t_outbound_clawrouter_v1");
  idempotent(patchApnsOutboundSource, "async function sendApnsRelayRequest(params) {\n}\nasync function sendApnsRequest(params) {\n}", "gpao_t_outbound_apns_v1");
  idempotent(patchPushOutboundSource, "async function sendPreparedWebPushNotification(webPush, subscription, payload) {\n}\nconst pushHandlers = {\n};\n//#endregion\nexport { pushHandlers };", "gpao_t_outbound_web_push_v1");
  idempotent(patchDocsOutboundSource, "async function docsSearchCommand(queryParts, runtime) {\n}", "gpao_t_outbound_docs_v1");
  assert.throws(() => patchClawHubOutboundSource("async function other() {}"), /expected one anchor/);
});

test("apply is fail-closed without the explicit approval token", async () => {
  await assert.rejects(
    patchGpaoTOutboundBoundaryFiles({ runtimeRoot: "/does/not/matter", write: true }),
    new RegExp(OUTBOUND_BOUNDARY_APPLY_TOKEN),
  );
});

const LIVE_ROOT = "/Users/jyp/.gpao-t/current/compatibility/gpao-t";
test("current live compatibility shape produces a dry-run plan without mutation", { skip: !existsSync(LIVE_ROOT) }, async () => {
  const packageBefore = await readFile(`${LIVE_ROOT}/package.json`, "utf8");
  const plan = await planGpaoTOutboundBoundary({ runtimeRoot: LIVE_ROOT });
  assert.deepEqual(plan.changes.map((item) => item.kind).sort(), ["apns", "clawhub", "clawrouter", "docs", "provider-attribution", "push"]);
  assert.equal(plan.protectedFiles.length, 4);
  assert.equal(await readFile(`${LIVE_ROOT}/package.json`, "utf8"), packageBefore);
});

test("distribution, package checks, and reproducibility audit expose the outbound boundary", async () => {
  const build = await readFile(new URL("../tools/build-gpao-t-production-distribution.mjs", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const audit = await auditLivePatchReproducibility();
  assert.match(build, /patchGpaoTOutboundBoundaryFiles/);
  assert.match(pkg.scripts["check:outbound-boundary"], /live-outbound-boundary-patch/);
  assert.equal(audit.outboundBoundary.id, "outbound_boundary");
  assert.equal(audit.outboundBoundary.tools[0].hasTokenGate, true);
  assert.equal(audit.outboundBoundary.tools[0].hasBackup, true);
  assert.equal(audit.outboundBoundary.tools[0].hasDryRun, true);
});
