import { RuntimeError } from "./errors.js";

const EXTERNAL_TRANSPORTS = new Set(["http", "webhook", "stdio", "local_api"]);
const REVIEWED_SETUP_STATES = new Set(["reviewed", "connected"]);
const SECRET_KEY = /(?:secret|token|credential|password|authorization|api[_-]?key|endpoint|url|command|environment|header)/i;

function requireConnectorId(connectorId) {
  if (typeof connectorId !== "string" || !connectorId.trim()) {
    throw new RuntimeError("invalid_connector_id", "Connector id is required", 400);
  }
  return connectorId.trim();
}

function isExternalConnector(connector) {
  return EXTERNAL_TRANSPORTS.has(connector.transport);
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[redacted]" : redact(item)]));
}

function publicConnector(connector) {
  return {
    id: connector.id,
    name: connector.name,
    description: connector.description,
    version: connector.version,
    transport: connector.transport,
    capabilities: [...connector.capabilities],
    authority: connector.authority,
    enabled: connector.enabled,
    health: { ...connector.health },
    setup: { ...connector.setup }
  };
}

function receipt({ action, connector, status, reason = null, at, setupState = null }) {
  return redact({
    schema: "gpao_t.connector_controller_receipt.v1",
    action,
    connectorId: connector.id,
    connectorVersion: connector.version,
    authority: connector.authority,
    executionAuthorityGranted: false,
    status,
    reason,
    setupState,
    at,
    connector: publicConnector(connector)
  });
}

/**
 * Controls visibility and readiness of catalogued connectors. It never stores
 * secrets or grants tool execution authority; execution remains a separate,
 * permit-bound runtime concern.
 */
export class ConnectorController {
  constructor({ catalog, clock = () => new Date().toISOString(), setupStates = new Map() } = {}) {
    if (!catalog || typeof catalog.get !== "function" || typeof catalog.setEnabled !== "function" || typeof catalog.setHealth !== "function" || typeof catalog.snapshot !== "function") {
      throw new RuntimeError("invalid_connector_catalog", "Connector controller requires a compatible catalog", 500);
    }
    this.catalog = catalog;
    this.clock = clock;
    this.setupStates = setupStates instanceof Map ? new Map(setupStates) : new Map(Object.entries(setupStates || {}));
  }

  list() {
    return this.catalog.snapshot().connectors.map(connector => ({
      ...publicConnector(connector),
      setupState: this.setupStates.get(connector.id) || "not_started"
    }));
  }

  get(connectorId) {
    return this.#requireConnector(connectorId);
  }

  setSetupState(connectorId, state) {
    const connector = this.#requireConnector(connectorId);
    if (typeof state !== "string" || !state.trim()) {
      throw new RuntimeError("invalid_connector_setup_state", "Connector setup state is required", 400, { connectorId: connector.id });
    }
    this.setupStates.set(connector.id, state.trim());
    return receipt({ action: "setup_state_recorded", connector, status: "recorded", at: this.clock(), setupState: state.trim() });
  }

  enable(connectorId) {
    const connector = this.#requireConnector(connectorId);
    const setupState = this.setupStates.get(connector.id) || null;
    if (isExternalConnector(connector) && !REVIEWED_SETUP_STATES.has(setupState)) {
      throw new RuntimeError(
        "connector_setup_review_required",
        "External connector setup must be reviewed before enabling",
        409,
        { connectorId: connector.id, setupState: setupState || "not_started", required: "reviewed" }
      );
    }
    const enabled = this.catalog.setEnabled(connector.id, true);
    return receipt({ action: "enabled", connector: enabled, status: "ready_for_permit_review", at: this.clock(), setupState });
  }

  disable(connectorId) {
    const connector = this.#requireConnector(connectorId);
    const disabled = this.catalog.setEnabled(connector.id, false);
    return receipt({ action: "disabled", connector: disabled, status: "disabled", at: this.clock(), setupState: this.setupStates.get(connector.id) || null });
  }

  recordHealth(connectorId, health) {
    const connector = this.#requireConnector(connectorId);
    const updated = this.catalog.setHealth(connector.id, health);
    return receipt({ action: "health_recorded", connector: updated, status: updated.health.state, at: this.clock(), setupState: this.setupStates.get(connector.id) || null });
  }

  #requireConnector(connectorId) {
    const id = requireConnectorId(connectorId);
    const connector = this.catalog.get(id);
    if (!connector) throw new RuntimeError("connector_not_found", "Requested connector is not registered", 404, { connectorId: id });
    return connector;
  }
}
