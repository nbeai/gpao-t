#!/bin/zsh
set -euo pipefail

out=""
delay_seconds="1.8"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      out="$2"
      shift 2
      ;;
    --delay-seconds)
      delay_seconds="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

routes=(
  "/chat"
  "/sessions"
  "/settings"
  "/settings/profile"
  "/settings/general"
  "/settings/ai-agents"
  "/agents"
  "/skills"
  "/nodes"
  "/dreaming"
  "/documents"
)

run_js() {
  local js="$1"
  local escaped="${js//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  local script_file
  script_file="$(mktemp)"
  {
    printf 'using terms from application "Safari"\n'
    printf 'tell application "Safari"\n'
    printf 'do JavaScript "%s" in front document\n' "$escaped"
    printf 'end tell\n'
    printf 'end using terms from\n'
  } > "$script_file"
  osascript "$script_file"
  rm -f "$script_file"
}

start_json="$(run_js 'JSON.stringify({href: location.href, origin: location.origin})')"
origin="$(run_js 'location.origin')"

tmp="$(mktemp)"
status="ready"
first="1"

{
  printf '{\n'
  printf '  "schema": "gpao_t.safari_user_surface_audit.v1",\n'
  printf '  "createdAt": "%s",\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '  "start": %s,\n' "$start_json"
  printf '  "routes": [\n'
} > "$tmp"

for route in "${routes[@]}"; do
  target="${origin}${route}"
  run_js "location.href = \"${target}\"; \"ok\";" >/dev/null
  sleep "$delay_seconds"
  result="$(run_js '
    (() => {
      const forbidden = [
        "OpenClaw",
        "Gateway",
        "ClawHub",
        "Control UI",
        "openclaw",
        "Gateway 상태",
        "Open session menu",
        "session menu",
        "열기 session menu",
        "Message GPAO-T",
        "Assistant",
        "assistant",
        "Assistants",
        "Keep Last Assistants",
        "Clawdette",
        "Skills",
        "Skill Workshop",
        "openclaw-absorption",
        "admission",
        "replay",
        "Replay",
        "rollback",
        "OpenClaw session row",
        "GatewayRequestError",
        "GatewayClientRequestError",
        "Node service not 설치됨 as LaunchAgent",
        "service/Node service not 설치됨 as LaunchAgent"
      ];
      const roots = [];
      const collect = (root) => {
        if (!root) return;
        roots.push(root);
        for (const node of root.querySelectorAll ? root.querySelectorAll("*") : []) {
          if (node.shadowRoot) collect(node.shadowRoot);
        }
      };
      collect(document);
      const visibleHits = [];
      const hiddenHits = [];
      const sample = [];
      for (const root of roots) {
        for (const node of root.querySelectorAll ? root.querySelectorAll("*") : []) {
          const tag = node.tagName || "";
          if (["SCRIPT", "STYLE", "HEAD", "META", "LINK"].includes(tag)) continue;
          const computed = getComputedStyle(node);
          const text = (node.innerText || node.textContent || "").trim();
          const aria = node.getAttribute?.("aria-label") || "";
          const title = node.getAttribute?.("title") || "";
          const combined = [text, aria, title].join(" ");
          if (text && sample.length < 8) sample.push(text.slice(0, 180));
          if (!combined || !forbidden.some((item) => combined.includes(item))) continue;
          const hit = {
            tag,
            className: String(node.className || "").slice(0, 120),
            aria,
            title,
            text: text.slice(0, 240),
            hidden: node.hidden,
            display: computed.display,
            visibility: computed.visibility,
            height: computed.height
          };
          if (node.hidden || computed.display === "none" || computed.visibility === "hidden") hiddenHits.push(hit);
          else visibleHits.push(hit);
        }
      }
      return JSON.stringify({
        route: location.pathname,
        title: document.title,
        url: location.href,
        visibleHitCount: visibleHits.length,
        visibleHits: visibleHits.slice(0, 24),
        hiddenHitCount: hiddenHits.length,
        hiddenHits: hiddenHits.slice(0, 8),
        sample
      });
    })()
  ')"
  if [[ "$result" != *'"visibleHitCount":0'* ]]; then
    status="review"
  fi
  if [[ "$first" == "0" ]]; then
    printf ',\n' >> "$tmp"
  fi
  first="0"
  printf '    %s' "$result" >> "$tmp"
done

run_js "$(printf 'location.href = %s; "restored";' "$(printf '%s' "$start_json" | sed -E 's/^.*"href":"([^"]+)".*$/\"\1\"/')")" >/dev/null

{
  printf '\n  ],\n'
  printf '  "status": "%s"\n' "$status"
  printf '}\n'
} >> "$tmp"

if [[ -n "$out" ]]; then
  mkdir -p "$(dirname "$out")"
  cp "$tmp" "$out"
fi

cat "$tmp"
rm -f "$tmp"
