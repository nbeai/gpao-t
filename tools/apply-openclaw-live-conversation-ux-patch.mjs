#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const LIVE_ROOT =
  process.env.OPENCLAW_LIVE_DIST ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const CHAT_PAGE =
  process.env.OPENCLAW_LIVE_CHAT_PAGE ||
  join(LIVE_ROOT, "control-ui", "assets", "chat-page-BSHc822R.js");
const GPAO_HANDLER =
  process.env.OPENCLAW_LIVE_GPAO_HANDLER ||
  join(LIVE_ROOT, "gpao-t-B6WiwufB.js");
const BACKUP_ROOT =
  process.env.GPAO_T_LIVE_PATCH_BACKUP_ROOT ||
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-conversation-ux-patch";
const APPLY_TOKEN = "apply-gpao-t-conversation-ux-live";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function replaceOnce(source, needle, replacement, fileLabel) {
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${fileLabel}: expected exactly one anchor, found ${count}`);
  }
  return source.replace(needle, replacement);
}

function replaceOnceOrAlready(source, needle, replacement, marker, fileLabel) {
  if (source.includes(marker)) return source;
  return replaceOnce(source, needle, replacement, fileLabel);
}

function patchGpaoHandler(source) {
  let next = source;
  next = replaceOnceOrAlready(
    next,
    'const DEFAULT_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH = join(homedir(), "Documents", "Playground 2", ".gpao-t", "chat", "answer-memory-candidate-drafts.jsonl");',
    'const DEFAULT_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH = join(homedir(), "Documents", "Playground 2", ".gpao-t", "chat", "answer-memory-candidate-drafts.jsonl");\nconst DEFAULT_CONVERSATION_PROGRESS_PATH = join(homedir(), "Documents", "Playground 2", "gpao-t", ".gpao-t", "live-turn", "progress-events.jsonl");',
    "DEFAULT_CONVERSATION_PROGRESS_PATH",
    "gpao handler constants",
  );
  next = replaceOnceOrAlready(
    next,
    "function resolveAnswerMemoryCandidateDraftPath() {\n\treturn process.env.GPAO_T_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH?.trim() || DEFAULT_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH;\n}",
    "function resolveAnswerMemoryCandidateDraftPath() {\n\treturn process.env.GPAO_T_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH?.trim() || DEFAULT_ANSWER_MEMORY_CANDIDATE_DRAFT_PATH;\n}\nfunction resolveConversationProgressPath() {\n\treturn process.env.GPAO_T_CONVERSATION_PROGRESS_PATH?.trim() || DEFAULT_CONVERSATION_PROGRESS_PATH;\n}",
    "resolveConversationProgressPath",
    "gpao handler resolve progress path",
  );
  next = replaceOnceOrAlready(
    next,
    "async function appendJsonl(path, record) {\n\tawait mkdir(dirname(path), { recursive: true });\n\tawait writeFile(path, `${JSON.stringify(record)}\\n`, { flag: \"a\" });\n}",
    "async function appendJsonl(path, record) {\n\tawait mkdir(dirname(path), { recursive: true });\n\tawait writeFile(path, `${JSON.stringify(record)}\\n`, { flag: \"a\" });\n}\nasync function readConversationProgressLane(path) {\n\ttry {\n\t\tconst raw = await readFile(path, \"utf8\");\n\t\tconst events = raw.split(/\\r?\\n/).filter(Boolean).slice(-20).map((line) => JSON.parse(line));\n\t\tconst visibleItems = events.slice(-8).map((event) => ({\n\t\t\tid: event.id,\n\t\t\tphase: event.phase,\n\t\t\tlabel: event.label,\n\t\t\tdetail: event.detail,\n\t\t\ttoolName: event.tool?.name ?? null,\n\t\t\ttoolStatus: event.tool?.status ?? null,\n\t\t\texpandableTrace: event.tool?.expandableTrace !== false\n\t\t}));\n\t\treturn {\n\t\t\tschema: \"gpao_t.conversation_progress_lane.v0_1\",\n\t\t\tstatus: events.length ? \"ready\" : \"empty\",\n\t\t\tsource: { kind: \"gpao_t_live_progress_jsonl\", path },\n\t\t\tlatest: events.at(-1) ?? null,\n\t\t\tevents,\n\t\t\tvisibleItems,\n\t\t\tuxContract: {\n\t\t\t\tfirstProgressTargetMs: 3000,\n\t\t\t\tfirstProgressUnderTarget: events.some((event) => event.phase === \"context_retrieval\" && typeof event.elapsedMs === \"number\" && event.elapsedMs <= 3000),\n\t\t\t\tlongTurnMidProgressRequired: true,\n\t\t\t\thasMidProgressBeforeComplete: events.some((event) => event.phase === \"verifying\" || event.phase === \"self_growth_review\" || event.phase === \"tool_running\"),\n\t\t\t\ttokenStreamingRequiredButNotSufficient: true,\n\t\t\t\ttoolLogsInBody: \"blocked\",\n\t\t\t\tbodyLogLeakFindings: []\n\t\t\t}\n\t\t};\n\t} catch (error) {\n\t\treturn {\n\t\t\tschema: \"gpao_t.conversation_progress_lane.v0_1\",\n\t\t\tstatus: \"blocked\",\n\t\t\tsource: { kind: \"gpao_t_live_progress_jsonl\", path },\n\t\t\terror: error instanceof Error ? error.message : String(error),\n\t\t\tvisibleItems: [],\n\t\t\tuxContract: {\n\t\t\t\tfirstProgressTargetMs: 3000,\n\t\t\t\tfirstProgressUnderTarget: false,\n\t\t\t\tlongTurnMidProgressRequired: true,\n\t\t\t\thasMidProgressBeforeComplete: false,\n\t\t\t\ttokenStreamingRequiredButNotSufficient: true,\n\t\t\t\ttoolLogsInBody: \"blocked\",\n\t\t\t\tbodyLogLeakFindings: [\"progress_lane_unavailable\"]\n\t\t\t}\n\t\t};\n\t}\n}",
    "readConversationProgressLane",
    "gpao handler progress reader",
  );
  next = replaceOnceOrAlready(
    next,
    "\t\tconst llmReadyPacket = await readNormalizedState(llmReadyPacketPath, blockedLlmReadyPacketState);\n\t\trespond(true, {",
    "\t\tconst llmReadyPacket = await readNormalizedState(llmReadyPacketPath, blockedLlmReadyPacketState);\n\t\tconst conversationProgressLane = await readConversationProgressLane(resolveConversationProgressPath());\n\t\tconst replayStateWithProgress = { ...state, conversationProgressLane };\n\t\trespond(true, {",
    "replayStateWithProgress",
    "gpao handler progress read",
  );
  next = replaceOnceOrAlready(
    next,
    "\t\t\tstate,\n\t\t\tapplyGate,",
    "\t\t\tstate: replayStateWithProgress,\n\t\t\tconversationProgressLane,\n\t\t\tapplyGate,",
    "conversationProgressLane,",
    "gpao handler progress payload",
  );
  return next;
}

function patchChatPage(source) {
  let next = source;
  next = replaceOnceOrAlready(
    next,
    "steps:[{id:`target`,label:`목표`,state:Au(t,`target`)},{id:`context`,label:`맥락`,state:Au(t,`context`)},{id:`execute`,label:`실행`,state:Au(t,`execute`)},{id:`answer`,label:`응답`,state:Au(t,`answer`)}],controls:",
    "steps:[{id:`target`,label:`목표`,state:Au(t,`target`)},{id:`context`,label:`맥락`,state:Au(t,`context`)},{id:`execute`,label:`실행`,state:Au(t,`execute`)},{id:`answer`,label:`응답`,state:Au(t,`answer`)}].concat((Array.isArray(e.conversationProgressLane?.visibleItems)?e.conversationProgressLane.visibleItems.slice(-4):[]).map((t,n)=>({id:t.id??`conversation-progress-${n}`,label:t.toolName?`${t.label}: ${t.toolName}`:t.label,state:t.phase===`complete`||t.phase===`tool_complete`?`complete`:t.phase===`tool_error`||t.phase===`blocked`?`blocked`:`next`}))),controls:",
    "conversationProgressLane?.visibleItems",
    "chat page progress steps",
  );
  next = replaceOnceOrAlready(
    next,
    "llmReadyPacket:m});e.lastError",
    "llmReadyPacket:m,conversationProgressLane:d?.conversationProgressLane??null});e.lastError",
    "conversationProgressLane:d?.conversationProgressLane??null",
    "chat page progress model",
  );
  next = replaceOnceOrAlready(
    next,
    "this.gpaoAppliedReplayRequestVersion=0,",
    "this.gpaoAppliedReplayRequestVersion=0,this.gpaoConversationProgressRefreshTimer=null,this.scheduleGpaoConversationProgressRefresh=e=>{let t=this.state;if(!t?.connected)return;let n=e?.payload??e,r=typeof n?.sessionKey==`string`?n.sessionKey:typeof e?.sessionKey==`string`?e.sessionKey:null;if(r&&r!==t.sessionKey)return;let i=e?.event;if(i&&![`agent`,`session.tool`,`session.message`,`sessions.changed`,`chat.message`,`chat.run`].includes(i))return;this.gpaoConversationProgressRefreshTimer!=null&&globalThis.clearTimeout(this.gpaoConversationProgressRefreshTimer),this.gpaoConversationProgressRefreshTimer=globalThis.setTimeout(()=>{this.gpaoConversationProgressRefreshTimer=null;let e=this.state;if(!e)return;let t=e.sessionsResult?.sessions.find(t=>L(t.key,e.sessionKey))??null;this.refreshGpaoAppliedReplay(t)},500)},",
    "gpaoConversationProgressRefreshTimer",
    "chat page progress refresh scheduler",
  );
  next = replaceOnceOrAlready(
    next,
    "e.addCleanup(this.context.gateway.subscribeEvents(e=>{let t=this.state;t&&(e.event===`task.suggestion`&&e.payload&&this.handleTaskSuggestionEvent(e.payload),ay(t,e))}))",
    "e.addCleanup(this.context.gateway.subscribeEvents(e=>{let t=this.state;t&&(e.event===`task.suggestion`&&e.payload&&this.handleTaskSuggestionEvent(e.payload),ay(t,e),this.scheduleGpaoConversationProgressRefresh?.(e))}))",
    "scheduleGpaoConversationProgressRefresh?.(e)",
    "chat page progress event subscription",
  );
  next = replaceOnceOrAlready(
    next,
    "this.nativeDraftCleanup?.(),this.nativeDraftCleanup=null,",
    "this.gpaoConversationProgressRefreshTimer!=null&&(globalThis.clearTimeout(this.gpaoConversationProgressRefreshTimer),this.gpaoConversationProgressRefreshTimer=null),this.nativeDraftCleanup?.(),this.nativeDraftCleanup=null,",
    "clearTimeout(this.gpaoConversationProgressRefreshTimer)",
    "chat page progress refresh cleanup",
  );
  return next;
}

async function main() {
  const apply = hasArg("--apply");
  const token = readArg("--token");
  const stamp = isoStamp();
  const backupDir = join(BACKUP_ROOT, stamp);

  const files = [
    { path: GPAO_HANDLER, label: "gpao-handler", patch: patchGpaoHandler },
    { path: CHAT_PAGE, label: "chat-page", patch: patchChatPage },
  ];

  const results = [];
  for (const file of files) {
    const before = await readFile(file.path, "utf8");
    const after = file.patch(before);
    results.push({
      label: file.label,
      path: file.path,
      changed: before !== after,
      beforeBytes: Buffer.byteLength(before),
      afterBytes: Buffer.byteLength(after),
    });
    if (apply) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      await copyFile(file.path, join(backupDir, `${file.label}.bak.js`));
      await writeFile(file.path, after);
    }
  }

  const report = {
    schema: "gpao_t.live_conversation_ux_patch.v0_1",
    status: apply ? "applied" : "dry_run",
    createdAt: new Date().toISOString(),
    backupDir: apply ? backupDir : null,
    applyToken: APPLY_TOKEN,
    results,
    nextVerification: [
      "node --check live gpao handler",
      "node --check live chat page",
      "openclaw status --all",
      "dashboard visual check for compact progress lane",
    ],
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
