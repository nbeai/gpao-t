import { CAPABILITY_GROUPS } from "./capability-manifest.js";

const NAMES = Object.freeze({
  runtime: "런타임", files: "파일", web: "웹", browser_ui: "브라우저와 화면", messaging_channels: "메신저와 채널",
  sessions_agents: "세션과 에이전트", automation: "자동화", gateway_devices: "게이트웨이와 장치",
  memory_context: "기억과 맥락", media: "미디어", tool_search_plugins_mcp: "도구 검색과 확장"
});

const CAPABILITIES = Object.freeze({
  runtime: ["read_runtime_status", "execute_allowlisted_process"],
  files: ["stat", "list", "read", "search", "write", "edit", "rollback"],
  web: ["fetch", "search"], browser_ui: ["open", "navigate", "snapshot", "screenshot", "click", "fill", "close"],
  messaging_channels: ["read_channel_status", "external_send"], sessions_agents: ["read_session_status", "read_turn"],
  automation: ["list", "schedule", "cancel", "claim_due"], gateway_devices: ["read_socket_status"],
  memory_context: ["search_memory", "context_status", "rollback_context"], media: ["image_metadata", "pdf_text", "audio_metadata"],
  tool_search_plugins_mcp: ["search", "describe", "mcp_register", "mcp_list", "mcp_call", "mcp_status"]
});

function manifest(group, index) {
  return {
    schema: "gpao_t3.capability_manifest.v1", manifestVersion: 1, id: `foundation.${group.replaceAll("_", "-")}`,
    name: NAMES[group], description: `${NAMES[group]} 능력군의 GPAO-T3 Foundation 계약`, version: "1.0.0",
    kind: group === "messaging_channels" ? "channel" : group === "browser_ui" ? "browser" : group === "gateway_devices" ? "device" : "tool",
    groups: [group], capabilities: CAPABILITIES[group],
    protocol: { major: 1, minor: 2, minCompatibleMinor: 0 }, inputSchema: { type: "object", additionalProperties: false, properties: {} }, outputSchema: { type: "object", additionalProperties: true, properties: {} },
    streaming: false, cancellation: true, timeoutMs: 30_000, cost: { model: "none" }, secretBoundary: group === "messaging_channels" || group === "tool_search_plugins_mcp" ? "protected_adapter" : "none",
    authority: "read", sideEffect: "none", isolation: { mode: "worker", permitRevalidation: true },
    lifecycle: { install: true, preflight: true, activate: true, health: true, invoke: true, reconcile: true, disable: true, remove: true, update: true, rollback: true },
    provenance: { source: index < 11 ? "gpao-t3-foundation" : "external", license: "Proprietary" }, status: "ready"
  };
}

export function createFoundationCapabilityManifests() { return CAPABILITY_GROUPS.map(manifest); }
