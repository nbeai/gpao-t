#!/usr/bin/env node
import { mkdtempSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendToolProgressEvent,
  buildConversationProgressLane,
  deriveSessionTitleFromRequest,
  runLiveTurnAbsorptionBridge,
} from "../src/index.js";

const DEFAULT_ROOT = mkdtempSync(join(tmpdir(), "gpao-t-conversation-ux-qa-"));
const DEFAULT_EVIDENCE_ROOT =
  "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/conversation-ux-qa";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function pass(id, detail = "") {
  return { id, status: "pass", detail };
}

function fail(id, detail = "") {
  return { id, status: "fail", detail };
}

async function main() {
  const root = readArg("--root", DEFAULT_ROOT);
  const evidenceRoot = readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT);
  const noWrite = hasArg("--no-write");
  const checks = [];

  const title = deriveSessionTitleFromRequest("좋아. 대화창 이름 자동생성 구현해줘.");
  checks.push(title === "대화창 이름 자동생성 구현"
    ? pass("title_from_first_meaningful_input", title)
    : fail("title_from_first_meaningful_input", title));

  const run = runLiveTurnAbsorptionBridge({
    root,
    now: "2026-07-12T04:00:00.000Z",
    runId: "conversation-ux-qa.run",
    sessionKey: "agent:main:GPAO-T conversation UX QA",
    message: "긴 작업이면 중간 진행감을 보여줘.",
    answerText: "맥락 회수, 답변 검증, 자가성장 후보 검토, 완료 상태를 기록했습니다.",
    source: "gateway_chat",
  });
  const phases = run.progressEvents.map((event) => event.phase);
  checks.push(phases[0] === "context_retrieval"
    ? pass("first_progress_is_context_retrieval", phases.join(" -> "))
    : fail("first_progress_is_context_retrieval", phases.join(" -> ")));
  checks.push(run.progressEvents[0]?.elapsedMs <= 3000
    ? pass("first_progress_under_3s", `${run.progressEvents[0]?.elapsedMs}ms`)
    : fail("first_progress_under_3s", String(run.progressEvents[0]?.elapsedMs)));
  checks.push(phases.includes("verifying") && phases.includes("complete")
    ? pass("long_turn_has_mid_progress", phases.join(" -> "))
    : fail("long_turn_has_mid_progress", phases.join(" -> ")));

  appendToolProgressEvent({
    root,
    now: "2026-07-12T04:00:01.000Z",
    runId: "conversation-ux-qa.tool",
    sessionKey: "agent:main:GPAO-T conversation UX QA",
    toolName: "npm run check",
    status: "running",
    summary: "문법 검사를 실행 중입니다.",
    command: "npm run check",
  });
  appendToolProgressEvent({
    root,
    now: "2026-07-12T04:00:02.000Z",
    runId: "conversation-ux-qa.tool",
    sessionKey: "agent:main:GPAO-T conversation UX QA",
    toolName: "npm run check",
    status: "complete",
    summary: "문법 검사가 통과했습니다.",
  });
  const lane = buildConversationProgressLane({ root, limit: 20 });
  checks.push(lane.uxContract.firstProgressTargetMs === 3000
    ? pass("first_progress_target_under_3s")
    : fail("first_progress_target_under_3s", String(lane.uxContract.firstProgressTargetMs)));
  checks.push(lane.uxContract.firstProgressUnderTarget === true
    ? pass("progress_lane_confirms_first_progress_under_target")
    : fail("progress_lane_confirms_first_progress_under_target"));
  checks.push(lane.uxContract.hasMidProgressBeforeComplete === true
    ? pass("progress_lane_confirms_mid_progress_before_complete")
    : fail("progress_lane_confirms_mid_progress_before_complete"));
  checks.push(lane.uxContract.toolLogsInBody === "blocked"
    ? pass("tool_logs_not_in_body")
    : fail("tool_logs_not_in_body", lane.uxContract.toolLogsInBody));
  checks.push(lane.uxContract.bodyLogLeakFindings.length === 0
    ? pass("tool_body_log_leak_findings_empty")
    : fail("tool_body_log_leak_findings_empty", lane.uxContract.bodyLogLeakFindings.join(",")));
  checks.push(lane.toolEvents.length === 2 && lane.toolEvents.every((event) => event.tool?.bodyLogPolicy === "compact_lane_only")
    ? pass("tool_progress_compact_lane_only", `${lane.toolEvents.length} tool events`)
    : fail("tool_progress_compact_lane_only", `${lane.toolEvents.length} tool events`));

  const failed = checks.filter((check) => check.status === "fail");
  const report = {
    schema: "gpao_t.conversation_ux_qa.v0_1",
    status: failed.length ? "fail" : "pass",
    createdAt: new Date().toISOString(),
    root,
    checks,
    progressLane: lane,
  };

  if (!noWrite) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(join(evidenceRoot, `conversation-ux-qa-${isoStamp()}.json`), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "gpao_t.conversation_ux_qa_error.v0_1",
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
