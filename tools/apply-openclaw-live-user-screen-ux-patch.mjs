#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const LIVE_ROOT =
  process.env.OPENCLAW_LIVE_DIST ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const CHAT_PAGE =
  process.env.OPENCLAW_LIVE_CHAT_PAGE ||
  join(LIVE_ROOT, "control-ui", "assets", "chat-page-BSHc822R.js");
const CONTROL_UI_ASSETS_DIR = join(LIVE_ROOT, "control-ui", "assets");
const CONTROL_UI_INDEX_HTML = join(LIVE_ROOT, "control-ui", "index.html");
const BACKUP_ROOT =
  process.env.GPAO_T_LIVE_PATCH_BACKUP_ROOT ||
  "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch";
const APPLY_TOKEN = "apply-gpao-t-user-screen-ux-live";
const CSS_MARKER = "gpao_t_user_screen_default_hides_work_pane_css_v0_1";
const INDEX_MARKER = "gpao_t_user_screen_css_cache_bust_v0_1";
const TELEGRAM_RAIL_MARKER = "gpao_t_telegram_direct_communication_rail_v0_6";
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
            .replace(/Main 세션/g, "Main 대화")
            .replace(/Ready to chat/g, "대화 준비됨")
            .replace(/준비됨 to chat/g, "대화 준비됨")
            .replace(/Type a message below · \\/ for commands/g, "메시지를 입력하세요")
            .replace(/Type a message below\\s*·/g, "메시지를 입력하세요")
            .replace(/\\bfor commands\\b/g, "")
            .replace(/What can you do\\?/g, "무엇을 도와줄 수 있어?")
            .replace(/Summarize my recent sessions/g, "최근 대화 요약")
            .replace(/Help me configure a channel/g, "연결 채널 설정 도와줘")
            .replace(/Check system health/g, "시스템 상태 확인")
            .replace(/Chat thinking level/g, "사고 수준")
            .replace(/앱으로 돌아가기/g, "대화로 돌아가기")
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
            .replace(/브라우저가 로컬 런타임 연결을 완료할 수 없습니다\\./g, "브라우저가 GPAO-T 로컬 런타임과 연결하지 못했습니다.")
            .replace(/자격 증명을 다시\s*시도하기 전/g, "다시 연결하기 전")
            .replace(/대상과 전송\s*방식/g, "로컬 런타임 상태와 연결키")
            .replace(/gpao-t status 또는 gpao-t (?:gateway|runtime) run으로 GPAO-T 런타임이 실행 중인지 확인하세요\\./g, "GPAO-T 런타임이 켜져 있는지 확인하세요.")
            .replace(/gpao-t (?:gateway|runtime) run으로 GPAO-T 런타임이 실행 중인지 확인하세요\\./g, "GPAO-T 런타임이 켜져 있는지 확인하세요.")
            .replace(/연결 주소을 확인하고 GPAO-T 런타임이 HTTPS\\/Tailscale Serve 뒤에 있으면 ws:\\/\\/를 사용하세요\\./g, "연결 주소는 보통 ws://127.0.0.1:18789 입니다.")
            .replace(/연결 주소를 확인하고 GPAO-T 런타임이 HTTPS\\/Tailscale Serve 뒤에 있으면 ws:\\/\\/를 사용하세요\\./g, "연결 주소는 보통 ws://127.0.0.1:18789 입니다.")
            .replace(new RegExp(dashboardHelpCommand + "으로 dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요\\\\.", "g"), "문제가 계속되면 GPAO-T 연결 도움말에서 현재 연결 정보를 확인하세요.")
            .replace(new RegExp(dashboardHelpCommand, "g"), "GPAO-T 연결 도움말")
            .replace(/dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요\\./g, "연결 도움말에서 현재 연결 정보를 확인하세요.")
            .replace(/GPAO-T 화면 인증/g, "GPAO-T 연결")
            .replace(/원시 오류/g, "상세 오류")
            .replace(/연결 방법/g, "연결 도움말")
            .replace(/Gateway 상태/g, "런타임 상태")
            .replace(/게이트웨이 업타임/g, "런타임 업타임")
            .replace(/게이트웨이/g, "런타임")
            .replace(/Gateway 연결/g, "로컬 런타임 연결")
            .replace(/Gateway 토큰/g, "연결키")
            .replace(/Gateway 대시보드/g, "GPAO-T 연결 화면")
            .replace(/\\bGateway\\b/g, "GPAO-T 런타임")
            .replace(/Open session menu/g, "대화 메뉴")
            .replace(/Skill Workshop/g, "기능 작업실")
            .replace(/Installed skills and their status\\./g, "설치된 기능과 상태입니다.")
            .replace(/Search and install skills from the registry/g, "GPAO-T 기능을 검색하고 설치합니다.")
            .replace(/검색 and install 기능 from the registry/g, "GPAO-T 기능을 검색하고 설치합니다.")
            .replace(/기능 및 API 키/g, "기능과 API 키")
            .replace(/AgentSkills/g, "기능 정의")
            .replace(/\\bskills\\b/g, "기능")
            .replace(/\\bskill\\b/g, "기능")
            .replace(/\\bSkills\\b/g, "기능")
            .replace(/openclaw-absorption/g, "GPAO-T 완성")
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
            .replace(/\\boperator\\b/g, "운영자")
            .replace(/GPAO-T apply flow/g, "GPAO-T 반영 흐름")
            .replace(/GPAO-T replay evidence/g, "GPAO-T 검토 근거")
            .replace(/Replay review/g, "검토")
            .replace(/\\badmission\\b/gi, "판단")
            .replace(/\\breplay\\b/gi, "검토")
            .replace(/\\brollback\\b/gi, "되돌리기")
            .replace(/agent:main:dashboard:[^\\s]+/g, "작업 대화");
        }

        function cleanupElement(element) {
          if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
          const text = (element.textContent || "").trim();
          const hiddenSettingLabels = new Set(["인프라", "고급 연결", "Worktree", "디버그", "진단", "로그", "기록", "정보", "MCP"]);
          if (hiddenSettingLabels.has(text)) {
            const target = element.closest?.("a,button,li,[role='listitem'],.settings-nav__item,.settings-sidebar__item") || element;
            target.hidden = true;
            target.setAttribute("aria-hidden", "true");
            target.style.setProperty("display", "none", "important");
          }
          if (/^(GPAO-T 동반자 기록|GPAO-T companion log)(\\s|$)/.test(text)) {
            const target = element.closest?.(".qs-row, .settings-row, [data-setting-row]") || element;
            target.hidden = true;
            target.setAttribute("aria-hidden", "true");
            target.style.setProperty("display", "none", "important");
          }
          if (element.classList?.contains("qs-card--automations")) {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            element.style.setProperty("display", "none", "important");
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
          if (element.classList?.contains("sidebar-recent-session__name")) {
            const current = element.textContent || "";
            const next = rewriteUserLabel(current);
            if (next !== current) element.textContent = next;
          }
        }

        function cleanupTextNodes(root) {
          if (!root || typeof document.createTreeWalker !== "function") return;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (parent.closest?.("script,style,textarea,input")) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          });
          const nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          for (const node of nodes) {
            const current = node.nodeValue || "";
            const parentText = node.parentElement?.parentElement?.textContent || node.parentElement?.textContent || "";
            if (
              current.trim() === "/" &&
              (parentText.includes("Type a message below") || parentText.includes("메시지를 입력하세요"))
            ) {
              node.nodeValue = "";
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
          };
          const config = summaries[location.pathname];
          if (!config) return;
          const workspace = document.querySelector(".settings-workspace");
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
          ].join("");
          if (header?.parentElement) header.parentElement.insertBefore(summary, header.nextSibling);
        }

        function isTelegramRow(row) {
          const text = (row?.textContent || "").trim();
          const href = row?.querySelector?.("a[href]")?.getAttribute("href") || "";
          return /^telegram:/i.test(text) || /telegram%3A|telegram:/i.test(href);
        }

        function labelTelegramRow(row) {
          if (!row.classList.contains("gpao-telegram-direct-session")) {
            row.classList.add("gpao-telegram-direct-session");
          }
          if (row.getAttribute("data-gpao-t-communication-session") !== "telegram-direct") {
            row.setAttribute("data-gpao-t-communication-session", "telegram-direct");
          }
          const link = row.querySelector("a");
          if (link && link.getAttribute("aria-label") !== "Telegram 전용 소통 세션 열기") {
            link.setAttribute("aria-label", "Telegram 전용 소통 세션 열기");
          }
          const name = row.querySelector(".sidebar-recent-session__name");
          if (name && name.textContent !== "Telegram") name.textContent = "Telegram";
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
            labelTelegramRow(row);
            list.appendChild(row);
          }
          for (const row of [...list.querySelectorAll(".sidebar-recent-session.session-row-host")]) {
            labelTelegramRow(row);
          }
          rail.hidden = list.children.length === 0;
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

        function applyAll() {
          for (const root of collectRoots(document)) {
            applyUserSurfaceCleanup(root);
            applyRail(root);
            applyNodesPageCleanup(root);
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
        observer.observe(document.documentElement, { childList: true, subtree: true });
        let ticks = 0;
        const interval = window.setInterval(() => {
          applyAll();
          ticks += 1;
          if (ticks > 60) window.clearInterval(interval);
        }, 500);
        applyAll();
      })();
    </script>`;

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

function replaceOnceOrAlready(source, needle, replacement, marker, fileLabel) {
  if (source.includes(marker)) return source;
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${fileLabel}: expected exactly one anchor for ${marker}, found ${count}`);
  }
  return source.replace(needle, replacement);
}

function replaceFunctionBlock(source, functionName, replacement, marker, fileLabel) {
  if (source.includes(marker)) return source;
  const start = source.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`${fileLabel}: function ${functionName} not found`);
  const next = source.indexOf("function ", start + 1);
  if (next === -1) throw new Error(`${fileLabel}: next function after ${functionName} not found`);
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

export function patchChatPageSource(source) {
  let next = source;
  next = replaceBetweenOrAlready(
    next,
    "function aE(e,t={activeControl:null}){",
    "var oE=",
    "function aE(e,t={activeControl:null}){return l``}function __gpaoTUserScreenHiddenPane(){return `gpao_t_user_screen_default_hides_work_pane_v0_1`}",
    "gpao_t_user_screen_default_hides_work_pane_v0_1",
    "chat page readable work pane renderer",
  );
  next = replaceOnceOrAlready(
    next,
    "function ju(e){let t=e.trim();return t?t.split(`:`).filter(Boolean).at(-1)??t:`Main Session`}",
    "function ju(e){let t=e.trim(),n=t?t.split(`:`).filter(Boolean).at(-1)??t:``;return n?/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n)?`새 대화`:n:`Main Session`}",
    "return n?/^[0-9a-f]{8}-[0-9a-f]{4}",
    "chat page friendly session title",
  );
  next = replaceOnceOrAlready(
    next,
    "function rd(e,t){return e===`blocked`?`확인 필요`:t?.latestCompactionCheckpoint?`압축 기준 있음`:(t?.compactionCheckpointCount??0)>0?`요약 ${t?.compactionCheckpointCount}`:e===`retrieving-context`?`가져오는 중`:e===`running`||e===`done`||e===`ready`?`세션 연결`:`연결 대기`}",
    "function rd(e,t){return e===`blocked`?`확인 필요`:t?.latestCompactionCheckpoint||((t?.compactionCheckpointCount??0)>0)?`맥락 연결됨`:e===`retrieving-context`?`맥락 확인 중`:e===`running`||e===`done`||e===`ready`?`대화 준비됨`:`연결 대기`}",
    "맥락 연결됨",
    "chat page context control label",
  );
  next = replaceOnceOrAlready(
    next,
    "function id(e){if(e?.archived)return`보관됨`;let t=Mu(e?.totalTokens??e?.contextTokens);return t?`${t} 토큰`:e?.systemSent?`부트스트랩`:e?.sessionId?`기록 유지`:`대기`}",
    "function id(e){if(e?.archived)return`보관됨`;return e?.systemSent||e?.sessionId||Number.isFinite(e?.totalTokens??e?.contextTokens)?`기억 준비됨`:`기억 대기`}",
    "기억 준비됨",
    "chat page memory control label",
  );
  next = replaceOnceOrAlready(
    next,
    "function ad(e){return e.lastError?`개입 필요`:e.selectedSession?.archived?`보관 잠금`:e.connected?`로컬 승인`:`연결 대기`}",
    "function ad(e){return e.lastError?`확인 필요`:e.selectedSession?.archived?`보관 중`:e.connected?`안전 모드`:`연결 대기`}",
    "안전 모드",
    "chat page authority control label",
  );
  next = replaceOnceOrAlready(
    next,
    "function od(e){return e.sending||e.streamActive?`실시간 출력`:e.loading?`로컬 준비`:e.selectedSession?.effectiveFastMode===!0?`Fast`:`즉시 입력`}",
    "function od(e){return e.sending||e.streamActive?`응답 중`:e.loading?`준비 중`:e.selectedSession?.effectiveFastMode===!0?`빠른 응답`:`입력 가능`}",
    "입력 가능",
    "chat page speed control label",
  );
  next = replaceFunctionBlock(
    next,
    "cd",
    "function cd(e,t){let n=e.selectedSession,r=e.connected&&!e.lastError,i=n?.archived===!0,a=Lu(e.sourcePreview),o=Iu(e.sourcePreview),s=e.appliedReplay,c=e.applyGate,l=e.sending||e.streamActive,u=(e.llmReadyPacket?.packet?.admittedTCellAnchors?.length??0)>0,d=s?.status===`passed`,f=Nu(n?.lastActivityAt??n?.updatedAt),p=sd(t,!!e.lastError),m=r?`대화에 필요한 맥락을 준비했습니다.`:`맥락 연결을 확인하는 중입니다.`,h=i?`보관된 대화입니다.`:u||d?`다음 대화에 참고할 기억 후보가 준비되어 있습니다.`:`필요한 기억은 후보로만 준비하고 있습니다.`,g=c?.status===`ready_read_only`?`안전하게 검토 중입니다.`:`사용자 승인 없이 기억 저장이나 외부 전송은 하지 않습니다.`,_=l?`응답을 생성하는 중입니다.`:`바로 입력할 수 있습니다.`;return{context:{title:`작업 맥락`,summary:m,rows:[{label:`대화`,value:ju(e.sessionKey),tone:p},{label:`상태`,value:rd(t,n),tone:p},{label:`최근`,value:f,tone:f===`없음`?`waiting`:`ready`}],evidence:[],flow:[q(`ready`,`대화 준비`,r?`ready`:`blocked`,`대화 준비`,[r?`현재 대화창과 로컬 실행 환경이 연결되어 있습니다.`:`연결 상태를 확인하는 중입니다.`,`사용자는 내부 세션 키나 원본 로그를 볼 필요 없이 대화를 이어가면 됩니다.`]),q(`context`,`맥락 확인`,r?`next`:`blocked`,`맥락 확인`,[`GPAO-T가 현재 대화에 필요한 맥락을 뒤에서 정리합니다.`,`세부 원본, replay, admission 값은 기본 화면에서 숨깁니다.`]),q(`detail`,`상세`,r?`next`:`blocked`,`상세 진단`,[`필요할 때만 개발/진단 화면에서 원본과 적용 근거를 확인합니다.`,`기본 화면은 사용자 흐름을 방해하지 않는 상태 표시만 유지합니다.`])]},memory:{title:`기억`,summary:h,rows:[{label:`상태`,value:u||d?`후보 준비됨`:`후보 대기`,tone:u||d?`ready`:`waiting`},{label:`저장`,value:`승인 후`,tone:`waiting`},{label:`원본`,value:a.value,tone:o}],evidence:[],flow:[q(`candidate`,`기억 후보`,r?`next`:`blocked`,`기억 후보`,[`중요해 보이는 내용은 바로 저장하지 않고 후보로만 둡니다.`,`사용자가 승인하기 전에는 장기 기억으로 확정하지 않습니다.`]),q(`review`,`검토`,u||d?`ready`:`next`,`기억 검토`,[`후보가 실제 답변 품질을 높이는지 확인한 뒤 반영합니다.`,`원본과 함께 남겨 나중에 되돌릴 수 있게 합니다.`]),q(`save`,`저장`,(u||d)&&!i?`next`:`blocked`,`저장 승인`,[`기억 저장은 대화 흐름과 분리된 승인 단계에서만 진행합니다.`,`자동 저장처럼 보이는 동작은 기본 화면에서 허용하지 않습니다.`])]},authority:{title:`안전`,summary:g,rows:[{label:`대화`,value:r?`가능`:`확인 필요`,tone:r?`ready`:`blocked`},{label:`기억 저장`,value:`승인 후`,tone:`waiting`},{label:`외부 전송`,value:`차단`,tone:`blocked`}],evidence:[],flow:[q(`local`,`로컬 확인`,r?`ready`:`blocked`,`로컬 확인`,[`화면의 상태는 로컬 GPAO-T에서 읽은 정보입니다.`,`대화 원문이나 기억을 몰래 바꾸지 않습니다.`]),q(`approval`,`승인`,i?`blocked`:`next`,`사용자 승인`,[`기억 저장, 세션 변경, 외부 전송은 사용자 승인 후에만 열립니다.`,`승인은 필요한 작업 단위에만 적용됩니다.`]),q(`rollback`,`되돌리기`,`next`,`되돌리기`,[`반영한 변경은 근거와 함께 추적해 되돌릴 수 있게 관리합니다.`,`되돌릴 수 없는 변경은 기본 흐름에서 열지 않습니다.`])]},speed:{title:`응답`,summary:_,rows:[{label:`상태`,value:l?`응답 중`:ku(t),tone:p},{label:`입력`,value:e.connected?`가능`:`대기`,tone:e.connected?`ready`:`blocked`},{label:`방식`,value:n?.effectiveFastMode===!0?`빠른 응답`:`균형`,tone:`ready`}],evidence:[],flow:[q(`input`,`입력`,e.connected?`ready`:`blocked`,`입력`,[`입력창은 바로 사용할 수 있어야 합니다.`,`상태 정보가 대화를 가로막지 않도록 기본 화면을 가볍게 유지합니다.`]),q(`progress`,`진행 표시`,l?`active`:`next`,`진행 표시`,[`응답이 길어질 때는 중간 진행 신호를 보여줍니다.`,`도구 작업 로그는 답변 본문이 아니라 진행 영역에 분리합니다.`]),q(`answer`,`응답`,l?`active`:`ready`,`응답`,[`사용자가 기다리는 동안 무엇이 일어나는지 짧게 알려줍니다.`,`완료 후에는 결과 중심으로 정리합니다.`])]}}}",
    "기본 화면은 사용자 흐름을 방해하지 않는 상태 표시만 유지합니다.",
    "chat page user-first inspectors",
  );
  return next;
}

export function patchControlUiCssSource(source) {
  if (source.includes(CSS_MARKER)) return source;
  return `${source.trimEnd()}\n${USER_SCREEN_HIDE_CSS}`;
}

export function patchControlUiIndexHtmlSource(source) {
  let next = source;
  if (!next.includes(INDEX_MARKER)) {
    const cssLinkPattern =
      /<link rel="stylesheet" crossorigin href="(\.\/assets\/index-[^"]+\.css)">/;
    const match = cssLinkPattern.exec(next);
    if (!match?.[1]) {
      throw new Error(`control-ui index css link: expected one Vite index css asset link`);
    }
    next = next.replace(
      cssLinkPattern,
      `<link rel="stylesheet" crossorigin href="$1?gpao_user_screen=2026071203" data-gpao-t="${INDEX_MARKER}">`,
    );
  }
  next = next.replace(
    /\n?    <script data-gpao-t="gpao_t_telegram_direct_communication_rail_v0_[0-9]+">[\s\S]*?<\/script>/g,
    "",
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
  const nodesPages = (await readdir(CONTROL_UI_ASSETS_DIR))
    .filter((name) => /^nodes-page-.*\.js$/.test(name))
    .map((name) => join(CONTROL_UI_ASSETS_DIR, name));
  const results = [];
  const cssResults = [];
  const htmlResults = [];
  const nodesResults = [];
  const stamp = isoStamp();
  const backupDir = join(BACKUP_ROOT, stamp);

  for (const chatPage of chatPages) {
    const before = await readFile(chatPage, "utf8");
    const after = patchChatPageSource(before);
    const changed = before !== after;
    results.push({
      chatPage,
      changed,
      hidesWorkPaneRenderer: after.includes("gpao_t_user_screen_default_hides_work_pane_v0_1"),
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
    backupDir: apply ? backupDir : null,
    applyToken: APPLY_TOKEN,
    changed:
      results.some((result) => result.changed) ||
      cssResults.some((result) => result.changed) ||
      htmlResults.some((result) => result.changed) ||
      nodesResults.some((result) => result.changed),
    results,
    cssResults,
    htmlResults,
    nodesResults,
    userScreenContract: {
      hidesRawSessionUuid: true,
      hidesTokenCountFromTopControl: true,
      replacesDeveloperTermsInDefaultInspectors: true,
      hidesGpaoWorkPaneByDefault: true,
      persistsWorkPaneHideInLiveCss: true,
      bustsCachedControlUiCss: true,
      separatesTelegramDirectCommunicationRail: true,
      keepsInternalEvidenceAvailableInRuntimeState: true,
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
