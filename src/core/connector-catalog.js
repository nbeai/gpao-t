import { RuntimeError } from "./errors.js";

const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const TRANSPORTS = new Set(["builtin", "stdio", "http", "webhook", "local_api", "protected_adapter"]);
const AUTHORITIES = new Set(["read", "local_write", "external_send", "external_mutation"]);
const HEALTH_STATES = new Set(["ready", "unknown", "degraded", "unavailable"]);
const MANIFEST_FIELDS = new Set(["id", "name", "description", "version", "transport", "capabilities", "authority", "enabled", "health", "setup"]);
const HEALTH_FIELDS = new Set(["state", "checkedAt"]);
const SETUP_FIELDS = new Set(["authentication", "userActionRequired"]);
const FORBIDDEN_FIELD = /(?:secret|token|credential|password|endpoint|url|command|environment|header)/i;

function uniqueStrings(values, field) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== "string" || !value.trim())) {
    throw new RuntimeError("invalid_connector_manifest", `${field} must contain at least one non-empty string`, 400);
  }
  return [...new Set(values.map(value => value.trim()))];
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new RuntimeError("invalid_connector_manifest", `${field} is required`, 400);
  }
  return value.trim();
}

function rejectUnknownFields(value, allowed, field) {
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_FIELD.test(key)) {
      throw new RuntimeError("unsafe_connector_manifest", `${field} must not contain credentials, endpoints, or commands`, 400, { field: key });
    }
    if (!allowed.has(key)) {
      throw new RuntimeError("invalid_connector_manifest", `${field} contains an unsupported field`, 400, { field: key });
    }
  }
}

function publicEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    version: entry.version,
    transport: entry.transport,
    capabilities: [...entry.capabilities],
    authority: entry.authority,
    enabled: entry.enabled,
    health: { ...entry.health },
    setup: { ...entry.setup }
  };
}

/**
 * Product-facing metadata and policy for connectors. It never accepts or
 * exposes credentials, endpoints, environment values, or executable commands.
 */
export class ConnectorCatalog {
  constructor({ connectors = [] } = {}) {
    this.connectors = new Map();
    for (const connector of connectors) this.register(connector);
  }

  register(manifest) {
    const entry = validateConnectorManifest(manifest);
    if (this.connectors.has(entry.id)) {
      throw new RuntimeError("connector_already_registered", "Connector id is already registered", 409, { connectorId: entry.id });
    }
    this.connectors.set(entry.id, entry);
    return publicEntry(entry);
  }

  get(id) {
    const entry = this.connectors.get(String(id));
    return entry ? publicEntry(entry) : null;
  }

  setEnabled(id, enabled) {
    const entry = this.connectors.get(String(id));
    if (!entry) throw new RuntimeError("connector_not_found", "Requested connector is not registered", 404, { connectorId: id });
    if (typeof enabled !== "boolean") throw new RuntimeError("invalid_connector_enabled_state", "Connector enabled state must be boolean", 400);
    entry.enabled = enabled;
    return publicEntry(entry);
  }

  setHealth(id, health) {
    const entry = this.connectors.get(String(id));
    if (!entry) throw new RuntimeError("connector_not_found", "Requested connector is not registered", 404, { connectorId: id });
    entry.health = validateHealth(health);
    return publicEntry(entry);
  }

  snapshot() {
    return {
      schema: "gpao_t3.connector_catalog.v1",
      connectors: [...this.connectors.values()].map(publicEntry)
    };
  }
}

export function validateConnectorManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new RuntimeError("invalid_connector_manifest", "Connector manifest must be an object", 400);
  }
  rejectUnknownFields(manifest, MANIFEST_FIELDS, "Connector manifest");
  const id = requireString(manifest.id, "id");
  if (!ID_PATTERN.test(id)) throw new RuntimeError("invalid_connector_manifest", "Connector id has an unsupported format", 400, { connectorId: id });
  const transport = requireString(manifest.transport, "transport");
  if (!TRANSPORTS.has(transport)) throw new RuntimeError("invalid_connector_manifest", "Connector transport is not supported", 400, { connectorId: id });
  const authority = requireString(manifest.authority, "authority");
  if (!AUTHORITIES.has(authority)) throw new RuntimeError("invalid_connector_manifest", "Connector authority is not supported", 400, { connectorId: id });
  if (typeof manifest.enabled !== "boolean") throw new RuntimeError("invalid_connector_manifest", "Connector enabled state is required", 400, { connectorId: id });

  return {
    id,
    name: requireString(manifest.name, "name"),
    description: requireString(manifest.description, "description"),
    version: requireString(manifest.version, "version"),
    transport,
    capabilities: uniqueStrings(manifest.capabilities, "capabilities"),
    authority,
    enabled: manifest.enabled,
    health: validateHealth(manifest.health),
    setup: validateSetup(manifest.setup)
  };
}

function validateHealth(health) {
  if (!health || typeof health !== "object" || Array.isArray(health)) {
    throw new RuntimeError("invalid_connector_manifest", "Connector health is required", 400);
  }
  rejectUnknownFields(health, HEALTH_FIELDS, "Connector health");
  const state = requireString(health.state, "health.state");
  if (!HEALTH_STATES.has(state)) throw new RuntimeError("invalid_connector_manifest", "Connector health state is not supported", 400);
  const checkedAt = health.checkedAt === null || health.checkedAt === undefined ? null : requireString(health.checkedAt, "health.checkedAt");
  return { state, checkedAt };
}

function validateSetup(setup = {}) {
  if (!setup || typeof setup !== "object" || Array.isArray(setup)) {
    throw new RuntimeError("invalid_connector_manifest", "Connector setup must be an object", 400);
  }
  rejectUnknownFields(setup, SETUP_FIELDS, "Connector setup");
  const authentication = setup.authentication === undefined ? "none" : requireString(setup.authentication, "setup.authentication");
  if (!["none", "api_key", "oauth", "manual_review"].includes(authentication)) {
    throw new RuntimeError("invalid_connector_manifest", "Connector authentication is not supported", 400);
  }
  return { authentication, userActionRequired: setup.userActionRequired === true };
}

export function createFoundationConnectorCatalog() {
  return new ConnectorCatalog({
    connectors: [
      {
        id: "local.runtime-status",
        name: "GPAO-T3 상태 확인",
        description: "현재 로컬 런타임의 상태를 읽기 전용으로 확인합니다.",
        version: "1.0.0",
        transport: "builtin",
        capabilities: ["read_status"],
        authority: "read",
        enabled: true,
        health: { state: "ready", checkedAt: null },
        setup: { authentication: "none", userActionRequired: false }
      },
      {
        id: "local.workspace-read",
        name: "로컬 작업공간 읽기",
        description: "승인된 로컬 작업공간의 파일을 읽기 전용으로 확인합니다.",
        version: "1.0.0",
        transport: "builtin",
        capabilities: ["read_workspace"],
        authority: "read",
        enabled: true,
        health: { state: "unknown", checkedAt: null },
        setup: { authentication: "none", userActionRequired: false }
      },
      {
        id: "web.search",
        name: "웹 검색",
        description: "외부 검색 연결이 설정된 뒤 최신 정보를 찾습니다.",
        version: "1.0.0",
        transport: "http",
        capabilities: ["search_web"],
        authority: "read",
        enabled: false,
        health: { state: "unknown", checkedAt: null },
        setup: { authentication: "api_key", userActionRequired: true }
      },
      {
        id: "mcp.external",
        name: "외부 MCP 연결",
        description: "검토된 MCP 서버를 연결해 도구 기능을 추가합니다.",
        version: "1.0.0",
        transport: "stdio",
        capabilities: ["discover_tools", "invoke_tool"],
        authority: "external_mutation",
        enabled: false,
        health: { state: "unknown", checkedAt: null },
        setup: { authentication: "manual_review", userActionRequired: true }
      },
      {
        id: "channel.telegram",
        name: "Telegram 채널",
        description: "승인된 뒤 사용자에게 메시지를 보내는 외부 채널입니다.",
        version: "1.0.0",
        transport: "protected_adapter",
        capabilities: ["receive_message", "send_message", "reconcile_delivery"],
        authority: "external_send",
        enabled: false,
        health: { state: "unknown", checkedAt: null },
        setup: { authentication: "api_key", userActionRequired: true }
      },
      {
        id: "channel.document-export",
        name: "문서 내보내기 채널",
        description: "승인된 뒤 문서나 작업 결과를 외부 위치로 내보냅니다.",
        version: "1.0.0",
        transport: "local_api",
        capabilities: ["export_document"],
        authority: "local_write",
        enabled: false,
        health: { state: "unknown", checkedAt: null },
        setup: { authentication: "manual_review", userActionRequired: true }
      }
    ]
  });
}
