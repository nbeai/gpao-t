#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_ROOT =
  process.env.OPENCLAW_LIVE_DIST ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const CONTROL_UI_ROOT = join(LIVE_ROOT, "control-ui");
const ASSETS_DIR = join(CONTROL_UI_ROOT, "assets");
const BACKUP_ROOT =
  process.env.GPAO_T_SURFACE_SEAL_BACKUP_ROOT ||
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-surface-seal-patch";
const APPLY_TOKEN = "apply-gpao-t-surface-seal-live";

const TEXT_REPLACEMENTS = [
  ["https://docs.openclaw.ai/web/control-ui#blank-control-ui-page", "#gpao-t-recovery"],
  ["https://docs.openclaw.ai/web/control-ui#device-pairing-first-connection", "#gpao-t-device-approval"],
  ["https://docs.openclaw.ai/web/control-ui#insecure-http", "#gpao-t-secure-local-access"],
  ["https://docs.openclaw.ai/web/control-ui#debuggingtesting-dev-server--remote-gateway", "#gpao-t-local-runtime"],
  ["https://docs.openclaw.ai/web/dashboard", "#gpao-t-dashboard-help"],
  ["https://docs.openclaw.ai/channels/pairing#pair-from-the-control-ui-recommended", "#gpao-t-device-approval"],
  ["https://docs.openclaw.ai/channels", "#gpao-t-communications"],
  ["https://docs.openclaw.ai", "#gpao-t-help"],
  ["Control UI did not start", "GPAO-T 화면을 시작하지 못했습니다"],
  ["Control UI troubleshooting", "GPAO-T 복구 안내"],
  ["Control UI and connected Gateway build identity.", "GPAO-T dashboard and local runtime build identity."],
  ["Control UI 및 연결된 Gateway 빌드 ID입니다.", "GPAO-T 대시보드와 로컬 런타임 빌드 ID입니다."],
  ["Control UI build details", "GPAO-T dashboard build details"],
  ["Control UI 빌드 세부 정보", "GPAO-T 대시보드 빌드 세부 정보"],
  ["connected Gateway version", "connected local runtime version"],
  ["연결된 Gateway 버전", "연결된 로컬 런타임 버전"],
  ["latest Control UI bundle", "latest GPAO-T dashboard bundle"],
  ["the current Control UI bundle", "the current GPAO-T dashboard bundle"],
  ["A fresh page still could not start the Control UI.", "A fresh page still could not start GPAO-T."],
  ["Try again, then check the troubleshooting guide if the problem persists.", "Try again, then check GPAO-T recovery if the problem persists."],
  ["OpenClaw mobile pairing QR code", "GPAO-T mobile pairing QR code"],
  ["OpenClaw mobile", "GPAO-T mobile"],
  ["Official OpenClaw mobile apps", "GPAO-T mobile apps"],
  ["OpenClaw 모바일", "GPAO-T 모바일"],
  ["공식 OpenClaw 모바일 앱", "GPAO-T 모바일 앱"],
  ["owned by OpenClaw", "managed by GPAO-T"],
  ["OpenClaw가 소유한", "GPAO-T가 관리하는"],
  ["extend OpenClaw", "extend GPAO-T"],
  ["OpenClaw를 확장", "GPAO-T를 확장"],
  ["Optional OpenClaw capability.", "Optional GPAO-T capability."],
  ["선택적 OpenClaw 기능입니다.", "선택적 GPAO-T 기능입니다."],
  ["Search plugins and ClawHub", "Search plugins and GPAO-T Extension Hub"],
  ["Browse ClawHub", "Browse GPAO-T Extension Hub"],
  ["Searching ClawHub", "Searching GPAO-T Extension Hub"],
  ["From ClawHub", "From GPAO-T Extension Hub"],
  ["ClawHub has no results", "GPAO-T Extension Hub has no results"],
  ["Community plugins on ClawHub", "Community plugins on GPAO-T Extension Hub"],
  ["Find on ClawHub", "Find on GPAO-T Extension Hub"],
  ["Review the ClawHub warning", "Review the GPAO-T Extension Hub warning"],
  ["ClawHub 둘러보기", "GPAO-T 확장 허브 둘러보기"],
  ["ClawHub 검색 중", "GPAO-T 확장 허브 검색 중"],
  ["ClawHub에서", "GPAO-T 확장 허브에서"],
  ["ClawHub에", "GPAO-T 확장 허브에"],
  ["ClawHub의 커뮤니티 플러그인", "GPAO-T 확장 허브의 커뮤니티 플러그인"],
  ["ClawHub에서 찾기", "GPAO-T 확장 허브에서 찾기"],
  ["ClawHub 경고", "GPAO-T 확장 허브 경고"],
  ["ClawHub", "GPAO-T Extension Hub"],
  ["clawhub", "gpao-t-extension-hub"],
  ["OpenClaw Control UI", "GPAO-T Dashboard"],
  ["OpenClaw Control", "GPAO-T Dashboard"],
  ["OpenClaw Gateway", "GPAO-T local runtime"],
  ["Gateway 대시보드", "GPAO-T 연결 화면"],
  ["Gateway 토큰", "연결키"],
  ["런타임 토큰", "연결키"],
  ["Gateway 연결", "로컬 런타임 연결"],
  ["Gateway가 실행 중인지", "GPAO-T 로컬 런타임이 실행 중인지"],
  ["Gateway가 HTTPS/Tailscale Serve 뒤에 있으면", "GPAO-T 로컬 런타임이 HTTPS/Tailscale Serve 뒤에 있으면"],
  ["Control UI 인증 문서", "GPAO-T 연결 도움말"],
  ["WebSocket URL", "연결 주소"],
  ["OPENCLAW_GATEWAY_TOKEN (선택 사항)", "연결키 (필요할 때만)"],
  ["OPENCLAW_GATEWAY_TOKEN", "GPAO-T 연결키"],
  ["비밀번호(저장되지 않음)", "로컬 연결 비밀번호 (저장되지 않음)"],
  ["연결할 수 없음", "GPAO-T 로컬 런타임에 연결하지 못했습니다"],
  ["브라우저가 로컬 런타임 연결을 완료할 수 없습니다.", "브라우저가 GPAO-T 로컬 런타임과 연결하지 못했습니다."],
  ["자격 증명을 다시 시도하기 전에", "다시 연결하기 전에"],
  ["대상과 전송 방식을 확인하세요.", "로컬 런타임 상태와 연결키를 확인하세요."],
  ["gpao-t status 또는 gpao-t gateway run으로 GPAO-T 런타임이 실행 중인지 확인하세요.", "GPAO-T 런타임이 켜져 있는지 확인하세요."],
  ["gpao-t runtime run으로 GPAO-T 런타임이 실행 중인지 확인하세요.", "GPAO-T 런타임이 켜져 있는지 확인하세요."],
  ["gpao-t status 또는 gpao-t runtime run으로 GPAO-T 로컬 런타임이 실행 중인지 확인하세요.", "GPAO-T 런타임이 켜져 있는지 확인하세요."],
  ["gpao-t runtime run으로 GPAO-T 로컬 런타임이 실행 중인지 확인하세요.", "GPAO-T 런타임이 켜져 있는지 확인하세요."],
  ["연결 주소를 확인하고 GPAO-T 런타임이 HTTPS/Tailscale Serve 뒤에 있으면 ws://를 사용하세요.", "연결 주소는 보통 ws://127.0.0.1:18799 입니다."],
  ["연결 주소를 확인하고 GPAO-T 로컬 런타임이 HTTPS/Tailscale Serve 뒤에 있으면 wss://를 사용하세요.", "연결 주소는 보통 ws://127.0.0.1:18799 입니다."],
  ["연결 주소를 확인하고 GPAO-T 로컬 런타임이 HTTPS/Tailscale Serve 뒤에 있으면 ws://를 사용하세요.", "연결 주소는 보통 ws://127.0.0.1:18799 입니다."],
  ["gpao-t dashboard --no-open으로 dashboard를 다시 열어 현재 URL과 인증 세부 정보를 다시 복사하세요.", "문제가 계속되면 GPAO-T 연결 도움말에서 현재 연결 정보를 확인하세요."],
  ["gpao-t dashboard --no-open", "GPAO-T 연결 도움말"],
  ["GPAO-T 화면 인증 문서", "GPAO-T 연결 도움말"],
  ["원시 오류", "상세 오류"],
  ["연결 방법", "연결 도움말"],
  ["연결 주소을", "연결 주소를"],
  ["openclaw dashboard", "gpao-t dashboard"],
  ["openclaw doctor", "gpao-t doctor"],
  ["openclaw models auth", "gpao-t models auth"],
  ["openclaw status", "gpao-t status"],
  ["openclaw gateway run", "gpao-t runtime run"],
  ["openclaw security audit --deep", "gpao-t security audit --deep"],
  ["openclaw.json", "GPAO-T runtime config"],
  ["profile: lobster", "profile: gpao-t"],
  ["Lobster visits", "GPAO-T companion visits"],
  ["Lobster sounds", "GPAO-T companion sounds"],
  ["Lobsterdex", "GPAO-T companion log"],
  ["바닷가재 방문", "GPAO-T 동반자 표시"],
  ["바닷가재 소리", "GPAO-T 동반자 소리"],
  ["산호초", "GPAO-T 작업공간"],
  ["GPAO-T runtime config 편집.", "GPAO-T 실행 설정을 조정합니다."],
  ["Model & Thinking", "모델과 사고"],
  ["Fast mode", "응답 모드"],
  ["Tool profile", "도구 범위"],
  ["Exec policy", "실행 승인"],
  ["Device auth", "기기 승인"],
  ["Browser enabled", "브라우저 도구"],
  ["Text size", "글자 크기"],
  ["AVATAR TEXT / EMOJI", "표시 이름 / 아이콘"],
  ["Choose image", "이미지 선택"],
  ["Clear avatar", "이미지 지우기"],
  ["Stored in this browser only.", "이 브라우저에만 저장됩니다."],
  ["Fallback logo", "기본 로고"],
  ["Keep Last Assistants", "최근 GPAO-T 대화 유지"],
  ["Last Assistants", "최근 GPAO-T 대화"],
  ["Clawdette", "GPAO-T"],
  ["scheduled tasks", "예약 작업"],
  ["기능s installed", "기능 설치됨"],
  ["MCP servers", "MCP 서버"],
];

const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="nBeAI. GPAO-T">
  <rect width="256" height="256" rx="48" fill="#ffffff"/>
  <path d="M72 151c-20 0-36-15-36-34s16-34 36-34c15 0 27 7 42 24l14 16 14-16c15-17 27-24 42-24 20 0 36 15 36 34s-16 34-36 34c-15 0-27-7-42-24l-14-16-14 16c-15 17-27 24-42 24Zm0-25c7 0 14-4 25-16-11-12-18-16-25-16-7 0-12 5-12 11s5 21 12 21Zm112 0c7 0 12-15 12-21s-5-11-12-11c-7 0-14 4-25 16 11 12 18 16 25 16Z" fill="#0d0f0e"/>
</svg>
`;

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

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function applyTextReplacements(source) {
  let next = source;
  const replacements = [];
  for (const [from, to] of TEXT_REPLACEMENTS) {
    if (!next.includes(from)) continue;
    const count = next.split(from).length - 1;
    next = next.split(from).join(to);
    replacements.push({ from, to, count });
  }
  return { source: next, replacements };
}

export function patchSurfaceFile({ path, source }) {
  if (basename(path) === "favicon.svg") {
    return source.includes("nBeAI. GPAO-T") && !source.includes("openclaw.ai hero mascot")
      ? { source, replacements: [] }
      : { source: SVG_LOGO, replacements: [{ from: "legacy favicon.svg", to: "GPAO-T svg logo", count: 1 }] };
  }
  if (path.endsWith(".js")) {
    return { source, replacements: [] };
  }
  return applyTextReplacements(source);
}

async function listCandidateFiles() {
  const assetNames = await readdir(ASSETS_DIR);
  return [
    join(CONTROL_UI_ROOT, "index.html"),
    join(CONTROL_UI_ROOT, "sw.js"),
    join(CONTROL_UI_ROOT, "favicon.svg"),
    ...assetNames.filter((name) => name.endsWith(".js")).map((name) => join(ASSETS_DIR, name)),
  ];
}

async function backupFile({ file, backupDir }) {
  const destination = join(backupDir, relative(CONTROL_UI_ROOT, file));
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
  return destination;
}

async function main() {
  const apply = hasArg("--apply");
  const approvalToken = readArg("--approval-token");
  const stamp = isoStamp();
  const files = await listCandidateFiles();
  const backupDir = join(BACKUP_ROOT, `${stamp}-before-surface-seal`);
  const changes = [];

  for (const file of files) {
    const source = await readFile(file, "utf8").catch(() => null);
    if (source === null) continue;
    const patched = patchSurfaceFile({ path: file, source });
    if (patched.source === source) continue;
    changes.push({
      file,
      relativePath: relative(CONTROL_UI_ROOT, file),
      beforeSha256: sha256(source),
      afterSha256: sha256(patched.source),
      replacements: patched.replacements,
      source,
      patched: patched.source,
    });
  }

  const manifest = {
    schema: "gpao_t.live_surface_seal_patch_manifest.v0_1",
    generatedAt: new Date().toISOString(),
    liveRoot: LIVE_ROOT,
    controlUiRoot: CONTROL_UI_ROOT,
    mode: apply ? "apply" : "dry-run",
    changedFileCount: changes.length,
    changedFiles: changes.map(({ source, patched, ...change }) => change),
    backupDir: apply ? backupDir : null,
    applyTokenRequired: APPLY_TOKEN,
  };

  if (!apply) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (approvalToken !== APPLY_TOKEN) {
    console.error(JSON.stringify({
      schema: "gpao_t.live_surface_seal_patch_refusal.v0_1",
      status: "refused",
      reason: "missing_or_invalid_approval_token",
      required: `--apply --approval-token ${APPLY_TOKEN}`,
      changedFileCount: changes.length,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  await mkdir(backupDir, { recursive: true });
  for (const change of changes) {
    await backupFile({ file: change.file, backupDir });
    await writeFile(change.file, change.patched);
  }
  const manifestPath = join(backupDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ...manifest, manifestPath }, null, 2));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
