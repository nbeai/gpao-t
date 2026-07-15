#!/bin/zsh
set -euo pipefail

# This file is the ordinary-user entrypoint for a packaged GPAO-T release.
SCRIPT_DIR="${0:A:h}"
PRODUCT_DIR="${SCRIPT_DIR}/gpao-t-@@PACKAGE_VERSION@@"
INSTALLER_DIR="${SCRIPT_DIR}/installer"
INSTALLER_MAIN="${INSTALLER_DIR}/gpao-t-macos-local.mjs"
NODE_BIN="${SCRIPT_DIR}/runtime/node"
PACKAGE_ARCH="@@PACKAGE_ARCH@@"
PORT="${GPAO_T_PORT:-18799}"
URL="http://127.0.0.1:${PORT}/chat?session=main"
DEFAULT_UPDATE_FEED_URL="https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json"
UPDATE_FEED_URL="${GPAO_T_UPDATE_FEED_URL:-${DEFAULT_UPDATE_FEED_URL}}"
STATE_HOME="${GPAO_T_STATE_HOME:-${HOME}/.gpao-t}"
COMPAT_HOME="${GPAO_T_COMPAT_HOME:-${HOME}/.openclaw}"
LAUNCH_AGENTS_DIR="${GPAO_T_LAUNCH_AGENTS_DIR:-${HOME}/Library/LaunchAgents}"

fail() {
  print -u2 "GPAO-T 설치를 완료하지 못했습니다."
  print -u2 "$1"
  print -u2 "설치 파일과 현재 상태는 변경하지 않고 보존했습니다."
  if [[ "${GPAO_T_NONINTERACTIVE:-0}" != "1" ]]; then
    read -r "REPLY?Return을 누르면 닫힙니다. " || true
  fi
  exit 1
}

approve_first_browser_pairing() {
  local list_output request_id approve_output
  for attempt in {1..12}; do
    list_output="$(GPAO_T_STATE_DIR="${STATE_HOME}" GPAO_T_CONFIG_PATH="${STATE_HOME}/gpao-t.json" "${NODE_BIN}" "${STATE_HOME}/current/gpao-t.mjs" devices list --json 2>/dev/null)" || list_output=""
    request_id="$("${NODE_BIN}" -e 'const value = JSON.parse(process.argv[1] || "{}"); const pending = Array.isArray(value.pending) ? value.pending : []; pending.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0)); process.stdout.write(String(pending[0]?.requestId || ""));' "${list_output}" 2>/dev/null)" || request_id=""
    if [[ -n "${request_id}" ]]; then
      approve_output="$(GPAO_T_STATE_DIR="${STATE_HOME}" GPAO_T_CONFIG_PATH="${STATE_HOME}/gpao-t.json" "${NODE_BIN}" "${STATE_HOME}/current/gpao-t.mjs" devices approve "${request_id}" --json 2>&1)" || {
        print -u2 "브라우저 연결 자동 승인에 실패했습니다."
        print -u2 "${approve_output}"
        return 1
      }
      print "브라우저 연결을 승인했습니다."
      return 0
    fi
    sleep 1
  done
  return 0
}

[[ "$(uname -s)" == "Darwin" ]] || fail "이 설치 파일은 macOS용입니다."
HOST_ARCH="$(uname -m)"
case "${HOST_ARCH}:${PACKAGE_ARCH}" in
  arm64:arm64|x86_64:x64|arm64:universal|x86_64:universal) ;;
  *) fail "이 설치 파일은 ${PACKAGE_ARCH}용이고, 이 Mac은 ${HOST_ARCH}입니다. 이 Mac에 맞는 GPAO-T 설치 파일을 받아 주세요." ;;
esac
[[ -d "$PRODUCT_DIR" ]] || fail "배포 파일이 없습니다: ${PRODUCT_DIR}"
[[ -f "$INSTALLER_MAIN" ]] || fail "설치 구성요소가 없습니다: ${INSTALLER_MAIN}"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || fail "내장 Node 실행 파일을 찾지 못했습니다."

print "nBeAI. GPAO-T 설치를 시작합니다."
print "설치 위치: ${STATE_HOME}"
print "기존 호환 런타임은 변경하지 않습니다."

DRY_RUN="$(${NODE_BIN} "${INSTALLER_MAIN}" install \
  --release "${PRODUCT_DIR}" \
  --node-path "${NODE_BIN}" \
  --state-home "${STATE_HOME}" \
  --compat-home "${COMPAT_HOME}" \
  --launch-agents-dir "${LAUNCH_AGENTS_DIR}" \
  --migration-profile none \
  --port "${PORT}" \
  --update-feed-url "${UPDATE_FEED_URL}" \
  --json)" || fail "설치 전 점검에서 중단되었습니다.\n${DRY_RUN}"

if [[ "${GPAO_T_DRY_RUN:-0}" == "1" ]]; then
  print "설치 전 점검을 통과했습니다. 실제 파일과 서비스는 변경하지 않았습니다."
  exit 0
fi

APPLY_TOKEN="$(${NODE_BIN} -e 'const value = JSON.parse(process.argv[1]); const token = value?.plan?.applyTokenRequired; if (!token) process.exit(2); process.stdout.write(token);' "${DRY_RUN}")" \
  || fail "설치 전 점검 결과에서 실행 승인 정보를 읽지 못했습니다."

INSTALL_OUTPUT="$(${NODE_BIN} "${INSTALLER_MAIN}" install \
  --release "${PRODUCT_DIR}" \
  --node-path "${NODE_BIN}" \
  --state-home "${STATE_HOME}" \
  --compat-home "${COMPAT_HOME}" \
  --launch-agents-dir "${LAUNCH_AGENTS_DIR}" \
  --migration-profile none \
  --port "${PORT}" \
  --update-feed-url "${UPDATE_FEED_URL}" \
  --apply \
  --apply-token "${APPLY_TOKEN}" \
  --json)" || fail "설치 적용 단계에서 중단되었습니다.\n${INSTALL_OUTPUT}"

print "GPAO-T 설치와 백그라운드 실행을 확인했습니다."
SETUP_STATE="$(${NODE_BIN} -e 'const value = JSON.parse(process.argv[1]); process.stdout.write(value?.installationReadiness?.status || value?.receipt?.installationReadiness?.status || "");' "${INSTALL_OUTPUT}" 2>/dev/null)" || SETUP_STATE=""
if [[ "${SETUP_STATE}" == "needs_provider_setup" ]]; then
  print "모델 연결 설정은 첫 실행 화면에서 이어집니다."
fi
print "대시보드를 엽니다: ${URL}"
if [[ "${GPAO_T_SKIP_OPEN:-0}" != "1" ]]; then
  DASHBOARD_OUTPUT="$(GPAO_T_STATE_DIR="${STATE_HOME}" GPAO_T_CONFIG_PATH="${STATE_HOME}/gpao-t.json" "${NODE_BIN}" "${STATE_HOME}/current/gpao-t.mjs" dashboard 2>&1)" \
    || fail "대시보드 자동 연결에 실패했습니다.\n${DASHBOARD_OUTPUT}"
  print "${DASHBOARD_OUTPUT}"
  approve_first_browser_pairing || fail "브라우저 연결 승인 단계에서 중단되었습니다."
  DASHBOARD_REOPEN_OUTPUT="$(GPAO_T_STATE_DIR="${STATE_HOME}" GPAO_T_CONFIG_PATH="${STATE_HOME}/gpao-t.json" "${NODE_BIN}" "${STATE_HOME}/current/gpao-t.mjs" dashboard 2>&1)" \
    || fail "대시보드 재연결에 실패했습니다.\n${DASHBOARD_REOPEN_OUTPUT}"
  print "${DASHBOARD_REOPEN_OUTPUT}"
fi
print "설치가 끝났습니다."
