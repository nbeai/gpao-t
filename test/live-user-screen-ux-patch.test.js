import assert from "node:assert/strict";
import test from "node:test";

import {
  patchChatPageSource,
  patchControlUiCssSource,
  patchControlUiIndexHtmlSource,
  patchNodesPageSource,
} from "../tools/apply-openclaw-live-user-screen-ux-patch.mjs";

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
  "function cd(e,t){return{context:{title:`Context Source`,rows:[{label:`소스`,value:`OpenClaw session row`}],flow:[q(`admission`,`admission`,`blocked`,`Admission Gate`,[`raw`])]},memory:{title:`Memory Candidate`},authority:{title:`Apply Gate`},speed:{title:`Route / Speed`}}}",
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
});

test("patchControlUiCssSource is idempotent", () => {
  const once = patchControlUiCssSource(".app-shell{display:block}");
  const twice = patchControlUiCssSource(once);
  assert.equal(twice, once);
});

test("patchControlUiIndexHtmlSource cache-busts the user screen CSS", () => {
  const html = '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"></head><body>\n  </body></html>';
  const patched = patchControlUiIndexHtmlSource(html);

  assert.match(patched, /gpao_user_screen=2026071203/);
  assert.match(patched, /gpao_t_user_screen_css_cache_bust_v0_1/);
  assert.match(patched, /gpao_t_telegram_direct_communication_rail_v0_7/);
  assert.match(patched, /Telegram 전용 소통 세션 열기/);
  assert.match(patched, /소통/);
  assert.match(patched, /GPAO-T에게 메시지 입력/);
  assert.match(patched, /대화 메뉴 열기/);
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
  assert.match(patched, /작업공간 요약/);
  assert.match(patched, /고급 파일/);
  assert.doesNotMatch(patched, /이번 답변의 작동 근거/);
  assert.doesNotMatch(patched, /gpao-os-evidence-strip/);
  assert.match(patched, /RUNTIME-MANIFEST/);
  assert.match(patched, /telegramRows\.slice\(1\)/);
  assert.match(patched, /"MCP"/);
  assert.match(patched, /"Worktree"/);
  assert.match(patched, /런타임 상태/);
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
  assert.match(patched, /무엇을 도와줄 수 있어\?/);
  assert.match(patched, /최근 대화 요약/);
  assert.match(patched, /연결 채널 설정 도와줘/);
  assert.match(patched, /시스템 상태 확인/);
  assert.match(patched, /사고 수준/);
  assert.match(patched, /판단/);
  assert.match(patched, /되돌리기/);
});

test("patchControlUiIndexHtmlSource is idempotent", () => {
  const html = '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"></head><body>\n  </body></html>';
  const once = patchControlUiIndexHtmlSource(html);
  const twice = patchControlUiIndexHtmlSource(once);
  assert.equal(twice, once);
});

test("patchControlUiIndexHtmlSource replaces older telegram rail script", () => {
  const html = [
    '<html><head><link rel="stylesheet" crossorigin href="./assets/index-DnZhFp1V.css"></head><body>',
    '    <script data-gpao-t="gpao_t_telegram_direct_communication_rail_v0_5">old()</script>',
    "  </body></html>",
  ].join("\n");
  const patched = patchControlUiIndexHtmlSource(html);

  assert.doesNotMatch(patched, /gpao_t_telegram_direct_communication_rail_v0_5/);
  assert.match(patched, /gpao_t_telegram_direct_communication_rail_v0_7/);
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
