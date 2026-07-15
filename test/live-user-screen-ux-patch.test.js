import assert from "node:assert/strict";
import test from "node:test";

import {
  loadGpaoTPreviousChatsExpanded,
  patchChatPageSource,
  patchControlUiCssSource,
  patchControlUiIndexHtmlSource,
  patchControlUiServiceWorkerSource,
  patchGatewayClientInfoSource,
  patchKoreanLocaleSource,
  patchMainBundleSource,
  patchNodesPageSource,
  partitionGpaoTSidebarChats,
  persistGpaoTPreviousChatsExpanded,
} from "../tools/apply-openclaw-live-user-screen-ux-patch.mjs";

const patchToolSource = await import("node:fs/promises").then(({ readFile }) =>
  readFile(new URL("../tools/apply-openclaw-live-user-screen-ux-patch.mjs", import.meta.url), "utf8"),
);

const previousChatsMainBundleFixture = [
  "const f=(strings,...values)=>({strings,values}),F={chevronRight:`right`,chevronDown:`down`};",
  "function Ln(rows){return[{id:`ungrouped`,rows}]}function ti(){return new Set}",
  "var Zr=`gpao-t:sidebar:sessions:grouping`,Qr=`gpao-t:sidebar:sessions:collapsed-sections`,$r=/Mac/?`⌘K`:`Ctrl K`;",
  "function commandPaletteSearch(){return `Cmd-K search-all-sessions`}",
  "var U=class{",
  "constructor(){this.collapsedSessionSections=ti(),this.sessionSortMode=`created`}",
  "requestUpdate(){}",
  "getSessionNavigationState(){return{routeSessionKey:`current`,selectedAgentId:`main`,visibleSessions:[],newSessionDisabled:!1}}",
  "renderSessionSection(e,t=!1){let r=e.id===`pinned`,i=r||this.sessionsGrouping===`category`,a=i&&this.collapsedSessionSections.has(e.id);return f`${a?F.chevronRight:F.chevronDown}`}",
  "renderSessions(){let e=this.context,{routeSessionKey:t,selectedAgentId:n,visibleSessions:r,newSessionDisabled:i}=this.getSessionNavigationState(),c=Ln(r,{grouping:this.sessionsGrouping,knownGroups:this.sessionsGrouping===`category`?this.knownSessionGroups():void 0});return f`<div class=\"sidebar-recent-sessions\">${c.map(e=>this.renderSessionSection(e,r.length===0&&e.id===`ungrouped`))}</div>`}",
  "};",
].join("");

test("live user-screen patch defaults to the canonical GPAO-T runtime", () => {
  assert.match(patchToolSource, /\/Users\/jyp\/\.gpao-t\/current\/compatibility\/gpao-t\/dist/);
  assert.match(patchToolSource, /process\.env\.GPAO_T_LIVE_CHAT_PAGE/);
  assert.doesNotMatch(
    patchToolSource,
    /\/Users\/jyp\/\.local\/node-v24\.14\.0-darwin-arm64\/lib\/node_modules\/openclaw\/dist/,
  );
});

const fixture = [
  "function ju(e){let t=e.trim();return t?t.split(`:`).filter(Boolean).at(-1)??t:`Main Session`}",
  "function Mu(e){return String(e)}",
  "function Nu(e){return `없음`}",
  "function Lu(e){return {value:`압축 기준 없음`}}",
  "function Iu(e){return `waiting`}",
  "function ku(e){return e}",
  "function sd(e,t=!1){return t||e===`blocked`?`blocked`:`ready`}",
  "function q(e,t,n,r,i){return{id:e,label:t,state:n,title:r,details:i}}",
  "function rd(e,t){return e===`blocked`?`확인 필요`:t?.latestCompactionCheckpoint?`압축 기준 있음`:(t?.compactionCheckpointCount??0)>0?`요약 ${t?.compactionCheckpointCount}`:e===`retrieving-context`?`가져오는 중`:e===`running`||e===`done`||e===`ready`?`세션 연결`:`연결 대기`}",
  "function id(e){if(e?.archived)return`보관됨`;let t=Mu(e?.totalTokens??e?.contextTokens);return t?`${t} 토큰`:e?.systemSent?`부트스트랩`:e?.sessionId?`기록 유지`:`대기`}",
  "function ad(e){return e.lastError?`개입 필요`:e.selectedSession?.archived?`보관 잠금`:e.connected?`로컬 승인`:`연결 대기`}",
  "function od(e){return e.sending||e.streamActive?`실시간 출력`:e.loading?`로컬 준비`:e.selectedSession?.effectiveFastMode===!0?`Fast`:`즉시 입력`}",
  "function cd(e,t){let n=e.selectedSession,r=e.sourcePreview;return{context:{title:`Context Source`,rows:[{label:`소스`,value:r??`OpenClaw session row`}],flow:[q(`admission`,`admission`,`blocked`,`Admission Gate`,[`raw`])]},memory:{title:`Memory Candidate`},authority:{title:`Apply Gate`},speed:{title:`Route / Speed`}}}",
  "function aE(e,t={activeControl:null}){let n=t.activeControl?e.inspectors[t.activeControl]:null;return l`<section class=\"gpao-work-pane\"><div class=\"gpao-work-pane__control-rail\">${n?.title}</div></section>`}var oE=`next-anchor`;",
  "function ld(e){return{activeTarget:ju(e.sessionKey),inspectors:cd(e,`ready`)}}",
].join("");

test("patchChatPageSource turns developer strip into user-first screen model", () => {
  const patched = patchChatPageSource(fixture);

  assert.match(patched, /새 대화/);
  assert.match(patched, /작업 맥락/);
  assert.match(patched, /기억 준비됨/);
  assert.match(patched, /안전 모드/);
  assert.match(patched, /입력 가능/);
  assert.match(patched, /기본 화면은 사용자 흐름을 방해하지 않는 상태 표시만 유지합니다/);
  assert.match(patched, /gpao_t_user_screen_default_hides_work_pane_v0_1/);

  assert.doesNotMatch(patched, /Context Source/);
  assert.doesNotMatch(patched, /OpenClaw session row/);
  assert.doesNotMatch(patched, /gpao-work-pane/);
  assert.doesNotMatch(patched, /Admission Gate/);
  assert.doesNotMatch(patched, /Memory Candidate/);
  assert.doesNotMatch(patched, /Route \/ Speed/);
  assert.doesNotMatch(patched, /\$\{t\} 토큰/);
});

test("patchChatPageSource removes current hashed work pane renderer names", () => {
  const source = [
    "function DE(e,t={activeControl:null}){let n=t.activeControl?e.inspectors[t.activeControl]:null,r=n?n.flow.find(e=>e.id===t.activeFlowStepId)??n.flow[0]??null:null;return l`<section",
    "    class=\"gpao-work-pane\"",
    "    data-pane-id=${e.paneId}",
    "    aria-label=\"GPAO-T work pane status\"",
    "  ><div class=\"gpao-work-pane__control-rail\">${n?.title}</div></section>`}",
    "var OE=`.chat-controls__inline-select[open]`;",
  ].join("");

  const patched = patchChatPageSource(source);

  assert.match(patched, /function DE\(e,t=\{activeControl:null\}\)\{return l``\}/);
  assert.match(patched, /gpao_t_user_screen_default_hides_work_pane_v0_1/);
  assert.doesNotMatch(patched, /gpao-work-pane/);
  assert.doesNotMatch(patched, /GPAO-T work pane status/);
});

test("patchChatPageSource makes GPAO-T hyphenated metadata browser-safe", () => {
  const source = [
    "function xS(e){return Q(Q(e)?.__gpao-t)?.kind===`pending-send`}",
    "function SS(e){let t=Q(e);let n=Q(t.__gpao-t)?.id;return n}",
    "function Zc(e){let t=e.gpao-tStreamFallback;return t?.replacementText}",
    "function Qc(e,t){let r=t.gpao-tStreamFallback;return r?.source}",
    "function PS(e){return{role:`user`,__gpao-t:{kind:`pending-send`,id:e.id},gpao-tStreamFallback:{source:`x`},gpao-tMessageToolMirror:true}}",
    "var OE=`anchor`;",
  ].join("");

  const patched = patchChatPageSource(source);

  assert.match(patched, /\?\.\["__gpao-t"\]/);
  assert.match(patched, /t\["__gpao-t"\]/);
  assert.match(patched, /e\["gpao-tStreamFallback"\]/);
  assert.match(patched, /"__gpao-t":/);
  assert.match(patched, /"gpao-tStreamFallback":/);
  assert.match(patched, /"gpao-tMessageToolMirror":/);
  assert.doesNotMatch(patched, /\.__gpao-t/);
  assert.doesNotMatch(patched, /\.gpao-tStreamFallback/);
  assert.doesNotMatch(patched, /[^"']__gpao-t:/);
});

test("patchChatPageSource preserves unrelated minified functions and composer constants", () => {
  const source = [
    "function cd(e=[]){for(let t of e)sd(t.id)}",
    "var ld=`gpao-t.control.chatComposer.v1:`,ud=20,dd=50,fd=200,pd=class{persist(e){this.timer=globalThis.setTimeout(()=>this.persistNow(),fd)}};",
    "function md(){return fd}",
  ].join("");

  const patched = patchChatPageSource(source);

  assert.equal(patched, source);
  assert.match(patched, /function cd\(e=\[\]\)\{for\(let t of e\)sd\(t\.id\)\}/);
  assert.match(patched, /fd=200/);
  assert.match(patched, /persistNow\(\),fd/);
  assert.doesNotMatch(patched, /작업 맥락/);
});

test("patchChatPageSource recovers when microphone enumeration hangs", () => {
  const source =
    "async function Tp(e,t){let n=++e.realtimeTalkInputRefreshId;e.realtimeTalkInputLoading=!0,e.requestUpdate();try{let r=await df(t);if(n!==e.realtimeTalkInputRefreshId)return;e.realtimeTalkInputDevices=r.devices}finally{n===e.realtimeTalkInputRefreshId&&(e.realtimeTalkInputLoading=!1,e.requestUpdate())}}";

  const patched = patchChatPageSource(source);

  assert.match(patched, /Promise\.race\(\[df\(t\)/);
  assert.match(patched, /5e3/);
  assert.match(patched, /마이크 장치 응답이 지연되고 있습니다\. 다시 시도해 주세요\./);
  assert.match(patched, /gpao_t_realtime_input_timeout_v0_1/);
  assert.equal(patchChatPageSource(patched), patched);
});

test("patchChatPageSource makes tool and history copy user-facing", () => {
  const source = [
    fixture,
    "Showing last ${c} messages (${s} hidden).",
    "Compacted history",
    "The compacted transcript is preserved as a checkpoint. Open session checkpoints to branch or restore from that compacted view.",
    "Open checkpoints",
    "Tool error",
    "Tool output",
    "No output — tool failed.",
    "Activity: ${i} tool${i===1?``:`s`}, includes errors.",
    "Activity: ${i} tool${i===1?``:`s`}",
    "GPAO-T is responding...",
    "aria-label=${`Run status: ${n}`}",
    "Preparing model...",
    "Sending message...",
    "${C} is working...",
    "${C} is responding...",
    "Web Search",
    "Web Fetch",
  ].join("\n");
  const patched = patchChatPageSource(source);

  assert.match(patched, /최근 대화 \$\{c\}개를 표시 중입니다/);
  assert.match(patched, /정리된 이전 대화/);
  assert.match(patched, /도구 확인 필요/);
  assert.match(patched, /도구 결과/);
  assert.match(patched, /작업 기록: \$\{i\}개 도구/);
  assert.match(patched, /GPAO-T가 응답 중입니다/);
  assert.match(patched, /응답 상태: \$\{n\}/);
  assert.match(patched, /모델 준비 중/);
  assert.match(patched, /메시지 전송 중/);
  assert.match(patched, /\$\{C\}가 작업 중입니다/);
  assert.match(patched, /\$\{C\}가 응답 중입니다/);
  assert.match(patched, /Web 검색/);
  assert.match(patched, /Web 본문 읽기/);
  assert.doesNotMatch(patched, /Tool error/);
  assert.doesNotMatch(patched, /Activity:/);
  assert.doesNotMatch(patched, /Showing last/);
  assert.doesNotMatch(patched, /GPAO-T is responding/);
  assert.doesNotMatch(patched, /Run status:/);
  assert.doesNotMatch(patched, /Preparing model/);
  assert.doesNotMatch(patched, /Sending message/);
  assert.doesNotMatch(patched, /is working/);
  assert.doesNotMatch(patched, /is responding/);
});

test("patchChatPageSource is idempotent", () => {
  const once = patchChatPageSource(fixture);
  const twice = patchChatPageSource(once);
  assert.equal(twice, once);
});

test("patchControlUiCssSource hides existing developer work pane DOM", () => {
  const patched = patchControlUiCssSource(".app-shell{display:block}");

  assert.match(patched, /gpao_t_user_screen_default_hides_work_pane_css_v0_1/);
  assert.match(patched, /\.gpao-work-pane/);
  assert.match(patched, /display: none !important/);
  assert.match(patched, /height: 0 !important/);
  assert.match(patched, /overflow: hidden !important/);
  assert.match(patched, /gpao_t_sidebar_session_stack_no_overlap_v0_1/);
  assert.match(patched, /\.sidebar-recent-sessions > \.sidebar-recent-sessions__group/);
  assert.match(patched, /\.sidebar-recent-sessions > \.sidebar-previous-chats/);
  assert.match(patched, /flex-shrink: 0 !important/);
});

test("patchControlUiCssSource is idempotent", () => {
  const once = patchControlUiCssSource(".app-shell{display:block}");
  const twice = patchControlUiCssSource(once);
  assert.equal(twice, once);
});

test("patchControlUiIndexHtmlSource cache-busts the user screen CSS", () => {
  const html = '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"><script type="module" crossorigin src="./assets/index-C30DXdRd.js"></script></head><body>\n  </body></html>';
  const patched = patchControlUiIndexHtmlSource(html);

  assert.match(patched, /gpao_user_screen=2026071421/);
  assert.match(patched, /gpao_t_user_screen_css_cache_bust_v0_1/);
  assert.match(patched, /gpao_t_user_screen_cache_refresh_v0_15/);
  assert.match(patched, /gpao-t\.ui-build/);
  assert.match(patched, /gpao-t\.ui-build-reloaded/);
  assert.match(patched, /const build = "2026071421"/);
  assert.match(patched, /index-C30DXdRd\.js\?gpao_user_screen=2026071421/);
  assert.match(patched, /openclaw\.ui-build/);
  assert.doesNotMatch(patched, /user-screen-v3/);
  assert.match(patched, /window\.location\.reload/);
  assert.match(patched, /gpao-t-control-\|\^openclaw-control-/);
  assert.match(patched, /gpao_t_telegram_direct_communication_rail_v0_21/);
  assert.match(patched, /최근 대화 상태를 확인합니다/);
  assert.match(patched, /gpao-telegram-direct-link/);
  assert.doesNotMatch(patched, /list\.appendChild\(row\)/);
  assert.match(patched, /Telegram 전용 소통 세션 열기/);
  assert.match(patched, /소통/);
  assert.match(patched, /GPAO-T에게 메시지 입력/);
  assert.match(patched, /대화 메뉴 열기/);
  assert.match(patched, /채팅 열기/);
  assert.match(patched, /읽지 않음으로 표시/);
  assert.match(patched, /읽음으로 표시/);
  assert.match(patched, /이름 바꾸기…/);
  assert.match(patched, /대화 복제/);
  assert.match(patched, /그룹으로 이동/);
  assert.match(patched, /세션 보관 해제/);
  assert.match(patched, /그룹 이름 바꾸기/);
  assert.match(patched, /그룹 삭제/);
  assert.match(patched, /현재 GPAO-T는 이 Mac 안에서만 안전하게 열려 있습니다/);
  assert.match(patched, /모바일 연결 준비가 아직 완료되지 않았습니다/);
  assert.match(patched, /백그라운드 자동 실행이 아직 설정되지 않았습니다/);
  assert.match(patched, /색상 모드: 밝게/);
  assert.match(patched, /연결 주소/);
  assert.match(patched, /연결키 \(필요할 때만\)/);
  assert.match(patched, /GPAO-T 로컬 런타임에 연결하지 못했습니다/);
  assert.match(patched, /GPAO-T 런타임이 켜져 있는지 확인하세요/);
  assert.match(patched, /GPAO-T 연결 도움말/);
  assert.match(patched, /GPAO-T 실행 설정을 조정합니다/);
  assert.match(patched, /GPAO-T 기본 설정을 조정합니다/);
  assert.match(patched, /화면 스타일/);
  assert.match(patched, /집중/);
  assert.match(patched, /작업/);
  assert.match(patched, /개인 설정/);
  assert.match(patched, /기본 로고/);
  assert.match(patched, /GPAO-T 작업공간에서의 활동/);
  assert.match(patched, /이미지 지우기/);
  assert.match(patched, /GPAO-T 상태/);
  assert.match(patched, /GPAO-T 실행 환경/);
  assert.ok(patched.includes('"/settings/general"'));
  assert.match(patched, /GPAO-T는 대화에 필요한 기본 설정만 사용자 화면에 보여줍니다/);
  assert.match(patched, /내부 실행 정보와 원본 설정은 필요한 순간의 진단 화면에서만 다룹니다/);
  assert.match(patched, /최근 GPAO-T 대화 유지/);
  assert.match(patched, /GPAO-T/);
  assert.match(patched, /\$1개 기능 설치됨/);
  assert.match(patched, /기능과 도구/);
  assert.match(patched, /GPAO-T 지능/);
  assert.match(patched, /hiddenSettingLabels/);
  assert.doesNotMatch(patched, /작업공간 요약/);
  assert.doesNotMatch(patched, /gpao-workspace-user-summary/);
  assert.match(patched, /gpao_t_telegram_direct_communication_rail_v0_21/);
  assert.match(patched, /도구 확인 필요/);
  assert.match(patched, /일부 도구 확인 필요/);
  assert.match(patched, /작업 기록: \$1개 도구/);
  assert.match(patched, /최근 대화 \$1개를 표시 중입니다/);
  assert.match(patched, /새 작업 대화/);
  assert.match(patched, /data-gpao-t-hidden-worktree-action/);
  assert.match(patched, /새 작업 대화\|New chat in worktree\|worktree에서 새 채팅/);
  assert.match(patched, /data-gpao-t-hidden-connection-card/);
  assert.match(patched, /\.ov-recent__key/);
  assert.match(patched, /cleanLabel/);
  assert.doesNotMatch(patched, /button\.ov-card:disabled/);
  assert.doesNotMatch(patched, /element\.disabled = true/);
  assert.doesNotMatch(patched, /setAttribute\("aria-disabled", "true"\)/);
  assert.match(patched, /보관됨 숨기기/);
  assert.match(patched, /이전 화면으로/);
  assert.match(patched, /data-gpao-t-hidden-session-group-action/);
  assert.match(patched, /에이전트별 기능 허용 목록과 작업공간 기능입니다/);
  assert.match(patched, /cardTitle === "GPAO-T 연결 설정"/);
  assert.match(patched, /cardTitle === "현재 상태"/);
  assert.match(patched, /grid-column", "1 \/ -1/);
  assert.match(patched, /location\.pathname === "\/overview"/);
  assert.match(patched, /withoutRawSessionUuid/);
  assert.match(patched, /current\.replace/);
  assert.match(patched, /모델과 사고 수준:/);
  assert.doesNotMatch(patched, /이번 답변의 작동 근거/);
  assert.doesNotMatch(patched, /gpao-os-evidence-strip/);
  assert.match(patched, /RUNTIME-MANIFEST/);
  assert.match(patched, /gpao-telegram-direct-link/);
  assert.doesNotMatch(patched, /telegramRows\.slice\(1\)/);
  assert.match(patched, /"MCP"/);
  assert.match(patched, /"Worktree"/);
  assert.match(patched, /런타임 상태/);
  assert.match(patched, /GPAO-T 연결과 실행 상태를 확인합니다/);
  assert.match(patched, /GPAO-T 연결 설정/);
  assert.match(patched, /연결 정보를 변경했다면 ‘연결’을 눌러 적용하세요/);
  assert.match(patched, /현재 상태/);
  assert.match(patched, /GPAO-T의 최신 연결 상태입니다/);
  assert.match(patched, /GPAO-T 연결키/);
  assert.match(patched, /연결키 표시 여부 전환/);
  assert.match(patched, /ws:\/\/100\.x\.y\.z:18799/);
  assert.match(patched, /상태 확인 간격/);
  assert.match(patched, /마지막 채널 확인/);
  assert.match(patched, /연결 채널을/);
  assert.match(patched, /GPAO-T 런타임이/);
  assert.match(patched, /Telegram 등 연결된 채널의 상태는 연결 채널 설정에서 관리합니다/);
  assert.match(patched, /추가 설정이 필요한 기능/);
  assert.match(patched, /대화 기록 검색/);
  assert.match(patched, /element\.matches\?\.\("\.stat-value"\)/);
  assert.match(patched, /element\.textContent = "정상"/);
  assert.match(patched, /방금 전/);
  assert.match(patched, /\$1개 작업/);
  assert.match(patched, /\$1개 활성/);
  assert.match(patched, /토큰 \$1M · 메시지 \$2개/);
  assert.match(patched, /\$1\$2 전/);
  assert.match(patched, /초기화까지/);
  assert.match(patched, /자동화 일정/);
  assert.match(patched, /GPAO-T 작업의 진행 상태와 담당 흐름을 관리합니다/);
  assert.match(patched, /담당 에이전트: 전체/);
  assert.match(patched, /전체 에이전트/);
  assert.match(patched, /보관됨/);
  assert.match(patched, /카드 보기/);
  assert.match(patched, /빈 열 숨기기/);
  assert.match(patched, /작업 배정 확인/);
  assert.match(patched, /분류 대기/);
  assert.match(patched, /대기 작업/);
  assert.match(patched, /GPAO-T가 처리할 작업을 목록에 추가합니다/);
  assert.match(patched, /보통/);
  assert.match(patched, /할당되지 않음 \(기본 대화 사용\)/);
  assert.match(patched, /연결된 대화 없음/);
  assert.match(patched, /화면, 문서/);
  assert.match(patched, /GPAO-T의 작업 역할과 연결된 기능을 관리합니다/);
  assert.match(patched, /기본 에이전트/);
  assert.match(patched, /운영 기준/);
  assert.match(patched, /location\.pathname === "\/chat"/);
  assert.match(patched, /current\.trim\(\) === "파일"/);
  assert.match(patched, /node\.nodeValue = "파일 첨부"/);
  assert.match(patched, /작업 규칙/);
  assert.match(patched, /성격과 원칙/);
  assert.match(patched, /도구 권한/);
  assert.match(patched, /브라우저 도구가 설치되어 있지만 현재 에이전트 권한에는 포함되지 않았습니다/);
  assert.match(patched, /에이전트별 기능 허용 목록과 로컬 기능입니다/);
  assert.match(patched, /GPAO-T 브라우저로 여러 단계의 웹 작업/);
  assert.match(patched, /기본 에이전트 \(기본값\)/);
  assert.match(patched, /GPAO-T 전체 연결 채널 상태입니다/);
  assert.match(patched, /GPAO-T 자동화 실행 상태입니다/);
  assert.match(patched, /이 에이전트별 도구 권한입니다/);
  assert.match(patched, /기본 모델/);
  assert.match(patched, /작업공간 파일 열기/);
  assert.match(patched, /도구 미리보기/);
  assert.match(patched, /characterData: true/);
  assert.match(patched, /attributeFilter: \["aria-label", "title", "alt", "placeholder"\]/);
  assert.match(patched, /Telegram으로 알림 전송/);
  assert.match(patched, /지금 실행/);
  assert.match(patched, /화면 테마와 글자 크기를 조정합니다/);
  assert.match(patched, /원하는 화면 스타일을 선택하세요/);
  assert.match(patched, /연결 상태와 실행 정보를 확인합니다/);
  assert.match(patched, /주기 확인/);
  assert.match(patched, /마지막 연결 점검/);
  assert.match(patched, /연결 점검/);
  assert.match(patched, /연결 점검 성공/);
  assert.match(patched, /current\.trim\(\) === "예"/);
  assert.match(patched, /사용 중/);
  assert.match(patched, /메시지 삭제/);
  assert.match(patched, /대화 모델/);
  assert.match(patched, /OpenAI 모델/);
  assert.match(patched, /응답 속도/);
  assert.match(patched, /기본 사고 수준 사용/);
  assert.match(patched, /빠른 응답: 표준/);
  assert.match(patched, /메시지 정보:/);
  assert.match(patched, /캔버스에서 열기/);
  assert.match(patched, /마크다운으로 복사/);
  assert.match(patched, /응답 상태: 완료/);
  assert.match(patched, /응답 중지/);
  assert.match(patched, /웹 검색 확인/);
  assert.match(patched, /settings-theme-import__inline-hint/);
  assert.match(patched, /a\[href="\/settings\/communications"\]/);
  assert.match(patched, /route === "\/settings\/appearance"/);
  assert.match(patched, /route === "\/settings\/channels"/);
  assert.match(patched, /gpao-t-update-banner, \.update-banner/);
  assert.match(patched, /모바일 기기 페어링\|Pair a mobile device/);
  assert.match(patched, /element\.matches\?\.\("button"\)/);
  assert.match(patched, /data-gpao-t-user-settings-summary/);
  assert.match(patched, /existing\.remove\(\)/);
  assert.match(patched, /에이전트 화면 열기/);
  assert.match(patched, /연결 채널 열기/);
  assert.match(patched, /GPAO-T 0\.1\.0/);
  assert.match(patched, /전체 SHA-256 봉인/);
  assert.match(patched, /GPAO-T 전용 업데이트 채널 준비 전 자동 업데이트 차단/);
  assert.match(patched, /details\.ov-event-log, details\.ov-log-tail/);
  assert.match(patched, /removeAttribute\("open"\)/);
  assert.match(patched, /GPAO-T 로컬 런타임/);
  assert.match(patched, /GPAO-T 대화 기록/);
  assert.match(patched, /기능 작업실/);
  assert.match(patched, /GPAO-T 완성/);
  assert.match(patched, /새 대화/);
  assert.match(patched, /대화 준비됨/);
  assert.match(patched, /메시지를 입력하세요/);
  assert.match(patched, /Type a message below\\s\*·/);
  assert.match(patched, /\\bfor commands\\b/);
  assert.match(patched, /current\.trim\(\) === "\/"/);
  assert.match(patched, /closest\?\.\("\.chat-text"\)/);
  assert.match(patched, /무엇을 도와줄 수 있어\?/);
  assert.match(patched, /최근 대화 요약/);
  assert.match(patched, /연결 채널 설정 도와줘/);
  assert.match(patched, /시스템 상태 확인/);
  assert.match(patched, /사고 수준/);
  assert.match(patched, /판단/);
  assert.match(patched, /되돌리기/);
});

test("patchMainBundleSource keeps fresh GPAO-T browser sessions on the live runtime contract", () => {
  const source = [
    "function Wh(){let e=window.webkit?.messageHandlers?.gpao-tLink;return e?.postMessage.bind(e)}",
    "function yh(){let e=`ws`,t=`/`;return _h()?{pageUrl:`${e}://${location.host}${t}`,effectiveUrl:`${e}://${vh(location.hostname,`18789`)}`}:{pageUrl:`x`,effectiveUrl:`x`}}",
    "function Lh(){let f=r({url:l.gatewayUrl,clientName:`gpao-t-control-ui`,clientVersion:`dev`,mode:`webchat`,instanceId:_()})}",
    "const html = l`<input placeholder=\"ws://127.0.0.1:18789\" />`;",
    "const msg = `open the loopback dashboard at http://127.0.0.1:18789.`;",
    'const deps = ["./display-DFvXipLJ.js","./chat-page-DSCCRkzA.js"];',
  ].join("\n");

  const patched = patchMainBundleSource(source);

  assert.match(patched, /gpao_t_main_bundle_runtime_guard_v0_1/);
  assert.match(patched, /vh\(location\.hostname,`18799`\)/);
  assert.match(patched, /placeholder="ws:\/\/127\.0\.0\.1:18799"/);
  assert.match(patched, /mode:`ui`/);
  assert.match(patched, /http:\/\/127\.0\.0\.1:18799\./);
  assert.match(patched, /display-DFvXipLJ\.js\?gpao_live=2026071421/);
  assert.match(patched, /chat-page-DSCCRkzA\.js\?gpao_live=2026071421/);
  assert.doesNotMatch(patched, /18789/);
  assert.doesNotMatch(patched, /mode:`webchat`/);
});

test("patchMainBundleSource adds the collapsed previous-chat disclosure and toggle at source level", () => {
  const patched = patchMainBundleSource(previousChatsMainBundleFixture);

  assert.match(patched, /gpao_t_sidebar_previous_chats_disclosure_v0_1/);
  assert.match(patched, /gpao-t:sidebar:previous-chats-expanded/);
  assert.match(
    patched,
    /this\.previousChatsExpanded=loadGpaoTPreviousChatsExpanded\(\)/,
  );
  assert.match(patched, /previousCount>0\?f`/);
  assert.match(patched, /aria-expanded=\$\{String\(this\.previousChatsExpanded\)\}/);
  assert.match(patched, /이전 대화 \$\{__gpaoTPreviousChats\.previousCount\}/);
  assert.match(patched, /chevronDown:F\.chevronRight/);
  assert.match(
    patched,
    /this\.collapsedSessionSections\.has\(e\.id\)&&!e\.gpaoTForceExpanded/,
  );
  assert.match(
    patched,
    /persistGpaoTPreviousChatsExpanded\(this\.previousChatsExpanded\),this\.requestUpdate\(\)/,
  );
  assert.equal(patched.match(/이전 대화/g)?.length, 1);
  assert.match(patched, /Cmd-K search-all-sessions/);
});

test("patchMainBundleSource previous-chat disclosure is idempotent", () => {
  const once = patchMainBundleSource(previousChatsMainBundleFixture);
  assert.equal(patchMainBundleSource(once), once);
});

test("patchMainBundleSource previous-chat anchors fail closed on drift or duplication", () => {
  const drifted = previousChatsMainBundleFixture.replace(
    "var Zr=`gpao-t:sidebar:sessions:grouping`,Qr=`gpao-t:sidebar:sessions:collapsed-sections`,",
    "var Zr=`drifted`,Qr=`drifted`,",
  );
  assert.throws(
    () => patchMainBundleSource(drifted),
    /main bundle previous chats storage: expected exactly one anchor, found 0/,
  );

  const duplicated = previousChatsMainBundleFixture.replace(
    "var Zr=`gpao-t:sidebar:sessions:grouping`,",
    "var Xr=`openclaw:sidebar:sessions:grouping`,Yr=`openclaw:sidebar:sessions:collapsed-sections`,var Zr=`gpao-t:sidebar:sessions:grouping`,",
  );
  assert.throws(
    () => patchMainBundleSource(duplicated),
    /main bundle previous chats storage: expected exactly one anchor, found 2/,
  );
});

test("previous-chat persistence defaults malformed and missing storage to collapsed", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(loadGpaoTPreviousChatsExpanded(storage), false);
  values.set("gpao-t:sidebar:previous-chats-expanded", "not-json");
  assert.equal(loadGpaoTPreviousChatsExpanded(storage), false);
  values.set("gpao-t:sidebar:previous-chats-expanded", "false");
  assert.equal(loadGpaoTPreviousChatsExpanded(storage), false);
  values.set("gpao-t:sidebar:previous-chats-expanded", "true");
  assert.equal(loadGpaoTPreviousChatsExpanded(storage), true);

  persistGpaoTPreviousChatsExpanded(false, storage);
  assert.equal(values.get("gpao-t:sidebar:previous-chats-expanded"), "false");
  persistGpaoTPreviousChatsExpanded(true, storage);
  assert.equal(values.get("gpao-t:sidebar:previous-chats-expanded"), "true");
});

test("previous-chat partition keeps current pinned running and Telegram chats visible", () => {
  const sections = [
    { id: "pinned", rows: [{ key: "pinned", pinned: true }] },
    {
      id: "category:work",
      category: "work",
      rows: [
        { key: "old-work-1" },
        { key: "current", active: true },
        { key: "agent:main:telegram:direct:42" },
        { key: "old-work-2" },
      ],
    },
    {
      id: "ungrouped",
      rows: [
        { key: "running", hasActiveRun: true },
        { key: "old-ungrouped" },
      ],
    },
  ];

  const partitioned = partitionGpaoTSidebarChats(sections);

  assert.deepEqual(
    partitioned.currentSections.flatMap((section) => section.rows.map((row) => row.key)),
    ["pinned", "current", "agent:main:telegram:direct:42", "running"],
  );
  assert.deepEqual(
    partitioned.previousSections.map((section) => ({
      id: section.id,
      keys: section.rows.map((row) => row.key),
    })),
    [
      { id: "category:work", keys: ["old-work-1", "old-work-2"] },
      { id: "ungrouped", keys: ["old-ungrouped"] },
    ],
  );
  assert.equal(partitioned.previousCount, 3);
  assert.equal(
    partitioned.currentSections.every((section) => section.gpaoTForceExpanded === true),
    true,
  );
});

test("previous-chat partition emits zero disclosure rows when every chat must stay visible", () => {
  const partitioned = partitionGpaoTSidebarChats([
    {
      id: "ungrouped",
      rows: [
        { key: "selected", visuallyActive: true },
        { key: "pinned", pinned: true },
      ],
    },
  ]);

  assert.equal(partitioned.previousCount, 0);
  assert.deepEqual(partitioned.previousSections, []);
  assert.deepEqual(
    partitioned.currentSections[0].rows.map((row) => row.key),
    ["selected", "pinned"],
  );
});

test("patchGatewayClientInfoSource accepts the GPAO-T control UI client identity", () => {
  const source = [
    "const GATEWAY_CLIENT_IDS = {",
    '\tWEBCHAT_UI: "webchat-ui",',
    '\tCONTROL_UI: "openclaw-control-ui",',
    '\tTUI: "openclaw-tui",',
    '};',
    "const GATEWAY_CLIENT_NAMES = GATEWAY_CLIENT_IDS;",
  ].join("\n");

  const patched = patchGatewayClientInfoSource(source);

  assert.match(patched, /GPAO_T_CONTROL_UI: "gpao-t-control-ui"/);
  assert.match(patched, /gpao_t_gateway_client_identity_contract_v0_1/);
  assert.match(patched, /CONTROL_UI: "openclaw-control-ui"/);
  assert.equal(patchGatewayClientInfoSource(patched), patched);
});

test("patchKoreanLocaleSource removes English session menu fallbacks", () => {
  const source = [
    "var e={sessions:{",
    "unread:`Unread`,",
    "renameSessionMenu:`Rename…`,",
    "markUnread:`Mark as unread`,",
    "markRead:`Mark as read`,",
    "forkSession:`Fork`,",
    "deleteSessionMenu:`Delete…`,",
    'deleteSessionConfirm:`Delete "{session}" and its transcript?`,',
    "moveToGroupMenu:`Move to group`,",
    "removeFromGroup:`Remove from group`",
    "}};",
  ].join("");

  const patched = patchKoreanLocaleSource(source);

  assert.match(patched, /unread:`읽지 않음`/);
  assert.match(patched, /renameSessionMenu:`이름 바꾸기…`/);
  assert.match(patched, /markUnread:`읽지 않음으로 표시`/);
  assert.match(patched, /markRead:`읽음으로 표시`/);
  assert.match(patched, /forkSession:`대화 복제`/);
  assert.match(patched, /deleteSessionMenu:`삭제…`/);
  assert.match(patched, /deleteSessionConfirm:`"\{session\}" 대화와 기록을 삭제할까요\?`/);
  assert.match(patched, /moveToGroupMenu:`그룹으로 이동`/);
  assert.match(patched, /removeFromGroup:`그룹에서 제거`/);
  assert.match(patched, /gpao_t_korean_session_menu_complete_v0_1/);
  assert.doesNotMatch(patched, /Mark as unread|Rename…|Fork|Move to group|Delete…/);
  assert.equal(patchKoreanLocaleSource(patched), patched);
});

test("patchControlUiServiceWorkerSource serves live UI assets network-first", () => {
  const source = [
    'const EMBEDDED_CACHE_VERSION = "2026.6.11-abc";',
    "const CONTROL_CACHE_LIMIT = 3;",
    "// Cache-first for hashed assets; network-first for HTML/other.",
    '  if (url.pathname.includes("/assets/")) {',
    "    event.respondWith(",
    "      caches.match(event.request).then(",
    "        (cached) =>",
    "          cached ||",
    "          fetch(event.request).then((response) => {",
    "            if (response.ok) {",
    "              const clone = response.clone();",
    "              void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));",
    "            }",
    "            return response;",
    "          }),",
    "      ),",
    "    );",
    "  } else {",
  ].join("\n");
  const patched = patchControlUiServiceWorkerSource(source);

  assert.match(patched, /gpao_t_user_screen_network_first_assets_v0_15/);
  assert.match(patched, /const CONTROL_CACHE_LIMIT = 1/);
  assert.match(patched, /user-screen-v6/);
  assert.match(patched, /fetch\(event\.request\)/);
  assert.match(patched, /catch\(\(\) => caches\.match\(event\.request\)\)/);
  assert.doesNotMatch(patched, /cached \|\|/);
});

test("patchControlUiServiceWorkerSource is idempotent", () => {
  const source = [
    'const EMBEDDED_CACHE_VERSION = "2026.6.11-abc";',
    "const CONTROL_CACHE_LIMIT = 3;",
    "// Cache-first for hashed assets; network-first for HTML/other.",
    '  if (url.pathname.includes("/assets/")) {',
    "    event.respondWith(",
    "      caches.match(event.request).then(",
    "        (cached) =>",
    "          cached ||",
    "          fetch(event.request).then((response) => {",
    "            if (response.ok) {",
    "              const clone = response.clone();",
    "              void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));",
    "            }",
    "            return response;",
    "          }),",
    "      ),",
    "    );",
    "  } else {",
  ].join("\n");
  const once = patchControlUiServiceWorkerSource(source);
  const twice = patchControlUiServiceWorkerSource(once);
  assert.equal(twice, once);
});

test("patchMainBundleSource fixes hyphenated native link handler without breaking startup", () => {
  const source = "function Wh(){let e=window.webkit?.messageHandlers?.gpao-tLink;return e?.postMessage.bind(e)}";
  const patched = patchMainBundleSource(source);

  assert.match(patched, /gpao_t_main_bundle_runtime_guard_v0_1/);
  assert.match(patched, /messageHandlers\?\.\["gpao-tLink"\]/);
  assert.match(patched, /messageHandlers\?\.gpaoTLink/);
  assert.doesNotMatch(patched, /messageHandlers\?\.gpao-tLink/);
});

test("patchMainBundleSource is idempotent", () => {
  const source = "function Wh(){let e=window.webkit?.messageHandlers?.gpao-tLink;return e?.postMessage.bind(e)}";
  const once = patchMainBundleSource(source);
  const twice = patchMainBundleSource(once);
  assert.equal(twice, once);
});

test("patchControlUiIndexHtmlSource is idempotent", () => {
  const html = '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"><script type="module" crossorigin src="./assets/index-C30DXdRd.js"></script></head><body>\n  </body></html>';
  const once = patchControlUiIndexHtmlSource(html);
  const twice = patchControlUiIndexHtmlSource(once);
  assert.equal(twice, once);
});

test("patchControlUiIndexHtmlSource replaces older telegram rail script", () => {
  const html = [
    '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"><script type="module" crossorigin src="./assets/index-C30DXdRd.js"></script></head><body>',
    '    <script data-gpao-t="gpao_t_telegram_direct_communication_rail_v0_5">old()</script>',
    "  </body></html>",
  ].join("\n");
  const patched = patchControlUiIndexHtmlSource(html);

  assert.doesNotMatch(patched, /gpao_t_telegram_direct_communication_rail_v0_5/);
  assert.match(patched, /gpao_t_telegram_direct_communication_rail_v0_21/);
});

test("patchNodesPageSource turns node operations copy into user-facing GPAO-T copy", () => {
  const source = [
    'Allowlist and approval policy for <span class="mono">exec host=gateway/node</span>.',
    "Gateway edits local approvals; node edits the selected node.",
    "Default security mode.",
    "Default prompt policy.",
    "${e.duplicates.length} older pairing${e.duplicates.length===1?``:`s`} of",
    "No nodes with system.run available.",
    "Pin agents to a specific node when using exec host=node.",
    "Default binding",
    "Used when agents do not override a node binding.",
    "${e.isDefault?`default agent`:`agent`} ·",
    "${n===`__default__`?`uses default (${t.defaultBinding??`any`})`:`override: ${e.binding}`}",
  ].join("\n");
  const patched = patchNodesPageSource(source);

  assert.match(patched, /실행 기기별 허용 목록과 승인 정책을 관리합니다/);
  assert.match(patched, /GPAO-T 런타임과 선택한 기기의 실행 승인을 관리합니다/);
  assert.match(patched, /기본 보안 모드입니다/);
  assert.match(patched, /기본 확인 정책입니다/);
  assert.match(patched, /\$\{e\.duplicates\.length\}개 이전 연결:/);
  assert.match(patched, /현재 실행 가능한 노드가 없습니다/);
  assert.match(patched, /실행할 기기를 특정 노드에 고정합니다/);
  assert.match(patched, /기본 고정/);
  assert.match(patched, /별도 기기 지정이 없을 때 사용하는 기본값입니다/);
  assert.match(patched, /\$\{e\.isDefault\?`기본 대화`:`대화`\} ·/);
  assert.match(patched, /기본 기준 사용/);
  assert.doesNotMatch(patched, /older pairing/);
  assert.doesNotMatch(patched, /exec host=gateway/);
  assert.doesNotMatch(patched, /default agent/);
  assert.doesNotMatch(patched, /uses default/);
});
