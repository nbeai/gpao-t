import test from "node:test";
import assert from "node:assert/strict";

import {
  GPAO_T_DEFAULT_GITHUB_UPDATE_FEED_URL,
  GPAO_T_RELEASE_VERSION,
  assertCompatibilityUpdaterDisabled,
  buildGpaoTUpdateFeed,
  compareGpaoTDateVersions,
  gpaoTUpdateStatus,
  resolveGpaoTUpdateBoundary,
  selectGpaoTUpdateCandidate,
  verifyGpaoTUpdateFeed,
} from "../src/core/update-boundary.js";
import {
  patchCompatibilityUpdateHandlersSource,
  patchCompatibilityUpdateStartupSource,
  patchGpaoTLauncherSource,
} from "../tools/apply-live-gpao-t-update-boundary-patch.mjs";

test("GPAO-T update boundary disables the compatibility updater by default", () => {
  const boundary = resolveGpaoTUpdateBoundary({});
  assert.equal(GPAO_T_RELEASE_VERSION, "2026.07.15-r1");
  assert.equal(boundary.enabled, false);
  assert.equal(boundary.compatibilityUpdaterAllowed, false);
  assert.equal(boundary.feedUrl, null);
  assert.equal(gpaoTUpdateStatus({}).status, "disabled");
  assert.equal(assertCompatibilityUpdaterDisabled({}), true);
});

test("GPAO-T feed configuration never re-enables the compatibility updater", () => {
  const boundary = resolveGpaoTUpdateBoundary({
    GPAO_T_UPDATE_FEED_URL: "https://updates.example.test/gpao-t/feed.json",
  });
  assert.equal(boundary.enabled, true);
  assert.equal(boundary.compatibilityUpdaterAllowed, false);
  assert.equal(boundary.reason, "gpao_t_github_update_feed_configured");
  assert.equal(gpaoTUpdateStatus({ GPAO_T_UPDATE_FEED_URL: GPAO_T_DEFAULT_GITHUB_UPDATE_FEED_URL }).status, "configured_ready");
});

test("GPAO-T GitHub update feed selects newer date-version assets only after integrity metadata is present", () => {
  assert.equal(compareGpaoTDateVersions("2026.07.15-r2", "2026.07.15-r1"), 1);
  assert.equal(compareGpaoTDateVersions("2026.07.15-r1", "2026.07.15-r1"), 0);
  const feed = buildGpaoTUpdateFeed({
    version: "2026.07.15-r2",
    releasePageUrl: "https://github.com/nbeai/gpao-t/releases/tag/2026.07.15-r2",
    assets: [
      {
        kind: "production_distribution",
        name: "gpao-t-2026.07.15-r2.zip",
        url: "https://github.com/nbeai/gpao-t/releases/download/2026.07.15-r2/gpao-t-2026.07.15-r2.zip",
        sha256: "a".repeat(64),
        bytes: 123,
      },
      {
        kind: "macos_installer",
        name: "gpao-t-2026.07.15-r2-macos-installer.zip",
        url: "https://github.com/nbeai/gpao-t/releases/download/2026.07.15-r2/gpao-t-2026.07.15-r2-macos-installer.zip",
        sha256: "b".repeat(64),
        bytes: 456,
        platform: "macos",
      },
    ],
  });
  assert.equal(verifyGpaoTUpdateFeed(feed).ok, true);
  const candidate = selectGpaoTUpdateCandidate(feed, "2026.07.15-r1");
  assert.equal(candidate.status, "update_available");
  assert.equal(candidate.updateAvailable, true);
  assert.equal(candidate.assets.length, 2);
});

test("compatibility startup patch blocks background update checks in GPAO-T runtime", () => {
  const source = "function createDeferredGatewayUpdateCheck(){\n\tconst start = () => {\n\t\tif (started || stopped) return;\n\t};\n}";
  const patched = patchCompatibilityUpdateStartupSource(source);
  assert.match(patched, /gpao_t_update_boundary_startup_v0_1/);
  assert.match(patched, /process\.env\.GPAO_T_RUNTIME === "1"/);
  assert.equal(patchCompatibilityUpdateStartupSource(patched), patched);
});

test("compatibility handler patch returns GPAO-T managed status and refuses update execution", () => {
  const source = `const updateHandlers = {
\t"update.status": async ({ params, respond, context }) => {
\t\tif (!assertValidParams(params, validateUpdateStatusParams, "update.status", respond)) return;
\t\tlet sentinel;
\t},
\t"update.run": async ({ params, respond, client, context }) => {
\t\tif (!assertValidParams(params, validateUpdateRunParams, "update.run", respond)) return;
\t\tconst actor = resolveControlPlaneActor(client);
\t}
};`;
  const patched = patchCompatibilityUpdateHandlersSource(source);
  assert.match(patched, /gpao_t_update_boundary_handlers_v0_1/);
  assert.match(patched, /gpao_t_update_feed_not_configured/);
  assert.match(patched, /gpao_t_github_update_feed_configured/);
  assert.match(patched, /2026\.07\.15-r1/);
  assert.equal(patchCompatibilityUpdateHandlersSource(patched), patched);
});

test("GPAO-T launcher intercepts update commands before the compatibility CLI", () => {
  const source = 'const child = spawn(process.execPath, [launcher, ...process.argv.slice(2)], { stdio: "inherit" });';
  const patched = patchGpaoTLauncherSource(source);
  assert.match(patched, /gpao_t_update_boundary_launcher_v0_1/);
  assert.match(patched, /GPAO_T_UPDATE_FEED_URL/);
  assert.equal(patchGpaoTLauncherSource(patched), patched);
});
