import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  DEFAULT_DOM_READBACK_EVIDENCE,
  DEFAULT_LIVE_CONTROL_UI,
  parseSafariDomReadbackEvidence,
  runGpaoTDashboardRouteCrawl,
} from "../tools/run-gpao-t-dashboard-route-crawl.mjs";

test("dashboard route crawl defaults to the canonical GPAO-T live runtime and current QA evidence", () => {
  assert.match(DEFAULT_LIVE_CONTROL_UI, /\.gpao-t\/current\/compatibility\/gpao-t\/dist\/control-ui$/);
  assert.match(DEFAULT_DOM_READBACK_EVIDENCE, /phase-5-final-human-qa-loop-2-2026-07-14\/ROUTE-DOM-READBACK\.md$/);
  assert.doesNotMatch(DEFAULT_LIVE_CONTROL_UI, /node_modules\/openclaw/);
});

test("parseSafariDomReadbackEvidence accepts passed and redirect-observed route sections", () => {
  const evidence = parseSafariDomReadbackEvidence([
    "### `/chat`",
    "",
    "Result: passed",
    "",
    "### `/documents`",
    "",
    "Result: redirect observed",
  ].join("\n"));

  assert.equal(evidence["/chat"].accepted, true);
  assert.equal(evidence["/"].result, "covered_by_chat_shell");
  assert.equal(evidence["/documents"].accepted, true);
});

test("dashboard route crawl turns existing DOM readback evidence into a ready route seal", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-route-crawl-"));
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "index.html"), "<title>nBeAI. GPAO-T</title><body>nBeAI. GPAO-T 설정 모델 연결 설정 프로필 GPAO-T 에이전트 기능 노드 드리밍 문서</body>");
  await writeFile(join(root, "manifest.webmanifest"), JSON.stringify({ name: "nBeAI. GPAO-T" }));
  await writeFile(join(root, "sw.js"), "");
  const evidencePath = join(root, "dom-readback.md");
  await writeFile(evidencePath, [
    "### `/chat`",
    "Result: passed",
    "### `/settings/general`",
    "Result: passed",
    "### `/settings/model-connection`",
    "Result: passed",
    "### `/settings/profile`",
    "Result: passed",
    "### `/settings/ai-agents`",
    "Result: passed",
    "### `/skills`",
    "Result: passed",
    "### `/agents`",
    "Result: passed",
    "### `/nodes`",
    "Result: passed",
    "### `/dreaming`",
    "Result: passed",
    "### `/documents`",
    "Result: redirect observed",
  ].join("\n"));

  const report = await runGpaoTDashboardRouteCrawl({
    liveRoot: root,
    domReadbackEvidencePath: evidencePath,
    now: "2026-07-12T00:00:00.000Z",
  });

  assert.equal(report.status, "ready");
  assert.equal(report.findings.length, 0);
  assert.equal(report.routes.every((route) => route.status !== "blocked"), true);
  assert.equal(report.domReadbackEvidenceCount >= 10, true);
});
