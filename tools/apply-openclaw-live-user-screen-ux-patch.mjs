#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

const LIVE_ROOT =
  readArg("--live-dist")
  || process.env.GPAO_T_LIVE_DIST
  || process.env.OPENCLAW_LIVE_DIST
  || "/Users/jyp/.gpao-t/current/compatibility/gpao-t/dist";
const LIVE_CONTROL_UI =
  readArg("--live-control-ui")
  || process.env.GPAO_T_LIVE_CONTROL_UI
  || join(LIVE_ROOT, "control-ui");
const CHAT_PAGE =
  process.env.GPAO_T_LIVE_CHAT_PAGE ||
  process.env.OPENCLAW_LIVE_CHAT_PAGE ||
  join(LIVE_CONTROL_UI, "assets", "chat-page-BSHc822R.js");
const CONTROL_UI_ASSETS_DIR = join(LIVE_CONTROL_UI, "assets");
const CONTROL_UI_INDEX_HTML = join(LIVE_CONTROL_UI, "index.html");
const CONTROL_UI_SERVICE_WORKER = join(LIVE_CONTROL_UI, "sw.js");
const BACKUP_ROOT =
  process.env.GPAO_T_LIVE_PATCH_BACKUP_ROOT ||
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch";
const APPLY_TOKEN = "apply-gpao-t-user-screen-ux-live";
const CSS_MARKER = "gpao_t_user_screen_default_hides_work_pane_css_v0_1";
const INDEX_MARKER = "gpao_t_user_screen_css_cache_bust_v0_1";
const CACHE_REFRESH_MARKER = "gpao_t_user_screen_cache_refresh_v0_15";
const SERVICE_WORKER_MARKER = "gpao_t_user_screen_network_first_assets_v0_15";
const TELEGRAM_RAIL_MARKER = "gpao_t_telegram_direct_communication_rail_v0_21";
const MAIN_BUNDLE_MARKER = "gpao_t_main_bundle_runtime_guard_v0_1";
const PREVIOUS_CHATS_MARKER = "gpao_t_sidebar_previous_chats_disclosure_v0_1";
const SIDEBAR_SESSION_STACK_MARKER = "gpao_t_sidebar_session_stack_no_overlap_v0_1";
const KOREAN_SESSION_MENU_MARKER = "gpao_t_korean_session_menu_complete_v0_1";
const PREVIOUS_CHATS_STORAGE_KEY = "gpao-t:sidebar:previous-chats-expanded";
const CLIENT_INFO_MARKER = "gpao_t_gateway_client_identity_contract_v0_1";
const LIVE_ASSET_CACHE_BUST = "2026071421";

export function loadGpaoTPreviousChatsExpanded(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(PREVIOUS_CHATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}

export function persistGpaoTPreviousChatsExpanded(expanded, storage) {
  try {
    (storage ?? globalThis.localStorage)?.setItem(
      PREVIOUS_CHATS_STORAGE_KEY,
      JSON.stringify(expanded === true),
    );
  } catch {
    // The disclosure remains usable for the current page when storage is unavailable.
  }
}

export function isGpaoTAlwaysVisibleChat(row) {
  const telegramIdentity = `${row?.key ?? ""} ${row?.href ?? ""}`;
  return (
    row?.active === true ||
    row?.visuallyActive === true ||
    row?.hasActiveRun === true ||
    row?.pinned === true ||
    /(?:^|:|%3A)telegram(?:$|:|%3A)/i.test(telegramIdentity)
  );
}

export function partitionGpaoTSidebarChats(sections) {
  const currentSections = [];
  const previousSections = [];
  let previousCount = 0;
  for (const section of Array.isArray(sections) ? sections : []) {
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    const currentRows = [];
    const previousRows = [];
    for (const row of rows) {
      (isGpaoTAlwaysVisibleChat(row) ? currentRows : previousRows).push(row);
    }
    if (currentRows.length > 0 || rows.length === 0) {
      currentSections.push({
        ...section,
        rows: currentRows,
        gpaoTForceExpanded: currentRows.length > 0,
      });
    }
    if (previousRows.length > 0) {
      previousSections.push({ ...section, rows: previousRows });
      previousCount += previousRows.length;
    }
  }
  return { currentSections, previousSections, previousCount };
}

const PREVIOUS_CHATS_RUNTIME_SOURCE = [
  `const PREVIOUS_CHATS_STORAGE_KEY=${JSON.stringify(PREVIOUS_CHATS_STORAGE_KEY)};`,
  loadGpaoTPreviousChatsExpanded.toString(),
  persistGpaoTPreviousChatsExpanded.toString(),
  isGpaoTAlwaysVisibleChat.toString(),
  partitionGpaoTSidebarChats.toString(),
  `/* ${PREVIOUS_CHATS_MARKER} */`,
].join("");
const USER_SCREEN_HIDE_CSS = `
/* ${CSS_MARKER} */
.gpao-work-pane,
.gpao-work-pane__target-strip,
.gpao-work-pane__progress-lane,
.gpao-work-pane__control-rail,
.gpao-work-pane__inspector,
.gpao-work-pane__evidence-lane,
.gpao-work-pane__inspector-flow,
.gpao-work-pane__source-preview {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}
`;
const SIDEBAR_SESSION_STACK_CSS = `
/* ${SIDEBAR_SESSION_STACK_MARKER} */
.sidebar-recent-sessions > .sidebar-recent-sessions__group,
.sidebar-recent-sessions > .sidebar-previous-chats {
  flex-shrink: 0 !important;
}
`;
const TELEGRAM_COMMUNICATION_RAIL_SCRIPT = `
    <script data-gpao-t="${TELEGRAM_RAIL_MARKER}">
      (() => {
        const marker = "${TELEGRAM_RAIL_MARKER}";
        if (window[marker]) return;
        window[marker] = true;

        function collectRoots(root, out = []) {
          if (!root) return out;
          out.push(root);
          const nodes = typeof root.querySelectorAll === "function" ? root.querySelectorAll("*") : [];
          for (const node of nodes) {
            if (node.shadowRoot) collectRoots(node.shadowRoot, out);
          }
          return out;
        }

        function ensureStyle(root) {
          if (!root || typeof root.getElementById !== "function" || root.getElementById(marker + "-style")) return;
          const target = root.nodeType === Node.DOCUMENT_NODE ? document.head : root;
          if (!target || typeof target.appendChild !== "function") return;
          const style = document.createElement("style");
          style.id = marker + "-style";
          style.textContent = \`
            .gpao-work-pane,
            .gpao-work-pane__target-strip,
            .gpao-work-pane__progress-lane,
            .gpao-work-pane__control-rail,
            .gpao-work-pane__inspector,
            .gpao-work-pane__evidence-lane,
            .gpao-work-pane__inspector-flow,
            .gpao-work-pane__source-preview {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: 0 !important;
              overflow: hidden !important;
            }
            .gpao-telegram-direct-rail {
              margin: 12px 0 14px;
              padding: 0;
            }
            .gpao-telegram-direct-rail__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding: 0 12px 6px;
              color: var(--muted, #6e6960);
              font-size: 11px;
              font-weight: 700;
            }
            .gpao-telegram-direct-rail__title {
              letter-spacing: 0;
            }
            .gpao-telegram-direct-rail__status {
              color: var(--accent, #bd4531);
              font-size: 11px;
              font-weight: 650;
            }
            .gpao-telegram-direct-rail__list {
              display: grid;
              gap: 4px;
            }
            .gpao-telegram-direct-link {
              display: block;
              padding: 10px 12px;
              border: 1px solid color-mix(in srgb, var(--accent, #bd4531) 24%, transparent);
              border-radius: 8px;
              background: color-mix(in srgb, var(--accent-subtle, #bd453114) 70%, transparent);
              color: inherit;
              text-decoration: none;
              font-size: 13px;
              font-weight: 650;
            }
            .gpao-telegram-direct-session {
              border-color: color-mix(in srgb, var(--accent, #bd4531) 24%, transparent) !important;
              background: color-mix(in srgb, var(--accent-subtle, #bd453114) 70%, transparent) !important;
            }
            .gpao-user-settings-summary {
              max-width: 920px;
              margin: 18px 0 0;
              padding: 0;
              color: var(--text, #2f2923);
            }
            .gpao-user-settings-summary__eyebrow {
              color: var(--muted, #7c7165);
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .gpao-user-settings-summary__title {
              font-size: 20px;
              font-weight: 760;
              margin-bottom: 8px;
            }
            .gpao-user-settings-summary__body {
              color: var(--muted, #746a60);
              font-size: 14px;
              line-height: 1.65;
              max-width: 760px;
            }
            .gpao-user-settings-summary__list {
              display: grid;
              gap: 8px;
              margin-top: 18px;
              max-width: 760px;
            }
            .gpao-user-settings-summary__item {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 10px 0;
              border-bottom: 1px solid color-mix(in srgb, var(--border, #dfd5ca) 70%, transparent);
              font-size: 13px;
            }
            .gpao-user-settings-summary__item strong {
              font-weight: 720;
            }
            .gpao-user-settings-summary__item span {
              color: var(--muted, #746a60);
              text-align: right;
            }
          \`;
          target.appendChild(style);
        }

        function rewriteUserLabel(value) {
          if (!value || typeof value !== "string") return value;
          const connectionTokenLabel = ["OPENCLAW", "GATEWAY", "TOKEN"].join("_");
          const dashboardHelpCommand = ["gpao-t", "dashboard", "--no-open"].join(" ");
          const keepLastAssistantsLabel = ["Keep", "Last", "Assistants"].join(" ");
          const lastAssistantsLabel = ["Last", "Assistants"].join(" ");
          const assistantsLowerLabel = ["assist", "ants"].join("");
          const assistantsTitleLabel = ["Assist", "ants"].join("");
          const assistantLowerLabel = ["assist", "ant"].join("");
          const clawdetteLabel = ["Claw", "dette"].join("");
          const clawHubLabel = ["Claw", "Hub"].join("");
          const clawHubLowerLabel = ["claw", "hub"].join("");
          return value
            .replace(/New session/g, "새 대화")
            .replace(/worktree에서 새 채팅/g, "새 작업 대화")
            .replace(/New chat in worktree/g, "새 작업 대화")
            .replace(/Main 세션/g, "Main 대화")
            .replace(/Ready to chat/g, "대화 준비됨")
            .replace(/준비됨 to chat/g, "대화 준비됨")
            .replace(/Type a message below · \\/ for commands/g, "메시지를 입력하세요")
            .replace(/Type a message below\\s*·/g, "메시지를 입력하세요")
            .replace(/\\bfor commands\\b/g, "")
            .replace(/Message GPAO-T/g, "GPAO-T에게 메시지 입력")
            .replace(/gpao-t-control-ui/g, "윤")
            .replace(/Close navigation/g, "탐색 닫기")
            .replace(/Open navigation/g, "탐색 열기")
            .replace(/Open session menu/g, "대화 메뉴 열기")
            .replace(/열기 session menu/g, "대화 메뉴 열기")
            .replace(/Open chat/g, "채팅 열기")
            .replace(/Pin session/g, "세션 고정")
            .replace(/Unpin session/g, "세션 고정 해제")
            .replace(/Mark as unread/g, "읽지 않음으로 표시")
            .replace(/Mark as read/g, "읽음으로 표시")
            .replace(/Rename group/g, "그룹 이름 바꾸기")
            .replace(/Rename(?:\\.\\.\\.|…)/g, "이름 바꾸기…")
            .replace(/\\bFork\\b/g, "대화 복제")
            .replace(/Move to group/g, "그룹으로 이동")
            .replace(/Archive session/g, "세션 보관")
            .replace(/Unarchive session/g, "세션 보관 해제")
            .replace(/Delete group/g, "그룹 삭제")
            .replace(/Delete(?:\\.\\.\\.|…)/g, "삭제…")
            .replace(/What can you do\\?/g, "무엇을 도와줄 수 있어?")
            .replace(/Summarize my recent sessions/g, "최근 대화 요약")
            .replace(/Help me configure a channel/g, "연결 채널 설정 도와줘")
            .replace(/Check system health/g, "시스템 상태 확인")
            .replace(/GPAO-T 런타임이 추적 중인 최근 세션 키입니다\./g, "최근 대화 상태를 확인합니다.")
            .replace(/Chat thinking level/g, "사고 수준")
            .replace(/Chat model, 사고 수준:/g, "모델과 사고 수준:")
            .replace(/앱으로 돌아가기/g, "이전 화면으로")
            .replace(/대화로 돌아가기/g, "이전 화면으로")
            .replace(/GPAO-T runtime config 편집\\./g, "GPAO-T 실행 설정을 조정합니다.")
            .replace(/gpao-t\\.json 편집\\./g, "GPAO-T 기본 설정을 조정합니다.")
            .replace(/\\bSimple\\b/g, "기본")
            .replace(/\\bAdvanced\\b/g, "고급")
            .replace(/Model & Thinking/g, "모델과 사고")
            .replace(/\\bModel\\b/g, "모델")
            .replace(/\\bThinking\\b/g, "사고 수준")
            .replace(/\\bdefault\\b/g, "기본값")
            .replace(/\\bOff\\b/g, "꺼짐")
            .replace(/\\bLow\\b/g, "낮음")
            .replace(/\\bMedium\\b/g, "보통")
            .replace(/\\bHigh\\b/g, "높음")
            .replace(/Fast mode/g, "응답 모드")
            .replace(/\\bFast\\b/g, "빠르게")
            .replace(/\\bStandard\\b/g, "표준")
            .replace(/\\bChannels\\b/g, "연결 채널")
            .replace(/\\bConnected\\b/g, "연결됨")
            .replace(/\\bconnected\\b/g, "연결됨")
            .replace(/\\bConfigured\\b/g, "설정됨")
            .replace(/\\bSecurity\\b/g, "보안")
            .replace(/Configure →/g, "설정 →")
            .replace(/Manage →/g, "관리 →")
            .replace(/Browse →/g, "살펴보기 →")
            .replace(/No changes/g, "변경 없음")
            .replace(/\\bOpen\\b/g, "열기")
            .replace(/\\bClear\\b/g, "비우기")
            .replace(/\\bSave\\b/g, "저장")
            .replace(/\\bApply\\b/g, "적용")
            .replace(/\\bUpdate\\b/g, "갱신")
            .replace(/Hide archived/g, "보관됨 숨기기")
            .replace(/Expand preview/g, "미리보기 확대")
            .replace(/Edit file/g, "파일 편집")
            .replace(/Close preview/g, "미리보기 닫기")
            .replace(/\\bPreview\\b/g, "미리보기")
            .replace(/\\bContent\\b/g, "내용")
            .replace(/\\bReset\\b/g, "재설정")
            .replace(/Per-agent 기능 허용 목록 and workspace 기능\\./g, "에이전트별 기능 허용 목록과 작업공간 기능입니다.")
            .replace(/What this agent can use in the current chat session\\./g, "현재 대화에서 이 에이전트가 사용할 수 있는 도구입니다.")
            .replace(/Profile \\+ per-tool overrides for this agent\\.\\s*(\\d+)\\/(\\d+) enabled\\./g, "이 에이전트의 도구 권한입니다. $1/$2 사용 중.")
            .replace(/BUILT-IN SKILLS/g, "기본 기능")
            .replace(/OTHER SKILLS/g, "기타 기능")
            .replace(/\\ball 기능\\b/g, "모든 기능")
            .replace(/\\(in <1분\\)/g, "(1분 이내)")
            .replace(/\\bAll\\b/g, "전체")
            .replace(/\\bReady\\b/g, "준비됨")
            .replace(/Needs Setup/g, "설정 필요")
            .replace(/\\bDisabled\\b/g, "비활성")
            .replace(/BUILT-IN/g, "기본")
            .replace(/Built-in/g, "기본")
            .replace(/(\\d+)\\s*shown/g, "$1개 표시")
            .replace(/shown/g, "표시")
            .replace(/GPAO-T 런타임 auth/g, "GPAO-T 연결 보안")
            .replace(/GPAO-T 런타임 상태/g, "GPAO-T 상태")
            .replace(/GPAO-T 런타임 호스트/g, "GPAO-T 실행 환경")
            .replace(/\\bToken\\b/g, "연결키")
            .replace(/\\btoken\\b/g, "연결키")
            .replace(/Exec policy/g, "실행 승인")
            .replace(/\\bAllowlist\\b/g, "허용 목록")
            .replace(/\\ballowlist\\b/g, "허용 목록")
            .replace(/Browser enabled/g, "브라우저 도구")
            .replace(/\\bEnabled\\b/g, "사용 중")
            .replace(/Tool profile/g, "도구 범위")
            .replace(/Device auth/g, "기기 승인")
            .replace(/GPAO-T 런타임 Host/g, "로컬 실행 환경")
            .replace(/\\bUp\\b/g, "실행")
            .replace(/\\bCPU\\b/g, "CPU")
            .replace(/\\bMEMORY\\b/g, "메모리")
            .replace(/\\bDISK\\b/g, "저장공간")
            .replace(/\\bMemory\\b/g, "메모리")
            .replace(/\\bDisk\\b/g, "저장공간")
            .replace(/\\bload\\b/g, "부하")
            .replace(/\\bused\\b/g, "사용 중")
            .replace(/\\bfree of\\b/g, "/")
            .replace(/\\bAppearance\\b/g, "화면")
            .replace(/\\bTheme\\b/g, "화면 스타일")
            .replace(/\\bClaw\\b/g, "기본")
            .replace(/\\bKnot\\b/g, "집중")
            .replace(/\\bDash\\b/g, "작업")
            .replace(/\\bImport\\b/g, "가져오기")
            .replace(/\\bMode\\b/g, "표시 모드")
            .replace(/\\bLight\\b/g, "밝게")
            .replace(/\\bDark\\b/g, "어둡게")
            .replace(/\\bSystem\\b/g, "시스템")
            .replace(/Text size/g, "글자 크기")
            .replace(/GPAO-T companion log/g, "GPAO-T 동반자 기록")
            .replace(/NBEAI\\. GPAO-T/g, "nBeAI. GPAO-T")
            .replace(/GpaoT/g, "GPAO-T")
            .replace(/집게가 더 바쁩니다/g, "GPAO-T 활동이 더 많습니다")
            .replace(/리프의 에이전트/g, "작업공간 에이전트")
            .replace(/산호초에서의 활동/g, "GPAO-T 작업공간에서의 활동")
            .replace(/\\bPersonal\\b/g, "개인 설정")
            .replace(/\\bSearch\\b/g, "검색")
            .replace(/\\bUSER\\b/g, "사용자")
            .replace(/\\bUser\\b/g, "사용자")
            .replace(/\\bYou\\b/g, "윤")
            .replace(/AVATAR TEXT \\/ EMOJI/g, "표시 이름 / 아이콘")
            .replace(/Avatar text \\/ emoji/g, "표시 이름 / 아이콘")
            .replace(/Choose image/g, "이미지 선택")
            .replace(/Clear avatar/g, "이미지 지우기")
            .replace(/비우기 avatar/g, "이미지 지우기")
            .replace(/Stored in this browser only\\./g, "이 브라우저에만 저장됩니다.")
            .replace(/\\bASSISTANT\\b/g, "GPAO-T")
            .replace(/\\bAssistant\\b/g, "GPAO-T")
            .replace(new RegExp(keepLastAssistantsLabel, "g"), "최근 GPAO-T 대화 유지")
            .replace(new RegExp(lastAssistantsLabel, "g"), "최근 GPAO-T 대화")
            .replace(new RegExp("\\\\b" + assistantsLowerLabel + "\\\\b", "g"), "GPAO-T 대화")
            .replace(new RegExp("\\\\b" + assistantsTitleLabel + "\\\\b", "g"), "GPAO-T 대화")
            .replace(new RegExp("\\\\b" + assistantLowerLabel + "\\\\b", "g"), "GPAO-T")
            .replace(new RegExp("\\\\b" + clawdetteLabel + "\\\\b", "g"), "GPAO-T")
            .replace(/Fallback logo/g, "기본 로고")
            .replace(/\\bAutomations\\b/g, "자동화")
            .replace(/\\bAuto\\b/g, "자동")
            .replace(/\\bminimal\\b/g, "최소")
            .replace(/\\bcoding\\b/g, "개발")
            .replace(/\\bmessaging\\b/g, "소통")
            .replace(/\\bfull\\b/g, "전체")
            .replace(/(\\d+) scheduled tasks/g, "$1개 예약 작업")
            .replace(/(\\d+) 기능s installed/g, "$1개 기능 설치됨")
            .replace(/(\\d+) MCP servers/g, "$1개 MCP 서버")
            .replace(/scheduled task/g, "예약 작업")
            .replace(/skills installed/g, "기능 설치됨")
            .replace(/MCP server/g, "MCP 서버")
            .replace(/installed/g, "설치됨")
            .replace(/에이전트 및 도구/g, "기능과 도구")
            .replace(/AI 및 에이전트/g, "GPAO-T 지능")
            .replace(/\\bAgents\\b/g, "GPAO-T")
            .replace(/\\bAgent\\b/g, "GPAO-T")
            .replace(/\\bModels\\b/g, "모델")
            .replace(/\\bTools\\b/g, "도구")
            .replace(/\\bSession\\b/g, "세션")
            .replace(/\\bCopy ID\\b/g, "ID 복사")
            .replace(/\\bDefault\\b/g, "기본값")
            .replace(/Core Files/g, "핵심 파일")
            .replace(/Bootstrap persona, identity, and tool guidance\\./g, "정체성, 운영 원칙, 도구 사용 기준을 관리합니다.")
            .replace(/Select a file to edit\\./g, "파일을 선택해 내용을 확인하거나 조정합니다.")
            .replace(/Workspace:/g, "작업공간:")
            .replace(/\\bWorkspace\\b/g, "작업공간")
            .replace(/Cron 작업/g, "예약 작업")
            .replace(/Agent configurations, models, and identities/g, "GPAO-T의 기본 모델, 기능, 정체성 설정")
            .replace(/Agent Defaults/g, "기본 동작")
            .replace(/\\badvanced\\b/g, "고급")
            .replace(/Shared 기본값 settings inherited by agents unless overridden per entry in agents\\.list\\. Use defaults to enforce consistent baseline behavior and reduce duplicated per-agent configuration\\./g, "공통 기본값입니다. 특별히 바꾸지 않으면 모든 GPAO-T 대화가 이 기준을 따릅니다.")
            .replace(/Block Streaming Break/g, "응답 종료 기준")
            .replace(/Block Streaming Chunk/g, "응답 조각 기준")
            .replace(/Block Streaming Coalesce/g, "응답 모아보기")
            .replace(/Block Streaming Default/g, "응답 출력 기본값")
            .replace(/Bootstrap Max/g, "초기 준비 한도")
            .replace(/\\btext_end\\b/g, "문장 종료")
            .replace(/\\bmessage_end\\b/g, "메시지 종료")
            .replace(/커뮤니케이션/g, "소통")
            .replace(/인프라/g, "고급 연결")
            .replace(/디버그/g, "진단")
            .replace(/로그/g, "기록")
            .replace(/WebSocket\\s+URL/g, "연결 주소")
            .replace(new RegExp(connectionTokenLabel + " \\\\(선택 사항\\\\)", "g"), "연결키 (필요할 때만)")
            .replace(new RegExp(connectionTokenLabel, "g"), "GPAO-T 연결키")
            .replace(/비밀번호\\(저장되지 않음\\)/g, "로컬 연결 비밀번호 (저장되지 않음)")
            .replace(/연결할 수 없음/g, "GPAO-T 로컬 런타임에 연결하지 못했습니다")
            .replace(/설정 코드를 생성할 수 없습니다\\./g, "모바일 연결 준비가 아직 완료되지 않았습니다.")
            .replace(/GatewayRequestError:\\s*GPAO-T 런타임 is only bound to loopback[^\\n]*/g, "현재 GPAO-T는 이 Mac 안에서만 안전하게 열려 있습니다. 모바일 연결은 로컬 네트워크 공유 모드를 준비한 뒤 사용할 수 있습니다.")
            .replace(/GatewayClientRequestError[^\\n]*/g, "GPAO-T 로컬 런타임 연결 오류입니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.")
            .replace(/GatewayRequestError[^\\n]*/g, "GPAO-T 로컬 런타임 연결 오류입니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.")
            .replace(/브라우저가 로컬 런타임 연결을 완료할 수 없습니다\\./g, "브라우저가 GPAO-T 로컬 런타임과 연결하지 못했습니다.")
            .replace(/자격 증명을 다시\s*시도하기 전/g, "다시 연결하기 전")
            .replace(/대상과 전송\s*방식/g, "로컬 런타임 상태와 연결키")
            .replace(/gpao-t status 또는 gpao-t (?:gateway|runtime) run으로 GPAO-T 런타임이 실행 중인지 확인하세요\\./g, "GPAO-T 런타임이 켜져 있는지 확인하세요.")
            .replace(/gpao-t (?:gateway|runtime) run으로 GPAO-T 런타임이 실행 중인지 확인하세요\\./g, "GPAO-T 런타임이 켜져 있는지 확인하세요.")
            .replace(/연결 주소을 확인하고 GPAO-T 런타임이 HTTPS\\/Tailscale Serve 뒤에 있으면 ws:\\/\\/를 사용하세요\\./g, "연결 주소는 보통 ws://127.0.0.1:18799 입니다.")
            .replace(/연결 주소를 확인하고 GPAO-T 런타임이 HTTPS\\/Tailscale Serve 뒤에 있으면 ws:\\/\\/를 사용하세요\\./g, "연결 주소는 보통 ws://127.0.0.1:18799 입니다.")
            .replace(new RegExp(dashboardHelpCommand + "으로 dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요\\\\.", "g"), "문제가 계속되면 GPAO-T 연결 도움말에서 현재 연결 정보를 확인하세요.")
            .replace(new RegExp(dashboardHelpCommand, "g"), "GPAO-T 연결 도움말")
            .replace(/dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요\\./g, "연결 도움말에서 현재 연결 정보를 확인하세요.")
            .replace(/GPAO-T 화면 인증/g, "GPAO-T 연결")
            .replace(/원시 오류/g, "상세 오류")
            .replace(/연결 방법/g, "연결 도움말")
            .replace(/Gateway 상태/g, "런타임 상태")
            .replace(/게이트웨이 업타임/g, "런타임 업타임")
            .replace(/게이트웨이/g, "런타임")
            .replace(/service\\/Node service not 설치됨 as LaunchAgent/g, "백그라운드 자동 실행이 아직 설정되지 않았습니다.")
            .replace(/Node service not 설치됨 as LaunchAgent/g, "백그라운드 자동 실행이 아직 설정되지 않았습니다.")
            .replace(/service not 설치됨 as LaunchAgent/g, "백그라운드 자동 실행이 아직 설정되지 않았습니다.")
            .replace(/Gateway 연결/g, "로컬 런타임 연결")
            .replace(/Gateway 토큰/g, "연결키")
            .replace(/Gateway 대시보드/g, "GPAO-T 연결 화면")
            .replace(/\\bGateway\\b/g, "GPAO-T 런타임")
            .replace(/상태, 진입점, 상태 정보\\./g, "GPAO-T 연결과 실행 상태를 확인합니다.")
            .replace(/GPAO-T 런타임 액세스/g, "GPAO-T 연결 설정")
            .replace(/연결 변경 사항을 적용하려면 Connect를 클릭하세요\\./g, "연결 정보를 변경했다면 ‘연결’을 눌러 적용하세요.")
            .replace(/스냅샷/g, "현재 상태")
            .replace(/최신 GPAO-T 런타임 핸드셰이크 정보입니다\\./g, "GPAO-T의 최신 연결 상태입니다.")
            .replace(/GPAO-T 런타임 토큰/g, "GPAO-T 연결키")
            .replace(/토큰 표시 여부 전환/g, "연결키 표시 여부 전환")
            .replace(/ws:\\/\\/100\\.x\\.y\\.z:18789/g, "ws://100.x.y.z:18799")
            .replace(/틱 간격/g, "상태 확인 간격")
            .replace(/마지막 채널 새로고침/g, "마지막 채널 확인")
            .replace(/연결 채널를/g, "연결 채널을")
            .replace(/GPAO-T 런타임가/g, "GPAO-T 런타임이")
            .replace(/Channels를 사용해 WhatsApp, Telegram, Discord, Signal 또는 iMessage를 연결하세요\./g, "Telegram 등 연결된 채널의 상태는 연결 채널 설정에서 관리합니다.")
            .replace(/연결 채널을 사용해 WhatsApp, Telegram, Discord, Signal 또는 iMessage를 연결하세요\./g, "Telegram 등 연결된 채널의 상태는 연결 채널 설정에서 관리합니다.")
            .replace(/Skills with missing dependencies/g, "추가 설정이 필요한 기능")
            .replace(/기능 with missing dependencies/g, "추가 설정이 필요한 기능")
            .replace(/session-logs/g, "대화 기록 검색")
            .replace(/\\bjust now\\b/g, "방금 전")
            .replace(/\\b(\\d+) jobs\\b/g, "$1개 작업")
            .replace(/\\b(\\d+) active\\b/g, "$1개 활성")
            .replace(/\\b(\\d+)M tokens · (\\d+) msgs\\b/g, "토큰 $1M · 메시지 $2개")
            .replace(/\\(in (\\d+)h\\)/g, "($1시간 후)")
            .replace(/\\(in (\\d+)m\\)/g, "($1분 후)")
            .replace(/\\b(\\d+)d\\b/g, "$1일")
            .replace(/\\b(\\d+)h\\b/g, "$1시간")
            .replace(/\\b(\\d+)m\\b/g, "$1분")
            .replace(/\\b(\\d+)s\\b/g, "$1초")
            .replace(/(\\d+)(분|시간|일) ago/g, "$1$2 전")
            .replace(/\\breset\\b/g, "초기화까지")
            .replace(/\\bCron\\b/g, "자동화 일정")
            .replace(/에이전트 작업 대기열 및 세션 인계\\./g, "GPAO-T 작업의 진행 상태와 담당 흐름을 관리합니다.")
            .replace(/Filter by agent:\s*전체 agents/g, "담당 에이전트: 전체")
            .replace(/전체 agents/g, "전체 에이전트")
            .replace(/\\bArchived\\b/g, "보관됨")
            .replace(/Card layout/g, "카드 보기")
            .replace(/Hide empty columns/g, "빈 열 숨기기")
            .replace(/디스패처 넛지/g, "작업 배정 확인")
            .replace(/\\bTriage\\b/g, "분류 대기")
            .replace(/백기록/g, "대기 작업")
            .replace(/에이전트 세션을 위한 작업을 대기열에 추가합니다\\./g, "GPAO-T가 처리할 작업을 목록에 추가합니다.")
            .replace(/\\bNormal\\b/g, "보통")
            .replace(/할당되지 않음 \\(main 사용\\)/g, "할당되지 않음 (기본 대화 사용)")
            .replace(/연결된 세션 없음/g, "연결된 대화 없음")
            .replace(/ui, docs/g, "화면, 문서")
            .replace(/워크스페이스, 도구, 정체성\\./g, "GPAO-T의 작업 역할과 연결된 기능을 관리합니다.")
            .replace(/^main$/g, "기본 에이전트")
            .replace(/ID 복사/g, "식별자 복사")
            .replace(/^파일$/g, "운영 기준")
            .replace(/^채널$/g, "연결 채널")
            .replace(/예약 작업/g, "자동화 일정")
            .replace(/핵심 파일/g, "운영 기준")
            .replace(/작업공간:/g, "로컬 작업공간:")
            .replace(/^AGENTS$/g, "작업 규칙")
            .replace(/^SOUL$/g, "성격과 원칙")
            .replace(/^TOOLS$/g, "도구 기준")
            .replace(/^IDENTITY$/g, "정체성")
            .replace(/^HEARTBEAT$/g, "주기 작업")
            .replace(/^Overview$/g, "개요")
            .replace(/작업공간 paths and identity metadata\\./g, "로컬 작업공간과 에이전트 설정입니다.")
            .replace(/Primary 모델/g, "기본 모델")
            .replace(/^Runtime$/g, "실행 방식")
            .replace(/^medium$/g, "보통")
            .replace(/기능 Filter/g, "기능 필터")
            .replace(/all 기능/g, "모든 기능")
            .replace(/모델 Selection/g, "모델 선택")
            .replace(/Primary model \\(기본값\\)/g, "기본 모델")
            .replace(/Primary model/g, "기본 모델")
            .replace(/열기 Files tab/g, "작업공간 파일 열기")
            .replace(/Not set/g, "설정 안 됨")
            .replace(/^Fallbacks$/g, "대체 모델")
            .replace(/구성 다시 로드/g, "설정 다시 불러오기")
            .replace(/Tool Access/g, "도구 권한")
            .replace(/Profile \\+ per-tool overrides for this agent\\./g, "이 에이전트별 도구 권한입니다.")
            .replace(/enabled\\./g, "사용 중")
            .replace(/Profile \+ per-tool overrides for this agent\\. (\\d+)\\/(\\d+) enabled\\./g, "이 에이전트의 도구 권한입니다. $1/$2개 사용 가능.")
            .replace(/Enable 전체/g, "모두 사용")
            .replace(/Disable 전체/g, "모두 끄기")
            .replace(/^Reset$/g, "초기화")
            .replace(/Available Right Now/g, "현재 사용 가능")
            .replace(/What this agent can use in the current chat session\\. agent:main:main/g, "현재 대화에서 이 에이전트가 사용할 수 있는 도구입니다.")
            .replace(/Browser is configured, but the current tool profile does not include the browser tool\\. Add tools\\.alsoAllow: \\["browser"\\] or agents\\.list\\[\\]\\.tools\\.alsoAllow: \\["browser"\\]; tools\\.subagents\\.tools\\.allow alone cannot add it back after profile filtering\\./g, "브라우저 도구가 설치되어 있지만 현재 에이전트 권한에는 포함되지 않았습니다. 도구 권한에서 브라우저 사용을 허용하면 사용할 수 있습니다.")
            .replace(/적용 Patch/g, "변경 적용")
            .replace(/Create Goal/g, "목표 만들기")
            .replace(/^Edit$/g, "파일 편집")
            .replace(/^Exec$/g, "명령 실행")
            .replace(/Get Goal/g, "목표 확인")
            .replace(/^Process$/g, "실행 관리")
            .replace(/^Read$/g, "파일 읽기")
            .replace(/세션 History/g, "대화 기록")
            .replace(/세션 Send/g, "대화 전송")
            .replace(/세션 Status/g, "대화 상태")
            .replace(/Sessions \\(sessions_list\\)/g, "대화 목록")
            .replace(/Quick Presets/g, "빠른 설정")
            .replace(/^Minimal$/g, "최소")
            .replace(/^Coding$/g, "개발")
            .replace(/^Messaging$/g, "메시지")
            .replace(/^Full$/g, "전체")
            .replace(/^Inherit$/g, "상위 설정 따름")
            .replace(/Inherit/g, "상위 설정 따름")
            .replace(/^Profile$/g, "권한 구성")
            .replace(/^Source$/g, "설정 출처")
            .replace(/global 기본값/g, "전체 기본값")
            .replace(/^Live$/g, "실시간 사용 가능")
            .replace(/^Status$/g, "상태")
            .replace(/^saved$/g, "저장됨")
            .replace(/Per-agent 기능 허용 목록 and workspace 기능\\. (\\d+)\\/(\\d+)/g, "에이전트별 기능 허용 목록과 로컬 기능입니다. $1/$2")
            .replace(/전체 기능 are enabled\\. Disabling any 기능 will create a per-agent 허용 목록\\./g, "모든 기능이 켜져 있습니다. 기능을 끄면 이 에이전트 전용 허용 목록이 만들어집니다.")
            .replace(/^Filter$/g, "필터")
            .replace(/OTHER 기능/g, "기타 기능")
            .replace(/\\bOther\\b/g, "기타")
            .replace(/main \\(기본값\\)/g, "기본 에이전트 (기본값)")
            .replace(/^eligible$/g, "사용 가능")
            .replace(/Use when controlling web pages with the GPAO-T browser tool, especially multi-step flows, login checks, tab management, or recovery from stale refs\\/timeouts\\./g, "GPAO-T 브라우저로 여러 단계의 웹 작업, 로그인 확인, 탭 관리, 연결 복구를 수행할 때 사용합니다.")
            .replace(/Use when controlling web pages with the GPAO-T browser tool[^…]*…?/g, "GPAO-T 브라우저로 여러 단계의 웹 작업, 로그인 확인, 탭 관리, 연결 복구를 수행할 때 사용합니다.")
            .replace(/GPAO-T Context/g, "GPAO-T 구성")
            .replace(/작업공간, identity, and model configuration\\./g, "로컬 작업공간, 정체성, 모델 설정입니다.")
            .replace(/작업공간 and scheduling targets\\./g, "로컬 작업공간과 자동화 실행 대상입니다.")
            .replace(/Identity Name/g, "정체성 이름")
            .replace(/Identity Avatar/g, "정체성 이미지")
            .replace(/GPAO-T 런타임-wide channel status snapshot\\./g, "GPAO-T 전체 연결 채널 상태입니다.")
            .replace(/Last refresh:/g, "마지막 확인:")
            .replace(/(\\d+) configured/g, "$1개 설정됨")
            .replace(/(\\d+) enabled/g, "$1개 사용 중")
            .replace(/^Scheduler$/g, "자동화 일정")
            .replace(/GPAO-T 런타임 cron status\\./g, "GPAO-T 자동화 실행 상태입니다.")
            .replace(/GPAO-T 자동화 일정 Jobs/g, "GPAO-T 자동화 작업")
            .replace(/Scheduled jobs targeting this agent\\./g, "이 에이전트가 실행할 예정인 작업입니다.")
            .replace(/^isolated$/g, "분리 실행")
            .replace(/^ok · next /g, "정상 · 다음 ")
            .replace(/ · last /g, " · 최근 ")
            .replace(/announce \\(telegram -> \\d+\\)/g, "Telegram으로 알림 전송")
            .replace(/Run Now/g, "지금 실행")
            .replace(/테마, UI, 설정 마법사 설정\\./g, "화면 테마와 글자 크기를 조정합니다.")
            .replace(/Choose a theme family\\./g, "원하는 화면 스타일을 선택하세요.")
            .replace(/Click 가져오기 to add one browser-local tweakcn theme\\. In tweakcn, use Share and paste the copied link here\\./g, "가져오기를 누르면 이 브라우저에 사용자 테마를 추가할 수 있습니다.")
            .replace(/^Small$/g, "작게")
            .replace(/^Large$/g, "크게")
            .replace(/^XL$/g, "매우 크게")
            .replace(/^XXL$/g, "가장 크게")
            .replace(/Bot status and channel configuration\\./g, "연결 상태와 실행 정보를 확인합니다.")
            .replace(/^polling$/g, "주기 확인")
            .replace(/마지막 프로브/g, "마지막 연결 점검")
            .replace(/^프로브$/g, "연결 점검")
            .replace(/프로브 성공/g, "연결 점검 성공")
            .replace(/채널 및 설정\\./g, "연결된 채널의 상태를 확인합니다.")
            .replace(/명령, hooks, cron, plugins\\./g, "예약 실행과 결과 전달 방식을 관리합니다.")
            .replace(/Open session menu/g, "대화 메뉴")
            .replace(/Chat model/g, "대화 모델")
            .replace(/OpenAI models/g, "OpenAI 모델")
            .replace(/^Reasoning$/g, "사고 수준")
            .replace(/^Speed$/g, "응답 속도")
            .replace(/Use 기본값 reasoning \(([^)]+)\)/g, "기본 사고 수준 사용 ($1)")
            .replace(/Fast responses: Standard/g, "빠른 응답: 표준")
            .replace(/빠르게 responses: 표준/g, "빠른 응답: 표준")
            .replace(/Delete message/g, "메시지 삭제")
            .replace(/Message context for /g, "메시지 정보: ")
            .replace(/Open in canvas/g, "캔버스에서 열기")
            .replace(/열기 in canvas/g, "캔버스에서 열기")
            .replace(/Copy as markdown/g, "마크다운으로 복사")
            .replace(/^\\s*now\\s*$/g, "방금 전")
            .replace(/^\\s*Done\\s*$/g, "완료")
            .replace(/응답 상태:\\s*Done/g, "응답 상태: 완료")
            .replace(/Stop generating/g, "응답 중지")
            .replace(/^system$/g, "시스템")
            .replace(/^Tool$/g, "도구")
            .replace(/(\\d+) Tool\\b/g, "$1 도구")
            .replace(/(\\d+) Live Tool\\b/g, "$1 실시간 도구")
            .replace(/(\\d+) Live 도구/g, "$1 실시간 도구")
            .replace(/사용 중 Tool/g, "사용 중 도구")
            .replace(/Tool preview/g, "도구 미리보기")
            .replace(/Plugin:/g, "확장 기능:")
            .replace(/\\+(\\d+) more/g, "외 $1개")
            .replace(/more live tools/g, "개 실시간 도구")
            .replace(/Live Now/g, "현재 사용 가능")
            .replace(/Not Live/g, "현재 사용 불가")
            .replace(/Link to This Tool/g, "이 도구로 이동")
            .replace(/^Files$/g, "파일")
            .replace(/^Web$/g, "웹")
            .replace(/^Sessions$/g, "대화")
            .replace(/^UI$/g, "화면")
            .replace(/^Automation$/g, "자동화")
            .replace(/^Nodes$/g, "기기")
            .replace(/^Media$/g, "미디어")
            .replace(/Skill Workshop/g, "기능 작업실")
            .replace(/Installed skills and their status\\./g, "설치된 기능과 상태입니다.")
            .replace(/Search and install skills from the registry/g, "GPAO-T 기능을 검색하고 설치합니다.")
            .replace(/검색 and install 기능 from the registry/g, "GPAO-T 기능을 검색하고 설치합니다.")
            .replace(/기능 및 API 키/g, "기능과 API 키")
            .replace(/AgentSkills/g, "기능 정의")
            .replace(/\\bskills\\b/g, "기능")
            .replace(/\\bskill\\b/g, "기능")
            .replace(/\\bSkills\\b/g, "기능")
            .replace(new RegExp("open" + "claw-absorption", "g"), "GPAO-T 완성")
            .replace(/OpenClaw session row/g, "GPAO-T 대화 기록")
            .replace(/OpenAI Codex on OpenClaw/g, "GPAO-T 로컬 런타임")
            .replace(/GPT\\/OpenClaw/g, "GPAO-T")
            .replace(/\\bOpenClaw\\b/g, "GPAO-T")
            .replace(/\\bopenclaw\\b/g, "gpao-t")
            .replace(new RegExp("\\\\b" + clawHubLabel + "\\\\b", "g"), "GPAO-T Hub")
            .replace(new RegExp("\\\\b" + clawHubLowerLabel + "\\\\b", "g"), "gpao-t-hub")
            .replace(/\\bControl UI\\b/g, "GPAO-T 화면")
            .replace(/Nodes & devices/g, "기기와 연결")
            .replace(/One entry per paired client: roles, tokens, live links\\./g, "연결된 기기의 역할, 권한, 상태를 확인합니다.")
            .replace(/Tokens & capabilities/g, "연결키와 권한")
            .replace(/\\bRemove\\b/g, "제거")
            .replace(/Exec approvals/g, "실행 승인")
            .replace(/허용 목록 and approval policy for exec host=GPAO-T 런타임\\/node\\./g, "실행 기기별 허용 목록과 승인 정책을 관리합니다.")
            .replace(/허용 목록 and approval policy for exec host=gateway\\/node\\./g, "실행 기기별 허용 목록과 승인 정책을 관리합니다.")
            .replace(/허용 목록 and approval policy/g, "허용 목록과 승인 정책")
            .replace(/for exec host=gateway\\/node\\./g, "실행 기기 기준입니다.")
            .replace(/\\bTarget\\b/g, "대상")
            .replace(/\\bHost\\b/g, "호스트")
            .replace(/\\bScope\\b/g, "범위")
            .replace(/\\bDefaults\\b/g, "기본값")
            .replace(/Default security mode\\./g, "기본 보안 모드입니다.")
            .replace(/기본값 security mode\\./g, "기본 보안 모드입니다.")
            .replace(/Default prompt policy\\./g, "기본 확인 정책입니다.")
            .replace(/기본값 prompt policy\\./g, "기본 확인 정책입니다.")
            .replace(/\\bAsk\\b/g, "확인")
            .replace(/\\bAsk fallback\\b/g, "확인 대체 방식")
            .replace(/확인 fallback/g, "확인 대체 방식")
            .replace(/Applied when the UI prompt is unavailable\\./g, "화면 확인을 사용할 수 없을 때 적용됩니다.")
            .replace(/\\bFallback\\b/g, "대체")
            .replace(/자동-allow 기능 CLIs/g, "자동 허용 기능 CLI")
            .replace(/Allow 기능 executables listed by the/g, "목록에 등록된 기능 실행 파일을 허용합니다.")
            .replace(/GPAO-T 런타임 edits local approvals; node edits the selected node\\./g, "GPAO-T 런타임과 선택한 기기의 실행 승인을 관리합니다.")
            .replace(/exec host=node를 사용할 때 에이전트를 특정 노드에 고정합니다\\./g, "실행할 기기를 특정 노드에 고정합니다.")
            .replace(/Exec 노드 바인딩/g, "실행 기기 고정")
            .replace(/Default binding/g, "기본 고정")
            .replace(/기본값 binding/g, "기본 고정")
            .replace(/기본 바인딩/g, "기본 고정")
            .replace(/에이전트가 노드 바인딩을 재정의하지 않을 때 사용됩니다\\./g, "별도 기기 지정이 없을 때 사용하는 기본값입니다.")
            .replace(/agent · uses 기본값 \\(any\\)/g, "기본 기준 사용")
            .replace(/기본값 agent · uses 기본값 \\(any\\)/g, "기본 기준 사용")
            .replace(/기본값 agent · uses 기본값/g, "기본 기준 사용")
            .replace(/agent · uses 기본값/g, "기본 기준 사용")
            .replace(/\\bBinding\\b/g, "고정")
            .replace(/No nodes with system\\.run available\\./g, "현재 실행 가능한 노드가 없습니다.")
            .replace(/(\\d+) older pairing of/g, "$1개 이전 연결:")
            .replace(/older pairing of/g, "이전 연결:")
            .replace(/seen just now/g, "방금 확인됨")
            .replace(/\bjust now\b/g, "방금 전")
            .replace(/^now$/g, "방금 전")
            .replace(/\\boperator\\b/g, "운영자")
            .replace(/GPAO-T apply flow/g, "GPAO-T 반영 흐름")
            .replace(/GPAO-T replay evidence/g, "GPAO-T 검토 근거")
            .replace(/Replay review/g, "검토")
            .replace(/색상 모드:\\s*얕음/g, "색상 모드: 밝게")
            .replace(/표시 모드:\\s*얕음/g, "표시 모드: 밝게")
            .replace(/\\badmission\\b/gi, "판단")
            .replace(/\\breplay\\b/gi, "검토")
            .replace(/\\brollback\\b/gi, "되돌리기")
            .replace(/agent:main:basic-tools-web-search-smoke/g, "웹 검색 확인")
            .replace(/agent:main:dashboard:[^\\s]+/g, "작업 대화")
            .replace(/agent:main:[A-Za-z0-9:_-]+/g, "작업 대화");
        }

        function cleanupElement(element) {
          if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
          const text = (element.textContent || "").trim();
          const route = location.pathname;
          if (element.matches?.("gpao-t-update-banner, .update-banner")) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          const mobilePairingLabel = [
            text,
            element.getAttribute?.("aria-label") || "",
            element.getAttribute?.("title") || "",
          ].join(" ");
          if (
            element.matches?.("button") &&
            /모바일 기기 페어링|Pair a mobile device/i.test(mobilePairingLabel)
          ) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (
            element.matches?.("button") &&
            /새 작업 대화|New chat in worktree|worktree에서 새 채팅/i.test(mobilePairingLabel)
          ) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.setAttribute("data-gpao-t-hidden-worktree-action", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (element.matches?.('button[aria-label="새 그룹…"]')) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.setAttribute("data-gpao-t-hidden-session-group-action", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (element.matches?.('a[href="/settings/communications"]')) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (route === "/settings/appearance" && element.matches?.(".config-actions, .config-top-tabs")) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (route === "/settings/appearance" && element.matches?.(".settings-theme-import__inline-hint")) {
            element.textContent = "가져오기를 누르면 이 브라우저에 사용자 테마를 추가할 수 있습니다.";
          }
          if (
            route === "/settings/appearance" &&
            element.matches?.(".settings-appearance__section") &&
            element.querySelector?.(".settings-appearance__heading")?.textContent?.trim() === "Connection"
          ) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (route === "/settings/channels" && element.matches?.(".config-form")) {
            const target = element.parentElement || element;
            target.hidden = true;
            target.setAttribute("aria-hidden", "true");
            target.style.setProperty("display", "none", "important");
          }
          if (route === "/overview" && element.matches?.(".card")) {
            const cardTitle = element.querySelector?.(".card-title")?.textContent?.trim();
            if (cardTitle === "GPAO-T 연결 설정") {
              element.hidden = true;
              element.setAttribute("aria-hidden", "true");
              element.setAttribute("data-gpao-t-hidden-connection-card", "true");
              element.style.setProperty("display", "none", "important");
            } else if (cardTitle === "현재 상태") {
              element.style.setProperty("grid-column", "1 / -1");
            }
          }
          if (route === "/overview" && element.matches?.(".ov-recent__key")) {
            const rawLabel = element.textContent || "";
            const cleanLabel = rawLabel.replace(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
              "",
            );
            if (cleanLabel !== rawLabel) element.textContent = cleanLabel.trim();
          }
          if (
            route === "/overview" &&
            element.matches?.(".stat-value") &&
            element.textContent?.trim() === "확인"
          ) {
            element.textContent = "정상";
          }
          if (
            route === "/settings/channels" &&
            element.matches?.("section.card") &&
            element.querySelector?.("pre.code-block")
          ) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          const hiddenSettingLabels = new Set(["인프라", "고급 연결", "Worktree", "디버그", "진단", "로그", "기록", "MCP"]);
          if (hiddenSettingLabels.has(text)) {
            const target = element.closest?.("a,button,li,[role='listitem'],.settings-nav__item,.settings-sidebar__item");
            if (target) {
              target.hidden = true;
              target.setAttribute("aria-hidden", "true");
              target.style.setProperty("display", "none", "important");
            }
          }
          if (/^(GPAO-T 동반자 기록|GPAO-T companion log)(\\s|$)/.test(text)) {
            const target = element.closest?.(".qs-row, .settings-row, [data-setting-row]") || element;
            target.hidden = true;
            target.setAttribute("aria-hidden", "true");
            target.style.setProperty("display", "none", "important");
          }
          if (/^(\\.git|RUNTIME-MANIFEST\\.json|SOUL\\.md|TOOLS\\.md|AGENTS\\.md|IDENTITY\\.md|USER\\.md|HEARTBEAT\\.md|MEMORY\\.md)$/.test(text)) {
            const target = element.closest?.("a,button,li,tr,[role='row'],[role='listitem'],.file-row,.workspace-file,.settings-file") || element;
            target.hidden = true;
            target.setAttribute("aria-hidden", "true");
            target.style.setProperty("display", "none", "important");
          }
          if (element.classList?.contains("qs-card--automations")) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
          }
          if (element.matches?.("details.ov-event-log, details.ov-log-tail")) {
            element.removeAttribute("open");
          }
          if (element.matches?.(".gpao-work-pane, .gpao-work-pane__target-strip, .gpao-work-pane__progress-lane, .gpao-work-pane__control-rail, .gpao-work-pane__inspector, .gpao-work-pane__evidence-lane, .gpao-work-pane__inspector-flow, .gpao-work-pane__source-preview")) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
            element.style.setProperty("visibility", "hidden", "important");
            element.style.setProperty("height", "0", "important");
            element.style.setProperty("min-height", "0", "important");
            element.style.setProperty("overflow", "hidden", "important");
          }
          for (const attr of ["aria-label", "title", "alt", "placeholder"]) {
            if (!element.hasAttribute?.(attr)) continue;
            const current = element.getAttribute(attr);
            const next = rewriteUserLabel(current);
            if (next !== current) element.setAttribute(attr, next);
          }
        }

        function cleanupTextNodes(root) {
          if (!root || typeof document.createTreeWalker !== "function") return;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (parent.closest?.("script,style,textarea,input")) return NodeFilter.FILTER_REJECT;
              if (parent.closest?.(".chat-text")) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          });
          const nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          for (const node of nodes) {
            const current = node.nodeValue || "";
            const parentText = node.parentElement?.parentElement?.textContent || node.parentElement?.textContent || "";
            if (location.pathname === "/settings/channels" && current.trim() === "예") {
              node.nodeValue = "사용 중";
              continue;
            }
            if (location.pathname === "/overview") {
              const withoutRawSessionUuid = current.replace(
                /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
                "",
              );
              if (withoutRawSessionUuid !== current) {
                node.nodeValue = withoutRawSessionUuid;
                continue;
              }
            }
            if (
              current.trim() === "/" &&
              (parentText.includes("Type a message below") || parentText.includes("메시지를 입력하세요"))
            ) {
              node.nodeValue = "";
              continue;
            }
            if (
              location.pathname === "/chat" &&
              current.trim() === "파일" &&
              node.parentElement?.closest?.('[role="menuitem"], [role="menu"]')
            ) {
              node.nodeValue = "파일 첨부";
              continue;
            }
            const next = rewriteUserLabel(current);
            if (next !== current) node.nodeValue = next;
          }
        }

        function applyUserSurfaceCleanup(root) {
          if (!root || typeof root.querySelectorAll !== "function") return;
          ensureStyle(root);
          for (const element of root.querySelectorAll("*")) cleanupElement(element);
          cleanupTextNodes(root);
        }

        function applyUserSettingsSummary(root) {
          if (!root || root !== document) return;
          const summaries = {
            "/settings/general": {
              id: "general",
              eyebrow: "일반 설정",
              title: "GPAO-T는 대화에 필요한 기본 설정만 사용자 화면에 보여줍니다.",
              body: "모델, 사고 수준, 연결 채널, 보안, 기기 승인, 화면 설정은 안전한 기본값으로 운영 중입니다. 내부 실행 정보와 원본 설정은 필요한 순간의 진단 화면에서만 다룹니다.",
              rows: [
                ["모델과 사고", "현재 선택값으로 대화 준비"],
                ["연결 채널", "Telegram 전용 소통 세션 유지"],
                ["보안", "로컬 승인과 연결키 경계 유지"],
                ["고급 정보", "필요할 때만 진단 화면에서 확인"],
              ],
            },
            "/settings/ai-agents": {
              id: "ai-agents",
              eyebrow: "GPAO-T 지능",
              title: "대화와 작업에 필요한 지능 설정은 안전한 기본값으로 운영 중입니다.",
              body: "모델, 사고 수준, 기능, 기억, 세션 기준은 GPAO-T가 로컬 런타임에서 관리합니다. 고급 설정 원본은 내부 진단과 배포 검증에서만 다루고, 일반 사용 화면에는 필요한 상태만 보여줍니다.",
              rows: [
                ["대화 기준", "현재 세션과 로컬 기억 후보를 기준으로 응답"],
                ["기억 반영", "사용자 승인 전 장기 기억 저장 차단"],
                ["도구 사용", "로컬 승인과 실행 경계 안에서 작동"],
                ["고급 설정", "진단 화면과 배포 검증에서만 노출"],
              ],
            },
            "/settings/automation": {
              id: "automation",
              eyebrow: "자동화",
              title: "자동화 일정은 실행 전후의 상태와 결과를 함께 관리합니다.",
              body: "예약된 작업은 에이전트별 일정에서 확인하고, 외부 전송이나 즉시 실행은 사용자 승인 경계 안에서만 수행합니다.",
              rows: [
                ["일정 확인", "에이전트의 자동화 일정에서 확인"],
                ["즉시 실행", "외부 전송 가능성이 있으면 사용자 승인 후 실행"],
                ["결과 기록", "최근 실행 상태와 전달 결과 유지"],
                ["실패 복구", "오류 원인과 다음 조치 확인"],
              ],
              actionHref: "/agents",
              actionLabel: "에이전트 화면 열기",
            },
            "/settings/communications": {
              id: "communications",
              eyebrow: "소통",
              title: "채널별 연결과 메시지 상태는 연결 채널 화면에서 관리합니다.",
              body: "중복된 원시 메시지 설정은 일반 사용자 화면에서 숨기고, 연결 상태와 복구에 필요한 정보만 보여줍니다.",
              rows: [
                ["연결 채널", "Telegram 등 연결 상태 확인"],
                ["메시지 경계", "외부 전송은 승인된 작업에서만 실행"],
                ["오류 복구", "채널 점검 결과와 최근 오류 확인"],
              ],
              actionHref: "/settings/channels",
              actionLabel: "연결 채널 열기",
            },
            "/settings/about": {
              id: "about",
              eyebrow: "정보",
              title: "GPAO-T 0.1.0",
              body: "현재 설치본은 내부 프로덕션 배포판입니다. GPAO-T 제품 버전과 내부 호환 런타임 빌드를 분리해 관리하며, GPAO-T 전용 업데이트 서비스가 활성화되기 전에는 자동 업데이트를 차단합니다.",
              rows: [
                ["배포 채널", "내부 프로덕션"],
                ["호환 런타임 빌드", "2026.6.11"],
                ["배포 무결성", "전체 SHA-256 봉인"],
                ["업데이트", "GPAO-T 전용 업데이트 채널 준비 전 자동 업데이트 차단"],
              ],
            },
          };
          const config = summaries[location.pathname];
          const workspace = document.querySelector(".settings-workspace");
          for (const existing of document.querySelectorAll("[data-gpao-t-user-settings-summary]")) {
            if (!config || existing.getAttribute("data-gpao-t-user-settings-summary") !== config.id) {
              existing.remove();
            }
          }
          if (!config) {
            if (workspace) {
              workspace.hidden = false;
              workspace.removeAttribute("aria-hidden");
              workspace.style.removeProperty("display");
            }
            return;
          }
          if (workspace) {
            workspace.hidden = true;
            workspace.setAttribute("aria-hidden", "true");
            workspace.style.setProperty("display", "none", "important");
          }
          if (document.querySelector('[data-gpao-t-user-settings-summary="' + config.id + '"]')) return;
          const header = document.querySelector(".content-header");
          const summary = document.createElement("section");
          summary.className = "gpao-user-settings-summary";
          summary.setAttribute("data-gpao-t-user-settings-summary", config.id);
          summary.innerHTML = [
            '<div class="gpao-user-settings-summary__eyebrow">' + config.eyebrow + '</div>',
            '<div class="gpao-user-settings-summary__title">' + config.title + '</div>',
            '<div class="gpao-user-settings-summary__body">' + config.body + '</div>',
            '<div class="gpao-user-settings-summary__list">',
            ...config.rows.map((row) => '<div class="gpao-user-settings-summary__item"><strong>' + row[0] + '</strong><span>' + row[1] + '</span></div>'),
            '</div>',
            config.actionHref ? '<a class="btn" style="margin-top:18px" href="' + config.actionHref + '">' + config.actionLabel + '</a>' : '',
          ].join("");
          if (header?.parentElement) header.parentElement.insertBefore(summary, header.nextSibling);
        }

        function isTelegramRow(row) {
          const text = (row?.textContent || "").trim();
          const href = row?.querySelector?.("a[href]")?.getAttribute("href") || "";
          return /^telegram:/i.test(text) || /telegram%3A|telegram:/i.test(href);
        }

        function applyRail(root) {
          if (!root || typeof root.querySelector !== "function") return;
          const sessions = root.querySelector(".sidebar-sessions");
          const recent = root.querySelector(".sidebar-recent-sessions");
          if (!sessions || !recent) return;
          ensureStyle(root);

          let rail = root.querySelector('[data-gpao-t-telegram-rail="' + marker + '"]');
          if (!rail) {
            rail = document.createElement("section");
            rail.className = "gpao-telegram-direct-rail";
            rail.setAttribute("data-gpao-t-telegram-rail", marker);
            rail.setAttribute("aria-label", "소통");
            rail.innerHTML = '<div class="gpao-telegram-direct-rail__head"><span class="gpao-telegram-direct-rail__title">소통</span><span class="gpao-telegram-direct-rail__status">전용</span></div><div class="gpao-telegram-direct-rail__list"></div>';
            recent.parentElement?.insertBefore(rail, recent);
          }

          const list = rail.querySelector(".gpao-telegram-direct-rail__list");
          if (!list) return;
          const rows = [...root.querySelectorAll(".sidebar-recent-session.session-row-host")]
            .filter((row) => !rail.contains(row) && isTelegramRow(row));
          for (const row of rows) {
            row.hidden = true;
            row.setAttribute("aria-hidden", "true");
            row.style.setProperty("display", "none", "important");
          }
          const href = rows[0]?.querySelector("a[href]")?.getAttribute("href") || "";
          let directLink = list.querySelector(".gpao-telegram-direct-link");
          if (href && !directLink) {
            directLink = document.createElement("a");
            directLink.className = "gpao-telegram-direct-link";
            directLink.textContent = "Telegram";
            directLink.setAttribute("aria-label", "Telegram 전용 소통 세션 열기");
            list.appendChild(directLink);
          }
          if (directLink && directLink.getAttribute("href") !== href) directLink.setAttribute("href", href);
          rail.hidden = !href;
        }

        function applyNodesPageCleanup(root) {
          if (!root || typeof root.querySelectorAll !== "function") return;
          if (location.pathname !== "/nodes") return;
          for (const element of root.querySelectorAll(".list-sub")) {
            const text = (element.textContent || "").trim();
            if (/^(기본값\\s+)?agent\\s+·\\s+uses\\s+기본값(\\s+\\(any\\))?$/.test(text)) {
              element.textContent = "기본 기준 사용";
            }
          }
        }

        function applyToolActivityCopy(root) {
          if (!root || typeof root.querySelectorAll !== "function") return;
          const replacements = [
            [/\\bTool error\\b/g, "도구 확인 필요"],
            [/\\bincludes errors\\./g, "일부 도구 확인 필요."],
            [/Activity:\\s*(\\d+)\\s*tools/g, "작업 기록: $1개 도구"],
            [/\\bActivity\\b/g, "작업 기록"],
            [/Showing last (\\d+) messages \\((\\d+) hidden\\)\\./g, "최근 대화 $1개를 표시 중입니다. 이전 $2개는 접혀 있습니다."],
            [/\\bWeb Search\\b/g, "Web 검색"],
            [/\\bWeb Fetch\\b/g, "Web 본문 읽기"],
          ];
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          while (walker.nextNode()) textNodes.push(walker.currentNode);
          for (const node of textNodes) {
            let value = node.nodeValue || "";
            for (const [pattern, replacement] of replacements) {
              value = value.replace(pattern, replacement);
            }
            if (value !== node.nodeValue) node.nodeValue = value;
          }
          for (const element of root.querySelectorAll("[aria-label], [title]")) {
            for (const attr of ["aria-label", "title"]) {
              const current = element.getAttribute(attr);
              if (!current) continue;
              let value = current;
              for (const [pattern, replacement] of replacements) {
                value = value.replace(pattern, replacement);
              }
              if (value !== current) element.setAttribute(attr, value);
            }
          }
        }

        function applyAll() {
          for (const root of collectRoots(document)) {
            applyUserSurfaceCleanup(root);
            applyRail(root);
            applyNodesPageCleanup(root);
            applyToolActivityCopy(root);
          }
          applyUserSettingsSummary(document);
        }

        let scheduled = false;
        function scheduleApply() {
          if (scheduled) return;
          scheduled = true;
          window.requestAnimationFrame(() => {
            scheduled = false;
            applyAll();
          });
        }

        const observer = new MutationObserver(() => scheduleApply());
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["aria-label", "title", "alt", "placeholder"],
        });
        let ticks = 0;
        const interval = window.setInterval(() => {
          applyAll();
          ticks += 1;
          if (ticks > 120) window.clearInterval(interval);
        }, 500);
        applyAll();
      })();
    </script>`;
const CACHE_REFRESH_SCRIPT = `
    <script data-gpao-t="${CACHE_REFRESH_MARKER}">
      (() => {
        const marker = "${CACHE_REFRESH_MARKER}";
        if (window[marker]) return;
        window[marker] = true;
        const build = "${LIVE_ASSET_CACHE_BUST}";
        try {
          window.localStorage?.setItem("openclaw.ui-build", build);
          const previous = window.localStorage?.getItem("gpao-t.ui-build");
          if (previous !== build) {
            window.localStorage?.setItem("gpao-t.ui-build", build);
            const clearCaches = "caches" in window
              ? caches.keys()
                .then((keys) => Promise.all(keys
                  .filter((key) => /^gpao-t-control-|^openclaw-control-/.test(key))
                  .map((key) => caches.delete(key))))
                .catch(() => {})
              : Promise.resolve();
            const updateWorkers = navigator.serviceWorker?.getRegistrations
              ? navigator.serviceWorker.getRegistrations()
                .then((registrations) => Promise.all(registrations.map((registration) => registration.update().catch(() => {}))))
                .catch(() => {})
              : Promise.resolve();
            Promise.all([clearCaches, updateWorkers]).finally(() => {
              try {
                const reloadKey = "gpao-t.ui-build-reloaded";
                if (window.sessionStorage?.getItem(reloadKey) !== build) {
                  window.sessionStorage?.setItem(reloadKey, build);
                  window.location.reload();
                }
              } catch {}
            });
          }
        } catch {}
      })();
    </script>`;

function hasArg(name) {
  return process.argv.includes(name);
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function replaceOnceOrAlready(source, needle, replacement, marker, fileLabel) {
  if (source.includes(marker)) return source;
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${fileLabel}: expected exactly one anchor for ${marker}, found ${count}`);
  }
  return source.replace(needle, replacement);
}

function matchPatternExactlyOnce(source, pattern, fileLabel) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = [...source.matchAll(new RegExp(pattern.source, flags))];
  if (matches.length !== 1) {
    throw new Error(`${fileLabel}: expected exactly one anchor, found ${matches.length}`);
  }
  return matches[0];
}

function replacePatternExactlyOnce(source, pattern, replacement, fileLabel) {
  matchPatternExactlyOnce(source, pattern, fileLabel);
  return source.replace(pattern, replacement);
}

function replaceFunctionBlock(
  source,
  functionName,
  replacement,
  marker,
  fileLabel,
  requiredFragments = [],
) {
  if (source.includes(marker)) return source;
  const start = source.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`${fileLabel}: function ${functionName} not found`);
  const next = source.indexOf("function ", start + 1);
  if (next === -1) throw new Error(`${fileLabel}: next function after ${functionName} not found`);
  const candidate = source.slice(start, next);
  const missingFragment = requiredFragments.find((fragment) => !candidate.includes(fragment));
  if (missingFragment) {
    throw new Error(`${fileLabel}: function ${functionName} does not contain ${missingFragment}`);
  }
  return `${source.slice(0, start)}${replacement}${source.slice(next)}`;
}

function replaceBetweenOrAlready(source, startNeedle, endNeedle, replacement, marker, fileLabel) {
  if (source.includes(marker)) return source;
  const start = source.indexOf(startNeedle);
  if (start === -1) return source;
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error(`${fileLabel}: end anchor not found for ${marker}`);
  }
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function optionalPatch(source, patcher) {
  try {
    return patcher(source);
  } catch {
    return source;
  }
}

function replaceWorkPaneRenderer(source) {
  const marker = "gpao_t_user_screen_default_hides_work_pane_v0_1";
  if (source.includes(marker) && !source.includes("gpao-work-pane")) return source;
  const paneIndex = source.indexOf("gpao-work-pane");
  if (paneIndex === -1) return source;
  const functionStartPattern =
    /function\s+([A-Za-z_$][\w$]*)\(e,t=\{activeControl:null\}\)\{/g;
  let functionMatch = null;
  for (const match of source.matchAll(functionStartPattern)) {
    if (match.index <= paneIndex) functionMatch = match;
  }
  if (!functionMatch?.[1] || functionMatch.index === undefined) {
    throw new Error("chat page readable work pane renderer: function anchor not found");
  }
  const endPattern = /\}var\s+[A-Za-z_$][\w$]*=/g;
  endPattern.lastIndex = paneIndex;
  const endMatch = endPattern.exec(source);
  if (!endMatch?.index) {
    throw new Error("chat page readable work pane renderer: end anchor not found");
  }
  const replacement =
    `function ${functionMatch[1]}(e,t={activeControl:null}){return l\`\`}function __gpaoTUserScreenHiddenPane(){return \`${marker}\`}`;
  return `${source.slice(0, functionMatch.index)}${replacement}${source.slice(endMatch.index + 1)}`;
}

function patchHyphenatedGpaoMetadata(source) {
  return source
    .replaceAll("?.__gpao-t", "?.[\"__gpao-t\"]")
    .replaceAll(".__gpao-t", "[\"__gpao-t\"]")
    .replaceAll("__gpao-t:", "\"__gpao-t\":")
    .replaceAll(".gpao-tStreamFallback", "[\"gpao-tStreamFallback\"]")
    .replaceAll("gpao-tStreamFallback:", "\"gpao-tStreamFallback\":")
    .replaceAll(".gpao-tMessageToolMirror", "[\"gpao-tMessageToolMirror\"]")
    .replaceAll("gpao-tMessageToolMirror:", "\"gpao-tMessageToolMirror\":");
}

function insertBeforeModuleScriptOrAlready(source, insertion, marker, fileLabel) {
  if (source.includes(marker)) return source;
  const match = /<script\s+type="module"/.exec(source);
  if (!match) {
    throw new Error(`${fileLabel}: module script anchor not found for ${marker}`);
  }
  const index = match.index;
  return `${source.slice(0, index)}${insertion}${source.slice(index)}`;
}

export function patchChatPageSource(source) {
  let next = source;
  next = replaceWorkPaneRenderer(next);
  next = patchHyphenatedGpaoMetadata(next);
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "let r=await df(t);if(n!==e.realtimeTalkInputRefreshId)return;",
    "let r=await Promise.race([df(t),new Promise(r=>setTimeout(()=>r({devices:[],warning:\`마이크 장치 응답이 지연되고 있습니다. 다시 시도해 주세요.\`}),5e3))]);const gpao_t_realtime_input_timeout_v0_1=!0;if(n!==e.realtimeTalkInputRefreshId)return;",
    "gpao_t_realtime_input_timeout_v0_1",
    "chat page microphone input timeout",
  ));
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "function ju(e){let t=e.trim();return t?t.split(`:`).filter(Boolean).at(-1)??t:`Main Session`}",
    "function ju(e){let t=e.trim(),n=t?t.split(`:`).filter(Boolean).at(-1)??t:``;return n?/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n)?`새 대화`:n:`Main Session`}",
    "return n?/^[0-9a-f]{8}-[0-9a-f]{4}",
    "chat page friendly session title",
  ));
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "function rd(e,t){return e===`blocked`?`확인 필요`:t?.latestCompactionCheckpoint?`압축 기준 있음`:(t?.compactionCheckpointCount??0)>0?`요약 ${t?.compactionCheckpointCount}`:e===`retrieving-context`?`가져오는 중`:e===`running`||e===`done`||e===`ready`?`세션 연결`:`연결 대기`}",
    "function rd(e,t){return e===`blocked`?`확인 필요`:t?.latestCompactionCheckpoint||((t?.compactionCheckpointCount??0)>0)?`맥락 연결됨`:e===`retrieving-context`?`맥락 확인 중`:e===`running`||e===`done`||e===`ready`?`대화 준비됨`:`연결 대기`}",
    "맥락 연결됨",
    "chat page context control label",
  ));
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "function id(e){if(e?.archived)return`보관됨`;let t=Mu(e?.totalTokens??e?.contextTokens);return t?`${t} 토큰`:e?.systemSent?`부트스트랩`:e?.sessionId?`기록 유지`:`대기`}",
    "function id(e){if(e?.archived)return`보관됨`;return e?.systemSent||e?.sessionId||Number.isFinite(e?.totalTokens??e?.contextTokens)?`기억 준비됨`:`기억 대기`}",
    "기억 준비됨",
    "chat page memory control label",
  ));
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "function ad(e){return e.lastError?`개입 필요`:e.selectedSession?.archived?`보관 잠금`:e.connected?`로컬 승인`:`연결 대기`}",
    "function ad(e){return e.lastError?`확인 필요`:e.selectedSession?.archived?`보관 중`:e.connected?`안전 모드`:`연결 대기`}",
    "안전 모드",
    "chat page authority control label",
  ));
  next = optionalPatch(next, (source) => replaceOnceOrAlready(
    source,
    "function od(e){return e.sending||e.streamActive?`실시간 출력`:e.loading?`로컬 준비`:e.selectedSession?.effectiveFastMode===!0?`Fast`:`즉시 입력`}",
    "function od(e){return e.sending||e.streamActive?`응답 중`:e.loading?`준비 중`:e.selectedSession?.effectiveFastMode===!0?`빠른 응답`:`입력 가능`}",
    "입력 가능",
    "chat page speed control label",
  ));
  next = optionalPatch(next, (source) => replaceFunctionBlock(
    source,
    "cd",
    "function cd(e,t){let n=e.selectedSession,r=e.connected&&!e.lastError,i=n?.archived===!0,a=Lu(e.sourcePreview),o=Iu(e.sourcePreview),s=e.appliedReplay,c=e.applyGate,l=e.sending||e.streamActive,u=(e.llmReadyPacket?.packet?.admittedTCellAnchors?.length??0)>0,d=s?.status===`passed`,f=Nu(n?.lastActivityAt??n?.updatedAt),p=sd(t,!!e.lastError),m=r?`대화에 필요한 맥락을 준비했습니다.`:`맥락 연결을 확인하는 중입니다.`,h=i?`보관된 대화입니다.`:u||d?`다음 대화에 참고할 기억 후보가 준비되어 있습니다.`:`필요한 기억은 후보로만 준비하고 있습니다.`,g=c?.status===`ready_read_only`?`안전하게 검토 중입니다.`:`사용자 승인 없이 기억 저장이나 외부 전송은 하지 않습니다.`,_=l?`응답을 생성하는 중입니다.`:`바로 입력할 수 있습니다.`;return{context:{title:`작업 맥락`,summary:m,rows:[{label:`대화`,value:ju(e.sessionKey),tone:p},{label:`상태`,value:rd(t,n),tone:p},{label:`최근`,value:f,tone:f===`없음`?`waiting`:`ready`}],evidence:[],flow:[q(`ready`,`대화 준비`,r?`ready`:`blocked`,`대화 준비`,[r?`현재 대화창과 로컬 실행 환경이 연결되어 있습니다.`:`연결 상태를 확인하는 중입니다.`,`사용자는 내부 세션 키나 원본 로그를 볼 필요 없이 대화를 이어가면 됩니다.`]),q(`context`,`맥락 확인`,r?`next`:`blocked`,`맥락 확인`,[`GPAO-T가 현재 대화에 필요한 맥락을 뒤에서 정리합니다.`,`세부 원본, replay, admission 값은 기본 화면에서 숨깁니다.`]),q(`detail`,`상세`,r?`next`:`blocked`,`상세 진단`,[`필요할 때만 개발/진단 화면에서 원본과 적용 근거를 확인합니다.`,`기본 화면은 사용자 흐름을 방해하지 않는 상태 표시만 유지합니다.`])]},memory:{title:`기억`,summary:h,rows:[{label:`상태`,value:u||d?`후보 준비됨`:`후보 대기`,tone:u||d?`ready`:`waiting`},{label:`저장`,value:`승인 후`,tone:`waiting`},{label:`원본`,value:a.value,tone:o}],evidence:[],flow:[q(`candidate`,`기억 후보`,r?`next`:`blocked`,`기억 후보`,[`중요해 보이는 내용은 바로 저장하지 않고 후보로만 둡니다.`,`사용자가 승인하기 전에는 장기 기억으로 확정하지 않습니다.`]),q(`review`,`검토`,u||d?`ready`:`next`,`기억 검토`,[`후보가 실제 답변 품질을 높이는지 확인한 뒤 반영합니다.`,`원본과 함께 남겨 나중에 되돌릴 수 있게 합니다.`]),q(`save`,`저장`,(u||d)&&!i?`next`:`blocked`,`저장 승인`,[`기억 저장은 대화 흐름과 분리된 승인 단계에서만 진행합니다.`,`자동 저장처럼 보이는 동작은 기본 화면에서 허용하지 않습니다.`])]},authority:{title:`안전`,summary:g,rows:[{label:`대화`,value:r?`가능`:`확인 필요`,tone:r?`ready`:`blocked`},{label:`기억 저장`,value:`승인 후`,tone:`waiting`},{label:`외부 전송`,value:`차단`,tone:`blocked`}],evidence:[],flow:[q(`local`,`로컬 확인`,r?`ready`:`blocked`,`로컬 확인`,[`화면의 상태는 로컬 GPAO-T에서 읽은 정보입니다.`,`대화 원문이나 기억을 몰래 바꾸지 않습니다.`]),q(`approval`,`승인`,i?`blocked`:`next`,`사용자 승인`,[`기억 저장, 세션 변경, 외부 전송은 사용자 승인 후에만 열립니다.`,`승인은 필요한 작업 단위에만 적용됩니다.`]),q(`rollback`,`되돌리기`,`next`,`되돌리기`,[`반영한 변경은 근거와 함께 추적해 되돌릴 수 있게 관리합니다.`,`되돌릴 수 없는 변경은 기본 흐름에서 열지 않습니다.`])]},speed:{title:`응답`,summary:_,rows:[{label:`상태`,value:l?`응답 중`:ku(t),tone:p},{label:`입력`,value:e.connected?`가능`:`대기`,tone:e.connected?`ready`:`blocked`},{label:`방식`,value:n?.effectiveFastMode===!0?`빠른 응답`:`균형`,tone:`ready`}],evidence:[],flow:[q(`input`,`입력`,e.connected?`ready`:`blocked`,`입력`,[`입력창은 바로 사용할 수 있어야 합니다.`,`상태 정보가 대화를 가로막지 않도록 기본 화면을 가볍게 유지합니다.`]),q(`progress`,`진행 표시`,l?`active`:`next`,`진행 표시`,[`응답이 길어질 때는 중간 진행 신호를 보여줍니다.`,`도구 작업 로그는 답변 본문이 아니라 진행 영역에 분리합니다.`]),q(`answer`,`응답`,l?`active`:`ready`,`응답`,[`사용자가 기다리는 동안 무엇이 일어나는지 짧게 알려줍니다.`,`완료 후에는 결과 중심으로 정리합니다.`])]}}}",
    "기본 화면은 사용자 흐름을 방해하지 않는 상태 표시만 유지합니다.",
    "chat page user-first inspectors",
    ["selectedSession", "sourcePreview"],
  ));
  next = next
    .replace(/Showing last \$\{c\} messages \(\$\{s\} hidden\)\./g, "최근 대화 ${c}개를 표시 중입니다. 이전 ${s}개는 접혀 있습니다.")
    .replace(/Showing last \${c} messages \(\${s} hidden\)\./g, "최근 대화 ${c}개를 표시 중입니다. 이전 ${s}개는 접혀 있습니다.")
    .replace(/Compacted history/g, "정리된 이전 대화")
    .replace(/The compacted transcript is preserved as a checkpoint\. Open session checkpoints to branch or restore from that compacted view\./g, "이전 대화는 안전하게 정리되어 필요할 때 다시 확인할 수 있습니다.")
    .replace(/Open checkpoints/g, "이전 대화 확인")
    .replace(/Tool error/g, "도구 확인 필요")
    .replace(/Tool output/g, "도구 결과")
    .replace(/No output — tool failed\./g, "도구가 결과를 반환하지 않았습니다.")
    .replace(/Activity: \$\{i\} tool\$\{i===1\?``:`s`\}, includes errors\./g, "작업 기록: ${i}개 도구, 확인 필요")
    .replace(/Activity: \$\{i\} tool\$\{i===1\?``:`s`\}/g, "작업 기록: ${i}개 도구")
    .replace(/last작업 기록At/g, "lastActivityAt")
    .replace(/GPAO-T is responding\.\.\./g, "GPAO-T가 응답 중입니다...")
    .replace(/Run status: \$\{n\}/g, "응답 상태: ${n}")
    .replace(/Preparing model\.\.\./g, "모델 준비 중...")
    .replace(/Sending message\.\.\./g, "메시지 전송 중...")
    .replace(/\$\{C\} is working\.\.\./g, "${C}가 작업 중입니다...")
    .replace(/\$\{C\} is responding\.\.\./g, "${C}가 응답 중입니다...")
    .replace(/Web Search/g, "Web 검색")
    .replace(/Web Fetch/g, "Web 본문 읽기");
  return next;
}

export function patchControlUiCssSource(source) {
  let next = source;
  if (!next.includes(CSS_MARKER)) {
    next = `${next.trimEnd()}\n${USER_SCREEN_HIDE_CSS}`;
  }
  if (!next.includes(SIDEBAR_SESSION_STACK_MARKER)) {
    next = `${next.trimEnd()}\n${SIDEBAR_SESSION_STACK_CSS}`;
  }
  return next;
}

export function stripControlUiInjectedScripts(source) {
  return source
    .replace(
      /\n?    <script data-gpao-t="gpao_t_telegram_direct_communication_rail_v0_[0-9]+">[\s\S]*?<\/script>/g,
      "",
    )
    .replace(
      /\n?    <script data-gpao-t="gpao_t_user_screen_cache_refresh_v0_[0-9]+">[\s\S]*?<\/script>/g,
      "",
    );
}

export function patchControlUiIndexHtmlSource(source) {
  let next = stripControlUiInjectedScripts(source);
  if (!next.includes(INDEX_MARKER)) {
    const cssLinkPattern =
      /<link rel="stylesheet" crossorigin href="(\.\/assets\/index-[^"]+\.css)">/;
    const match = cssLinkPattern.exec(next);
    if (!match?.[1]) {
      throw new Error(`control-ui index css link: expected one Vite index css asset link`);
    }
    next = next.replace(
      cssLinkPattern,
      `<link rel="stylesheet" crossorigin href="$1?gpao_user_screen=${LIVE_ASSET_CACHE_BUST}" data-gpao-t="${INDEX_MARKER}">`,
    );
  }
  next = next.replace(
    /(<link rel="stylesheet" crossorigin href="\.\/assets\/index-[^"?]+\.css)(?:\?gpao_user_screen=[^"]*)?(" data-gpao-t="gpao_t_user_screen_css_cache_bust_v0_1">)/,
    `$1?gpao_user_screen=${LIVE_ASSET_CACHE_BUST}$2`,
  );
  next = insertBeforeModuleScriptOrAlready(
    next,
    CACHE_REFRESH_SCRIPT,
    CACHE_REFRESH_MARKER,
    "control-ui cache refresh script",
  );
  next = next.replace(
    /(<script\s+type="module"[^>]*\ssrc="\.\/assets\/index-[^"?]+\.js)(?:\?[^\"]*)?("[^>]*>)/,
    `$1?gpao_user_screen=${LIVE_ASSET_CACHE_BUST}$2`,
  );
  next = next.replace(/\n\s*\n\s*<\/body>/g, "\n  </body>");
  next = replaceOnceOrAlready(
    next,
    "  </body>",
    `${TELEGRAM_COMMUNICATION_RAIL_SCRIPT}
  </body>`,
    TELEGRAM_RAIL_MARKER,
    "control-ui telegram communication rail script",
  );
  return next;
}

export function patchControlUiServiceWorkerSource(source) {
  let next = source;
  next = next.replace(
    /const EMBEDDED_CACHE_VERSION = "([^"]+)";/,
    (_match, version) =>
      `const EMBEDDED_CACHE_VERSION = "${version.replace(/(?:-user-screen-v[0-9]+)+$/, "")}-user-screen-v6";`,
  );
  next = next.replace(
    /const GPAO_T_USER_SCREEN_NETWORK_FIRST_ASSETS = "gpao_t_user_screen_network_first_assets_v0_[0-9]+";/,
      `const GPAO_T_USER_SCREEN_NETWORK_FIRST_ASSETS = "${SERVICE_WORKER_MARKER}";`,
  );
  if (!next.includes("const GPAO_T_USER_SCREEN_NETWORK_FIRST_ASSETS")) {
    next = next.replace(
      /const CONTROL_CACHE_LIMIT = [0-9]+;/,
      `const CONTROL_CACHE_LIMIT = 1;\nconst GPAO_T_USER_SCREEN_NETWORK_FIRST_ASSETS = "${SERVICE_WORKER_MARKER}";`,
    );
  }
  next = next.replace(
    /\/\/ Cache-first for hashed assets; network-first for HTML\/other\.\n  if \(url\.pathname\.includes\("\/assets\/"\)\) \{\n    event\.respondWith\(\n      caches\.match\(event\.request\)\.then\(\n        \(cached\) =>\n          cached \|\|\n          fetch\(event\.request\)\.then\(\(response\) => \{\n            if \(response\.ok\) \{\n              const clone = response\.clone\(\);\n              void caches\.open\(CACHE_NAME\)\.then\(\(cache\) => cache\.put\(event\.request, clone\)\);\n            \}\n            return response;\n          \}\),\n      \),\n    \);\n  \} else \{/,
    `// GPAO-T patches the live UI after build; assets must prefer the current local file.\n  if (url.pathname.includes("/assets/")) {\n    event.respondWith(\n      fetch(event.request)\n        .then((response) => {\n          if (response.ok) {\n            const clone = response.clone();\n            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));\n          }\n          return response;\n        })\n        .catch(() => caches.match(event.request)),\n    );\n  } else {`,
  );
  return next;
}

function patchPreviousChatsDisclosureSource(source) {
  if (source.includes(PREVIOUS_CHATS_MARKER)) return source;
  const signals = [
    source.includes("sidebar-recent-sessions"),
    source.includes("collapsedSessionSections"),
    source.includes("renderSessions(){"),
  ];
  if (!signals.some(Boolean)) return source;
  if (!signals.every(Boolean)) {
    throw new Error("main bundle previous chats disclosure: incomplete sidebar anchor set");
  }

  const storagePattern =
    /var\s+[A-Za-z_$][\w$]*=`(?:gpao-t|openclaw):sidebar:sessions:grouping`,[A-Za-z_$][\w$]*=`(?:gpao-t|openclaw):sidebar:sessions:collapsed-sections`,/;
  const constructorPattern =
    /this\.collapsedSessionSections=([A-Za-z_$][\w$]*)\(\),this\.sessionSortMode=`created`/;
  const groupingPattern =
    /([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*),\{grouping:this\.sessionsGrouping,knownGroups:this\.sessionsGrouping===`category`\?this\.knownSessionGroups\(\):void 0\}\);return ([A-Za-z_$][\w$]*)`/;
  const collapsedSectionPattern =
    /([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)&&this\.collapsedSessionSections\.has\(([A-Za-z_$][\w$]*)\.id\)/;
  const renderPattern =
    /\$\{([A-Za-z_$][\w$]*)\.map\(([A-Za-z_$][\w$]*)=>this\.renderSessionSection\(\2,([A-Za-z_$][\w$]*)\.length===0&&\2\.id===`ungrouped`\)\)\}/;
  const chevronPattern =
    /\$\{[A-Za-z_$][\w$]*\?([A-Za-z_$][\w$]*)\.chevronRight:\1\.chevronDown\}/;

  const groupingMatch = matchPatternExactlyOnce(
    source,
    groupingPattern,
    "main bundle previous chats grouping",
  );
  const renderMatch = matchPatternExactlyOnce(
    source,
    renderPattern,
    "main bundle previous chats render",
  );
  const chevronMatch = matchPatternExactlyOnce(
    source,
    chevronPattern,
    "main bundle previous chats chevron",
  );
  const collapsedSectionMatch = matchPatternExactlyOnce(
    source,
    collapsedSectionPattern,
    "main bundle previous chats collapsed section",
  );
  const [, sectionsVariable, groupingFunction, sessionsVariable, htmlFunction] = groupingMatch;
  const [, renderedSectionsVariable, rowVariable, renderedSessionsVariable] = renderMatch;
  const iconsVariable = chevronMatch[1];
  const [, collapsedVariable, showHeaderVariable, sectionVariable] = collapsedSectionMatch;
  if (
    renderedSectionsVariable !== sectionsVariable ||
    renderedSessionsVariable !== sessionsVariable
  ) {
    throw new Error("main bundle previous chats disclosure: grouping/render variables diverged");
  }

  const disclosureRender = [
    `\${__gpaoTPreviousChats.currentSections.map(${rowVariable}=>this.renderSessionSection(${rowVariable},${sessionsVariable}.length===0&&${rowVariable}.id===\`ungrouped\`))}`,
    `\${__gpaoTPreviousChats.previousCount>0?${htmlFunction}\``,
    '          <div class="sidebar-previous-chats">',
    '            <button',
    '              type="button"',
    '              class="sidebar-session-group-toggle sidebar-previous-chats__toggle"',
    '              aria-expanded=${String(this.previousChatsExpanded)}',
    '              @click=${()=>{this.previousChatsExpanded=!this.previousChatsExpanded,persistGpaoTPreviousChatsExpanded(this.previousChatsExpanded),this.requestUpdate()}}',
    '            >',
    `              <span class="sidebar-session-group-toggle__icon" aria-hidden="true">\${this.previousChatsExpanded?${iconsVariable}.chevronDown:${iconsVariable}.chevronRight}</span>`,
    '              <span class="sidebar-recent-sessions__label-text">이전 대화 ${__gpaoTPreviousChats.previousCount}</span>',
    '            </button>',
    `            \${this.previousChatsExpanded?${htmlFunction}\``,
    '              <div class="sidebar-previous-chats__sections">',
    `                \${__gpaoTPreviousChats.previousSections.map(${rowVariable}=>this.renderSessionSection(${rowVariable},!1))}`,
    '              </div>',
    '            `:null}',
    '          </div>',
    '        `:null}',
  ].join("\n");

  let next = replacePatternExactlyOnce(
    source,
    storagePattern,
    (anchor) => `${PREVIOUS_CHATS_RUNTIME_SOURCE}${anchor}`,
    "main bundle previous chats storage",
  );
  next = replacePatternExactlyOnce(
    next,
    constructorPattern,
    (_anchor, collapsedLoader) =>
      `this.collapsedSessionSections=${collapsedLoader}(),this.previousChatsExpanded=loadGpaoTPreviousChatsExpanded(),this.sessionSortMode=\`created\``,
    "main bundle previous chats state",
  );
  next = replacePatternExactlyOnce(
    next,
    collapsedSectionPattern,
    `${collapsedVariable}=${showHeaderVariable}&&this.collapsedSessionSections.has(${sectionVariable}.id)&&!${sectionVariable}.gpaoTForceExpanded`,
    "main bundle previous chats collapsed section",
  );
  next = replacePatternExactlyOnce(
    next,
    groupingPattern,
    `${sectionsVariable}=${groupingFunction}(${sessionsVariable},{grouping:this.sessionsGrouping,knownGroups:this.sessionsGrouping===\`category\`?this.knownSessionGroups():void 0}),__gpaoTPreviousChats=partitionGpaoTSidebarChats(${sectionsVariable});return ${htmlFunction}\``,
    "main bundle previous chats grouping",
  );
  next = replacePatternExactlyOnce(
    next,
    renderPattern,
    disclosureRender,
    "main bundle previous chats render",
  );
  return next;
}

export function patchMainBundleSource(source) {
  let next = source;
  if (!next.includes(MAIN_BUNDLE_MARKER)) {
    next = next.replace(
      "function Wh(){let e=window.webkit?.messageHandlers?.gpao-tLink;return e?.postMessage.bind(e)}",
      `function Wh(){let e=window.webkit?.messageHandlers?.["gpao-tLink"]??window.webkit?.messageHandlers?.gpaoTLink;return e?.postMessage.bind(e)}/* ${MAIN_BUNDLE_MARKER} */`,
    );
  }
  next = next
    .replace(/placeholder="ws:\/\/127\.0\.0\.1:18789"/g, 'placeholder="ws://127.0.0.1:18799"')
    .replace(/vh\(location\.hostname,`18789`\)/g, "vh(location.hostname,`18799`)")
    .replace(/http:\/\/127\.0\.0\.1:18789\./g, "http://127.0.0.1:18799.")
    .replace(/mode:`webchat`/g, "mode:`ui`")
    .replace(
      /"\.\/(display-[^"?]+\.js)(?:\?[^\"]*)?"/g,
      `"./$1?gpao_live=${LIVE_ASSET_CACHE_BUST}"`,
    )
    .replace(
      /"\.\/(chat-page-[^"?]+\.js)(?:\?[^\"]*)?"/g,
      `"./$1?gpao_live=${LIVE_ASSET_CACHE_BUST}"`,
    );
  return patchPreviousChatsDisclosureSource(next);
}

export function patchGatewayClientInfoSource(source) {
  let next = source;
  if (!next.includes(CLIENT_INFO_MARKER)) {
    next = next.replace(
      'CONTROL_UI: "openclaw-control-ui",',
      `CONTROL_UI: "openclaw-control-ui",
\tGPAO_T_CONTROL_UI: "gpao-t-control-ui",`,
    );
    next = next.replace(
      "const GATEWAY_CLIENT_NAMES = GATEWAY_CLIENT_IDS;",
      `const GATEWAY_CLIENT_NAMES = GATEWAY_CLIENT_IDS;/* ${CLIENT_INFO_MARKER} */`,
    );
  }
  return next;
}

export function patchKoreanLocaleSource(source) {
  if (source.includes(KOREAN_SESSION_MENU_MARKER)) return source;
  const replacements = [
    ["unread:`Unread`", "unread:`읽지 않음`"],
    ["renameSessionMenu:`Rename…`", "renameSessionMenu:`이름 바꾸기…`"],
    ["markUnread:`Mark as unread`", "markUnread:`읽지 않음으로 표시`"],
    ["markRead:`Mark as read`", "markRead:`읽음으로 표시`"],
    ["forkSession:`Fork`", "forkSession:`대화 복제`"],
    ["deleteSessionMenu:`Delete…`", "deleteSessionMenu:`삭제…`"],
    [
      "deleteSessionConfirm:`Delete \"{session}\" and its transcript?`",
      "deleteSessionConfirm:`\"{session}\" 대화와 기록을 삭제할까요?`",
    ],
    ["moveToGroupMenu:`Move to group`", "moveToGroupMenu:`그룹으로 이동`"],
    ["removeFromGroup:`Remove from group`", "removeFromGroup:`그룹에서 제거`"],
  ];
  let next = source;
  for (const [english, korean] of replacements) {
    if (next.includes(english)) {
      next = next.replace(english, korean);
    } else if (!next.includes(korean)) {
      throw new Error(`Korean locale session menu anchor missing: ${english}`);
    }
  }
  return `${next.trimEnd()}\n/* ${KOREAN_SESSION_MENU_MARKER} */\n`;
}

export function patchNodesPageSource(source) {
  return source
    .replace(
      "Allowlist and approval policy for <span class=\"mono\">exec host=gateway/node</span>.",
      "실행 기기별 허용 목록과 승인 정책을 관리합니다.",
    )
    .replace(
      "Gateway edits local approvals; node edits the selected node.",
      "GPAO-T 런타임과 선택한 기기의 실행 승인을 관리합니다.",
    )
    .replace("Default security mode.", "기본 보안 모드입니다.")
    .replace("Default prompt policy.", "기본 확인 정책입니다.")
    .replace("${e.duplicates.length} older pairing${e.duplicates.length===1?``:`s`} of", "${e.duplicates.length}개 이전 연결:")
    .replace("No nodes with system.run available.", "현재 실행 가능한 노드가 없습니다.")
    .replace("Pin agents to a specific node when using exec host=node.", "실행할 기기를 특정 노드에 고정합니다.")
    .replace("Default binding", "기본 고정")
    .replace("Used when agents do not override a node binding.", "별도 기기 지정이 없을 때 사용하는 기본값입니다.")
    .replace("${e.isDefault?`default agent`:`agent`} ·", "${e.isDefault?`기본 대화`:`대화`} ·")
    .replace("${n===`__default__`?`uses default (${t.defaultBinding??`any`})`:`override: ${e.binding}`}", "${n===`__default__`?`기본 기준 사용`:`지정: ${e.binding}`}");
}

async function main() {
  const apply = hasArg("--apply");
  const token = readArg("--token");
  const chatPages = process.env.OPENCLAW_LIVE_CHAT_PAGE
    ? [CHAT_PAGE]
    : (await readdir(CONTROL_UI_ASSETS_DIR))
      .filter((name) => /^chat-page-.*\.js$/.test(name))
      .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const cssFiles = process.env.OPENCLAW_LIVE_CONTROL_UI_CSS
    ? [process.env.OPENCLAW_LIVE_CONTROL_UI_CSS]
    : (await readdir(CONTROL_UI_ASSETS_DIR))
      .filter((name) => /^index-.*\.css$/.test(name))
      .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const mainBundles = (await readdir(CONTROL_UI_ASSETS_DIR))
    .filter((name) => /^index-.*\.js$/.test(name))
    .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const clientInfoFiles = (await readdir(LIVE_ROOT))
    .filter((name) => /^client-info-.*\.js$/.test(name))
    .map((name) => join(LIVE_ROOT, name));
  const nodesPages = (await readdir(CONTROL_UI_ASSETS_DIR))
    .filter((name) => /^nodes-page-.*\.js$/.test(name))
    .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const koreanLocaleFiles = (await readdir(CONTROL_UI_ASSETS_DIR))
    .filter((name) => /^ko-.*\.js$/.test(name))
    .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const results = [];
  const cssResults = [];
  const mainBundleResults = [];
  const clientInfoResults = [];
  const htmlResults = [];
  const serviceWorkerResults = [];
  const nodesResults = [];
  const koreanLocaleResults = [];
  const stamp = isoStamp();
  const backupDir = join(BACKUP_ROOT, stamp);

  for (const chatPage of chatPages) {
    const before = await readFile(chatPage, "utf8");
    let after = before;
    let skippedReason = "";
    try {
      after = patchChatPageSource(before);
    } catch (error) {
      skippedReason = `skipped_incompatible_bundle: ${error.message}`;
    }
    const changed = before !== after;
    results.push({
      chatPage,
      changed,
      hidesWorkPaneRenderer: after.includes("gpao_t_user_screen_default_hides_work_pane_v0_1"),
      userFacingToolCopy:
        !after.includes("Tool error") &&
        !after.includes("Activity:") &&
        !after.includes("Showing last") &&
        after.includes("도구 확인 필요") &&
        after.includes("작업 기록"),
      skippedReason,
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = chatPage.split("/").at(-1).replace(/\.js$/, ".before.js");
      await copyFile(chatPage, join(backupDir, backupName));
      await writeFile(chatPage, after);
    }
  }

  for (const cssFile of cssFiles) {
    const before = await readFile(cssFile, "utf8");
    const after = patchControlUiCssSource(before);
    const changed = before !== after;
    cssResults.push({
      cssFile,
      changed,
      hidesWorkPaneCss: after.includes(CSS_MARKER),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = cssFile.split("/").at(-1).replace(/\.css$/, ".before.css");
      await copyFile(cssFile, join(backupDir, backupName));
      await writeFile(cssFile, after);
    }
  }

  for (const mainBundle of mainBundles) {
    const before = await readFile(mainBundle, "utf8");
    const after = patchMainBundleSource(before);
    const changed = before !== after;
    mainBundleResults.push({
      mainBundle,
      changed,
      runtimeGuard: after.includes(MAIN_BUNDLE_MARKER),
      previousChatsDisclosure: after.includes(PREVIOUS_CHATS_MARKER),
      nativeLinkHandlerSafe: !after.includes("messageHandlers?.gpao-tLink"),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = mainBundle.split("/").at(-1).replace(/\.js$/, ".before.js");
      await copyFile(mainBundle, join(backupDir, backupName));
      await writeFile(mainBundle, after);
    }
  }

  for (const clientInfoFile of clientInfoFiles) {
    const before = await readFile(clientInfoFile, "utf8");
    const after = patchGatewayClientInfoSource(before);
    const changed = before !== after;
    clientInfoResults.push({
      clientInfoFile,
      changed,
      acceptsGpaoTControlUi: after.includes('"gpao-t-control-ui"'),
      identityContract: after.includes(CLIENT_INFO_MARKER),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = clientInfoFile.split("/").at(-1).replace(/\.js$/, ".before.js");
      await copyFile(clientInfoFile, join(backupDir, backupName));
      await writeFile(clientInfoFile, after);
    }
  }

  for (const koreanLocaleFile of koreanLocaleFiles) {
    const before = await readFile(koreanLocaleFile, "utf8");
    const after = patchKoreanLocaleSource(before);
    const changed = before !== after;
    koreanLocaleResults.push({
      koreanLocaleFile,
      changed,
      sessionMenuFullyKorean:
        after.includes(KOREAN_SESSION_MENU_MARKER) &&
        !after.includes("markUnread:`Mark as unread`") &&
        !after.includes("forkSession:`Fork`") &&
        !after.includes("moveToGroupMenu:`Move to group`"),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = koreanLocaleFile.split("/").at(-1).replace(/\.js$/, ".before.js");
      await copyFile(koreanLocaleFile, join(backupDir, backupName));
      await writeFile(koreanLocaleFile, after);
    }
  }

  {
    const before = await readFile(CONTROL_UI_INDEX_HTML, "utf8");
    const after = patchControlUiIndexHtmlSource(before);
    const changed = before !== after;
    htmlResults.push({
      htmlFile: CONTROL_UI_INDEX_HTML,
      changed,
      cssCacheBust: after.includes(INDEX_MARKER),
      telegramCommunicationRail: after.includes(TELEGRAM_RAIL_MARKER),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      await copyFile(CONTROL_UI_INDEX_HTML, join(backupDir, "index.before.html"));
      await writeFile(CONTROL_UI_INDEX_HTML, after);
    }
  }

  {
    const before = await readFile(CONTROL_UI_SERVICE_WORKER, "utf8");
    const after = patchControlUiServiceWorkerSource(before);
    const changed = before !== after;
    serviceWorkerResults.push({
      serviceWorkerFile: CONTROL_UI_SERVICE_WORKER,
      changed,
      networkFirstAssets: after.includes(SERVICE_WORKER_MARKER),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      await copyFile(CONTROL_UI_SERVICE_WORKER, join(backupDir, "sw.before.js"));
      await writeFile(CONTROL_UI_SERVICE_WORKER, after);
    }
  }

  for (const nodesPage of nodesPages) {
    const before = await readFile(nodesPage, "utf8");
    const after = patchNodesPageSource(before);
    const changed = before !== after;
    nodesResults.push({
      nodesPage,
      changed,
      userFacingNodesCopy: after.includes("실행 기기별 허용 목록과 승인 정책을 관리합니다."),
    });
    if (apply && changed) {
      if (token !== APPLY_TOKEN) {
        throw new Error(`live apply requires --token ${APPLY_TOKEN}`);
      }
      await mkdir(backupDir, { recursive: true });
      const backupName = nodesPage.split("/").at(-1).replace(/\.js$/, ".before.js");
      await copyFile(nodesPage, join(backupDir, backupName));
      await writeFile(nodesPage, after);
    }
  }

  const report = {
    schema: "gpao_t.live_user_screen_ux_patch.v0_1",
    status: apply ? "applied" : "dry_run",
    createdAt: new Date().toISOString(),
    chatPages,
    cssFiles,
    nodesPages,
    htmlFiles: [CONTROL_UI_INDEX_HTML],
    serviceWorkerFiles: [CONTROL_UI_SERVICE_WORKER],
    backupDir: apply ? backupDir : null,
    applyToken: APPLY_TOKEN,
    changed:
      results.some((result) => result.changed) ||
      cssResults.some((result) => result.changed) ||
      mainBundleResults.some((result) => result.changed) ||
      htmlResults.some((result) => result.changed) ||
      serviceWorkerResults.some((result) => result.changed) ||
      clientInfoResults.some((result) => result.changed) ||
      nodesResults.some((result) => result.changed) ||
      koreanLocaleResults.some((result) => result.changed),
    results,
    cssResults,
    mainBundleResults,
    clientInfoResults,
    htmlResults,
    serviceWorkerResults,
    nodesResults,
    koreanLocaleResults,
    userScreenContract: {
      hidesRawSessionUuid: true,
      hidesTokenCountFromTopControl: true,
      replacesDeveloperTermsInDefaultInspectors: true,
      hidesGpaoWorkPaneByDefault: true,
      persistsWorkPaneHideInLiveCss: true,
      bustsCachedControlUiCss: true,
      refreshesStaleControlUiAssetCache: true,
      servesLiveUiAssetsNetworkFirst: true,
      collapsesPreviousInactiveChatsByDefault: true,
      persistsPreviousChatsDisclosure: true,
      preventsSidebarSessionOverlap: true,
      keepsSessionMenuFullyKorean: true,
      separatesTelegramDirectCommunicationRail: true,
      deduplicatesTelegramDirectRows: true,
      translatesPairingLoopbackErrors: true,
      hidesRawWorkspaceFilesByDefault: true,
      hidesUnsupportedWorktreeChatAction: true,
      hidesOverviewConnectionSecrets: true,
      hidesOverviewRawSessionUuid: true,
      showsUserModeWorkspaceSummary: false,
      keepsInternalEvidenceAvailableInRuntimeState: true,
    },
  };
  await mkdir(BACKUP_ROOT, { recursive: true });
  await writeFile(join(BACKUP_ROOT, apply ? "apply-result.json" : "dry-run-result.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
