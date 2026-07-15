#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_CONTROL_UI = join(
  homedir(),
  ".gpao-t",
  "current",
  "compatibility",
  "gpao-t",
  "dist",
  "control-ui",
);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

const SKILLS_ROUTE_SOURCE = "$o=N({id:`skills`,path:`/skills`,loader:Qo,component:()=>M(()=>import(`./skills-page-DwYk0iep.js`).then(()=>({header:!0,render:e=>f`<gpao-t-skills-page .routeData=${e}></gpao-t-skills-page>`})),__vite__mapDeps([33,1,2,3,4,7,12,19,28,18,17,29]),import.meta.url)})";

const MODEL_CONNECTION_PANEL_SOURCE = [
  "<section style=\"padding:24px 28px 18px;max-width:1120px\">",
  "<div style=\"display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px\">",
  "<div><h1 style=\"margin:0 0 8px;font-size:28px;letter-spacing:0\">모델 연결</h1>",
  "<p style=\"margin:0;color:var(--muted);line-height:1.55\">OpenAI, Anthropic, Gemini 같은 모델 provider와 API 키 연결을 관리합니다. 이 화면 안에서 상태 확인, API 키 관리, 런타임 설정으로 바로 이동합니다.</p></div>",
  "<a href=\"/chat?session=main\" style=\"display:inline-flex;align-items:center;min-height:38px;padding:0 13px;border:1px solid var(--border);border-radius:7px;text-decoration:none;color:var(--fg);background:var(--panel)\">채팅으로 돌아가기</a>",
  "</div>",
  "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0\">",
  "<article style=\"border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:16px\"><strong>OpenAI</strong><p style=\"margin:8px 0 0;color:var(--muted);line-height:1.5\">기본 실제 모델 응답 경로입니다. API 키 관리에서 OpenAI 관련 항목을 저장한 뒤 새 대화로 검증합니다.</p></article>",
  "<article style=\"border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:16px\"><strong>Anthropic</strong><p style=\"margin:8px 0 0;color:var(--muted);line-height:1.5\">선택 provider입니다. 모델 선택 확장 시 API 키 관리와 런타임 설정을 함께 확인합니다.</p></article>",
  "<article style=\"border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:16px\"><strong>Google Gemini</strong><p style=\"margin:8px 0 0;color:var(--muted);line-height:1.5\">선택 provider입니다. 연결 후 실제 응답과 로그까지 확인해야 합니다.</p></article>",
  "</div>",
  "<div style=\"display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px\">",
  "<a href=\"/skills\" style=\"display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:7px;text-decoration:none;font-weight:650;color:white;background:#d84d3f;border:1px solid #d84d3f\">기능/API 키 관리 열기</a>",
  "<a href=\"/settings/general\" style=\"display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:7px;text-decoration:none;font-weight:650;color:var(--fg);background:var(--panel);border:1px solid var(--border)\">런타임 설정 열기</a>",
  "</div>",
  "<p style=\"margin:10px 0 0;color:var(--muted);line-height:1.55\">API 키와 토큰 값은 화면이나 로그에 다시 표시하지 않습니다. 연결 후에는 반드시 새 대화에서 실제 모델 응답이 나오는지 확인합니다.</p>",
  "</section>",
].join("");

const MODEL_CONNECTION_ROUTE_SOURCE =
  "var eu=N({id:`model-connection`,path:`/settings/model-connection`,aliases:[`/model-connection`],loader:Qo,component:()=>M(()=>import(`./skills-page-DwYk0iep.js`).then(()=>({header:!0,render:e=>f`"
  + MODEL_CONNECTION_PANEL_SOURCE
  + "<gpao-t-skills-page .routeData=${e}></gpao-t-skills-page>`})),__vite__mapDeps([33,1,2,3,4,7,12,19,28,18,17,29]),import.meta.url)}),"
  + SKILLS_ROUTE_SOURCE
  + ";async function es(";

const BASIC_SKILL_KOREAN_DESCRIPTIONS = {
  "1password": "1Password CLI로 로그인 상태와 비밀값을 안전하게 확인하고, 필요한 작업에만 비밀값을 전달합니다.",
  "apple-notes": "Mac의 Apple Notes에서 메모를 만들고, 찾고, 수정하고, 이동하거나 내보냅니다.",
  "apple-reminders": "Apple Reminders의 할 일과 목록을 추가, 수정, 완료, 삭제할 수 있게 연결합니다.",
  "bear-notes": "Bear 앱의 노트를 검색하고 만들고 정리합니다.",
  "blogwatcher": "블로그나 RSS 피드를 지켜보다가 새 글이 올라오면 확인할 수 있게 합니다.",
  "blucli": "BluOS 오디오 기기를 찾고 재생, 그룹, 볼륨을 제어합니다.",
  "camsnap": "RTSP/ONVIF 카메라에서 이미지 프레임이나 짧은 영상을 캡처합니다.",
  "gpao-t-hub": "필요한 기능이 없을 때 GPAO-T Hub에서 기능을 찾고, 설치하고, 검증하고, 업데이트합니다.",
  "coding-agent": "Codex, Claude Code, OpenCode 같은 개발 에이전트에게 별도 개발 작업을 맡깁니다.",
  "diagram-maker": "개념, 구조, 흐름을 SVG, HTML, Excalidraw 다이어그램으로 만듭니다.",
  "eightctl": "Eight Sleep Pod의 상태, 온도, 알람, 일정을 확인하고 제어합니다.",
  "gemini": "Gemini CLI로 요약, 생성, 도구 호출, MCP, Gemma 라우팅 작업을 실행합니다.",
  "gh-issues": "GitHub 이슈를 가져오고, 작업 후보를 고르고, 수정 에이전트와 PR 흐름을 진행합니다.",
  "gifgrep": "GIF 제공처에서 이미지를 검색하고 다운로드하거나 정지 이미지로 뽑아냅니다.",
  "github": "GitHub 이슈, PR, CI 로그, 댓글, 리뷰, 릴리스, 저장소 작업을 처리합니다.",
  "gog": "Google Workspace의 Gmail, Calendar, Drive, Contacts, Sheets, Docs를 다룹니다.",
  "goplaces": "Google Places에서 장소 검색, 상세 정보, 리뷰, JSON 결과를 가져옵니다.",
  "healthcheck": "GPAO-T가 설치된 호스트의 SSH, 방화벽, 업데이트, 백업, 보안 상태를 점검합니다.",
  "himalaya": "IMAP/SMTP 메일을 목록 조회, 읽기, 검색, 작성, 답장, 전달, 이동, 삭제합니다.",
  "mcporter": "MCP 서버와 도구를 목록화하고, 설정하고, 인증하고, 호출 결과를 확인합니다.",
  "meme-maker": "밈 템플릿을 찾고, 어울리는 형식을 제안하고, 이미지를 생성합니다.",
  "model-usage": "Codex나 Claude의 로컬 사용 비용 로그를 모델별로 요약합니다.",
  "nano-pdf": "자연어 지시로 PDF를 수정합니다.",
  "node-connect": "Android, iOS, macOS 노드 페어링과 QR/setup code, 인증, 연결 문제를 진단합니다.",
  "node-inspect-debugger": "Node.js를 inspect, breakpoint, CDP, heap, CPU profile로 디버깅합니다.",
  "notion": "Notion 페이지, Markdown, 데이터베이스, 파일, 댓글, 검색, API 작업을 처리합니다.",
  "obsidian": "Obsidian vault의 노트, 작업, 링크, 속성, 플러그인을 읽고 검색하고 수정합니다.",
  "openai-whisper": "API 키 없이 로컬 Whisper CLI로 음성을 텍스트로 변환합니다.",
  "openai-whisper-api": "OpenAI Audio Transcriptions API로 음성을 텍스트로 변환하고 화자 분리 옵션도 사용할 수 있습니다.",
  "openhue": "Philips Hue 조명과 장면을 제어합니다.",
  "oracle": "다른 모델을 불러 코드 리뷰, 디버깅, 리팩터링, 설계 검토를 맡깁니다.",
  "ordercli": "Foodora 주문 내역과 진행 중인 주문 상태를 확인합니다.",
  "peekaboo": "macOS 화면을 캡처하고 UI 자동화를 실행합니다.",
  "python-debugpy": "pdb, breakpoint, post-mortem, debugpy attach로 Python을 디버깅합니다.",
  "sag": "ElevenLabs 음성 합성을 Mac의 say 명령처럼 간단히 사용합니다.",
  "session-logs": "이전 대화와 세션 로그를 찾아보고 필요한 맥락을 분석합니다.",
  "conversation-search": "이전 대화와 세션 로그를 찾아보고 필요한 맥락을 분석합니다.",
  "sherpa-onnx-tts": "클라우드 없이 로컬에서 텍스트를 음성으로 변환합니다.",
  "skill-creator": "GPAO-T 기능 정의와 SKILL.md 파일을 만들고, 수정하고, 검증하고, 정리합니다.",
  "songsee": "오디오에서 스펙트로그램과 특징 시각화 패널을 만듭니다.",
  "sonoscli": "Sonos 스피커를 찾고 상태, 재생, 볼륨, 그룹을 제어합니다.",
  "spike": "작은 실험용 프로토타입으로 가능성을 빠르게 검증하고 결론을 냅니다.",
  "spotify-player": "터미널에서 Spotify 검색과 재생을 제어합니다.",
  "summarize": "URL, YouTube, 영상, 팟캐스트, 글, PDF, 로컬 파일을 요약하거나 전사합니다.",
  "taskflow": "긴 작업을 상태와 대기 조건이 있는 하나의 durable TaskFlow 작업으로 관리합니다.",
  "taskflow-inbox-triage": "받은 메시지나 요청을 분류하고, 답변 대기와 후속 요약까지 이어가는 예시 TaskFlow입니다.",
  "things-mac": "Things 3의 할 일, inbox, today, 프로젝트, 영역, 태그를 추가하고 검색합니다.",
  "tmux": "tmux 세션과 패널을 제어해 터미널 작업을 확인하고 입력을 보냅니다.",
  "trello": "Trello 보드, 리스트, 카드를 조회하고 관리합니다.",
  "video-frames": "ffmpeg로 영상에서 프레임이나 짧은 클립을 추출합니다.",
  "weather": "현재 날씨와 예보를 확인하고, 여행이나 외출 판단에 필요한 정보를 가져옵니다.",
  "xurl": "X 게시글, 답글, 검색, DM, 미디어 업로드, 팔로워, 인증 상태를 다룹니다.",
};

const BASIC_SKILL_LABEL_ALIASES = {
  "clawhub": "gpao-t-hub",
  "개발-agent": "coding-agent",
  "대화 기록 검색": "session-logs",
  "기능-creator": "skill-creator",
};
const MODEL_CONNECTION_SKILLS_UI_BUILD = "2026071502-model-connection-skills-ko";

function patchModelConnectionRouteDefinition(source) {
  const modelRouteStart = "var eu=N({id:`model-connection`";
  const skillsRouteStart = "var $o=N({id:`skills`,path:`/skills`,loader:Qo,component:";
  const nextFunction = "async function es(";
  const existingStart = source.indexOf(modelRouteStart);
  const skillsStart = source.indexOf(skillsRouteStart);
  if (existingStart === -1 && skillsStart === -1) {
    throw new Error("Unable to patch index bundle: missing skills route");
  }
  if (existingStart === -1) {
    const nextStart = source.indexOf(nextFunction, skillsStart);
    if (nextStart === -1) {
      throw new Error("Unable to patch index bundle: missing skills route tail");
    }
    const afterNextFunction = nextStart + nextFunction.length;
    return {
      source: source.slice(0, skillsStart) + MODEL_CONNECTION_ROUTE_SOURCE + source.slice(afterNextFunction),
      changed: true,
      mode: "inserted",
    };
  }
  const nextStart = source.indexOf(nextFunction, existingStart);
  if (nextStart === -1) {
    throw new Error("Unable to patch index bundle: missing model connection route tail");
  }
  const afterNextFunction = nextStart + nextFunction.length;
  return {
    source: source.slice(0, existingStart) + MODEL_CONNECTION_ROUTE_SOURCE + source.slice(afterNextFunction),
    changed: true,
    mode: "replaced",
  };
}

export function patchIndexBundle(source) {
  let patched = source;
  const replacements = [
    {
      label: "settings-sidebar-group",
      from: "routes:[`channels`,`communications`]",
      to: "routes:[`model-connection`,`channels`,`communications`]",
    },
    {
      label: "route-icons",
      from: "channels:`link`,instances:",
      to: "channels:`link`,`model-connection`:`link`,instances:",
    },
    {
      label: "route-meta",
      from: "channels:{titleKey:`tabs.channels`,subtitleKey:`subtitles.channels`},instances:",
      to: "channels:{titleKey:`tabs.channels`,subtitleKey:`subtitles.channels`},`model-connection`:{titleKey:`tabs.modelConnection`,subtitleKey:`subtitles.modelConnection`},instances:",
    },
    {
      label: "route-table",
      from: "channels:{path:`/settings/channels`,aliases:[`/channels`]},config:",
      to: "channels:{path:`/settings/channels`,aliases:[`/channels`]},`model-connection`:{path:`/settings/model-connection`,aliases:[`/model-connection`]},config:",
    },
    {
      label: "routes-array",
      from: "ho,ts,$o];function rs()",
      to: "ho,eu,ts,$o];function rs()",
    },
  ];

  const applied = [];
  for (const replacement of replacements) {
    if (!patched.includes(replacement.from)) {
      if (patched.includes(replacement.to)) {
        applied.push({ ...replacement, changed: false, alreadyApplied: true });
        continue;
      }
      if (
        ["route-icons", "route-meta", "route-table"].includes(replacement.label)
        && patched.includes('"model-connection"')
      ) {
        applied.push({ ...replacement, changed: false, alreadyApplied: true });
        continue;
      }
      throw new Error(`Unable to patch index bundle: missing ${replacement.label}`);
    }
    patched = patched.replace(replacement.from, replacement.to);
    applied.push({ ...replacement, changed: true });
  }
  const route = patchModelConnectionRouteDefinition(patched);
  patched = route.source;
  applied.push({
    label: "model-connection-route-definition",
    changed: route.changed,
    mode: route.mode,
  });
  const beforeSyntaxFix = patched;
  patched = patched
    .replaceAll(",`model-connection`:", ',"model-connection":')
    .replaceAll("{`model-connection`:", '{"model-connection":');
  if (beforeSyntaxFix !== patched) {
    applied.push({
      label: "valid-js-property-name",
      changed: true,
      from: "template literal object property",
      to: "quoted string object property",
    });
  }
  const beforePublicAssetFix = patched;
  patched = patchControlUiPublicAssetRootPaths(patched);
  if (beforePublicAssetFix !== patched) {
    applied.push({
      label: "control-ui-public-asset-root-paths",
      changed: true,
    });
  }
  return { source: patched, applied };
}

export function patchControlUiPublicAssetRootPaths(source) {
  let patched = source;
  const serviceWorkerFrom = "new URL(et(`sw.js`),window.location.origin)";
  const serviceWorkerTo = "new URL(`/sw.js`,window.location.origin)";
  if (patched.includes(serviceWorkerFrom)) {
    patched = patched.replace(serviceWorkerFrom, serviceWorkerTo);
  }
  const documentLinkFrom = "function G_(e,t){let n=document.querySelector(e);n&&(n.href=et(t))}";
  const documentLinkTo = "function G_(e,t){let n=document.querySelector(e);n&&(n.href=`/${t}`)}";
  if (patched.includes(documentLinkFrom)) {
    patched = patched.replace(documentLinkFrom, documentLinkTo);
  }
  const readableDocumentLinkFrom =
    "function setDocumentLinkHref(\n  selector: string,\n  asset: Parameters<typeof inferControlUiPublicAssetPath>[0],\n) {\n  const link = document.querySelector<HTMLLinkElement>(selector);\n  if (!link) {\n    return;\n  }\n  link.href = inferControlUiPublicAssetPath(asset);\n}";
  const readableDocumentLinkTo =
    "function setDocumentLinkHref(\n  selector: string,\n  asset: Parameters<typeof inferControlUiPublicAssetPath>[0],\n) {\n  const link = document.querySelector<HTMLLinkElement>(selector);\n  if (!link) {\n    return;\n  }\n  link.href = `/${asset}`;\n}";
  if (patched.includes(readableDocumentLinkFrom)) {
    patched = patched.replace(readableDocumentLinkFrom, readableDocumentLinkTo);
  }
  return patched;
}

export function patchControlUiIndexHtmlPublicAssetRootPaths(source) {
  return patchControlUiIndexHtmlSkillSurfaceIsolation(source)
    .replaceAll('href="./manifest.webmanifest"', 'href="/manifest.webmanifest"')
    .replaceAll('href="manifest.webmanifest"', 'href="/manifest.webmanifest"')
    .replaceAll('href="./favicon-32.png"', 'href="/favicon-32.png"')
    .replaceAll('href="favicon-32.png"', 'href="/favicon-32.png"')
    .replaceAll('href="./favicon.ico"', 'href="/favicon.ico"')
    .replaceAll('href="favicon.ico"', 'href="/favicon.ico"')
    .replaceAll('href="./favicon.svg"', 'href="/favicon.svg"')
    .replaceAll('href="favicon.svg"', 'href="/favicon.svg"')
    .replaceAll('href="./apple-touch-icon.png"', 'href="/apple-touch-icon.png"')
    .replaceAll('href="apple-touch-icon.png"', 'href="/apple-touch-icon.png"')
    .replaceAll('href="./gpao-logo.jpeg"', 'href="/gpao-logo.jpeg"')
    .replaceAll('href="gpao-logo.jpeg"', 'href="/gpao-logo.jpeg"');
}

export function patchControlUiIndexHtmlSkillSurfaceIsolation(source) {
  let patched = source;
  patched = patched.replace(
    /const build = "[^"]+";/,
    `const build = "${MODEL_CONNECTION_SKILLS_UI_BUILD}";`,
  );
  const cleanupElementNeedle = 'for (const attr of ["aria-label", "title", "alt", "placeholder"]) {';
  const cleanupElementGuard = 'if (element.closest?.(".skills-grid")) return;';
  if (!patched.includes(cleanupElementGuard) && patched.includes(cleanupElementNeedle)) {
    patched = patched.replace(cleanupElementNeedle, `${cleanupElementGuard}\n          ${cleanupElementNeedle}`);
  }
  const cleanupTextNeedle = 'if (parent.closest?.(".chat-text")) return NodeFilter.FILTER_REJECT;';
  const cleanupTextGuard = 'if (parent.closest?.(".skills-grid")) return NodeFilter.FILTER_REJECT;';
  if (!patched.includes(cleanupTextGuard) && patched.includes(cleanupTextNeedle)) {
    patched = patched.replace(cleanupTextNeedle, `${cleanupTextNeedle}\n              ${cleanupTextGuard}`);
  }
  return patched;
}

function jsObjectLiteral(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function patchSkillsPageBasicSkillKoreanDescriptions(source) {
  const helperMarker = "gpao_t_basic_skill_korean_descriptions_v0_1";
  let patched = source;
  if (!patched.includes(helperMarker)) {
    const insertBefore = "function X(e,t){";
    if (!patched.includes(insertBefore)) {
      throw new Error("Unable to patch skills page: missing renderSkill function");
    }
    const helper = [
      `var gpaoTBasicSkillDescriptions=${jsObjectLiteral(BASIC_SKILL_KOREAN_DESCRIPTIONS)};`,
      `var gpaoTBasicSkillLabelAliases=${jsObjectLiteral(BASIC_SKILL_LABEL_ALIASES)};`,
      `function gpaoTDisplaySkillName(e){let t=typeof e?.name==\`string\`?e.name.trim():\`\`;return gpaoTBasicSkillLabelAliases[t]??t}`,
      `function gpaoTDisplaySkillDescription(e){let t=gpaoTDisplaySkillName(e),n=gpaoTBasicSkillDescriptions[t];return n??e.description??\`\`}`,
      `var gpao_t_basic_skill_korean_descriptions_v0_1=!0;`,
    ].join("");
    patched = patched.replace(insertBefore, `${helper}${insertBefore}`);
  } else {
    patched = patched
      .replace(
        /var gpaoTBasicSkillDescriptions=\{[\s\S]*?\};var gpaoTBasicSkillLabelAliases=/,
        `var gpaoTBasicSkillDescriptions=${jsObjectLiteral(BASIC_SKILL_KOREAN_DESCRIPTIONS)};var gpaoTBasicSkillLabelAliases=`,
      )
      .replace(
        /var gpaoTBasicSkillLabelAliases=\{[\s\S]*?\};function gpaoTDisplaySkillName/,
        `var gpaoTBasicSkillLabelAliases=${jsObjectLiteral(BASIC_SKILL_LABEL_ALIASES)};function gpaoTDisplaySkillName`,
      );
  }
  patched = patched
    .replaceAll("<span>${e.name}</span>", "<span>${gpaoTDisplaySkillName(e)}</span>")
    .replaceAll("${m(e.description,140)}", "${m(gpaoTDisplaySkillDescription(e),140)}")
    .replaceAll("${e.description}\n            </div>\n            ${M({skill:e,showBundledBadge:o})}", "${gpaoTDisplaySkillDescription(e)}\n            </div>\n            ${M({skill:e,showBundledBadge:o})}");
  return patched;
}

export function patchKoreanLocale(source) {
  let patched = source;
  const replacements = [
    {
      label: "tabs-model-connection",
      from: "channels:`채널`,instances:",
      to: "channels:`채널`,modelConnection:`모델 연결`,instances:",
    },
    {
      label: "subtitles-model-connection",
      from: "channels:`채널 및 설정.`,instances:",
      to: "channels:`채널 및 설정.`,modelConnection:`모델 provider와 API 키 연결을 관리합니다.`,instances:",
    },
    {
      label: "skills-korean-label",
      from: "skills:`Skills`",
      to: "skills:`기능`",
    },
    {
      label: "skills-subtitle-korean-label",
      from: "skills:`Skills 및 API 키.`",
      to: "skills:`기능 및 API 키.`",
    },
  ];
  const applied = [];
  for (const replacement of replacements) {
    if (!patched.includes(replacement.from)) {
      if (patched.includes(replacement.to)) {
        applied.push({ ...replacement, changed: false, alreadyApplied: true });
        continue;
      }
      throw new Error(`Unable to patch Korean locale: missing ${replacement.label}`);
    }
    patched = patched.replace(replacement.from, replacement.to);
    applied.push({ ...replacement, changed: true });
  }
  return { source: patched, applied };
}

export async function applyModelConnectionSettingsRoutePatch({
  controlUiRoot = DEFAULT_CONTROL_UI,
  write = true,
} = {}) {
  const root = resolve(controlUiRoot);
  const indexPath = join(root, "assets", "index-Cib9gLwy.js");
  const indexHtmlPath = join(root, "index.html");
  const localePath = join(root, "assets", "ko-CccRRQqj.js");
  const assetsRoot = join(root, "assets");
  const skillsPageName = (await readdir(assetsRoot)).find((name) => /^skills-page-.*\.js$/u.test(name));
  if (!skillsPageName) {
    throw new Error("Unable to patch skills page: missing skills-page bundle");
  }
  const skillsPagePath = join(assetsRoot, skillsPageName);
  const indexBefore = await readFile(indexPath, "utf8");
  const indexHtmlBefore = await readFile(indexHtmlPath, "utf8");
  const localeBefore = await readFile(localePath, "utf8");
  const skillsPageBefore = await readFile(skillsPagePath, "utf8");
  const index = patchIndexBundle(indexBefore);
  const indexHtml = patchControlUiIndexHtmlPublicAssetRootPaths(indexHtmlBefore);
  const locale = patchKoreanLocale(localeBefore);
  const skillsPage = patchSkillsPageBasicSkillKoreanDescriptions(skillsPageBefore);
  if (write) {
    await writeFile(indexPath, index.source);
    await writeFile(indexHtmlPath, indexHtml);
    await writeFile(localePath, locale.source);
    await writeFile(skillsPagePath, skillsPage);
  }
  return {
    schema: "gpao_t.live_model_connection_settings_route_patch.v1",
    status: "patched",
    controlUiRoot: root,
    files: [
      { path: indexPath, replacements: index.applied },
      {
        path: indexHtmlPath,
        replacements: [
          {
            label: "control-ui-index-public-asset-root-paths",
            changed: indexHtmlBefore !== indexHtml,
          },
        ],
      },
      { path: localePath, replacements: locale.applied },
      {
        path: skillsPagePath,
        replacements: [
          {
            label: "basic-skill-korean-descriptions",
            changed: skillsPageBefore !== skillsPage,
          },
        ],
      },
    ],
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const controlUiRoot = arg("--control-ui", DEFAULT_CONTROL_UI);
  const write = !process.argv.includes("--dry-run");
  console.log(JSON.stringify(await applyModelConnectionSettingsRoutePatch({ controlUiRoot, write }), null, 2));
}
