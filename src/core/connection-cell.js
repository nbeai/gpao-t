import { RuntimeError } from "./errors.js";

const CELL_SCHEMA = "gpao_t3.connection_cell.v1";
const CELL_PLAN_SCHEMA = "gpao_t3.connection_cell_plan.v1";
const READ_EFFECTS = new Set(["read"]);
const WRITE_EFFECTS = new Set(["local_write", "external_send", "external_mutation"]);
const SECRET_KEY = /(?:secret|token|credential|password|authorization|api[_-]?key|endpoint|url|command|environment|header)/i;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[redacted]" : redact(item)]));
}

function cellKind(entry) {
  if (entry.kind) return entry.kind;
  if (entry.id?.startsWith("mcp.") || entry.transport === "stdio") return "mcp";
  if (entry.id?.startsWith("channel.") || entry.transport === "webhook" || entry.authority === "external_send") return "channel";
  if (entry.id?.startsWith("tool.")) return "tool";
  return "connector";
}

function seamlessState({ enabled, health, setup, authority }) {
  if (!enabled) return "disabled";
  if (setup?.userActionRequired) return "needs_setup_review";
  if (health?.state === "ready" && READ_EFFECTS.has(authority)) return "usable_read";
  if (health?.state === "ready" && WRITE_EFFECTS.has(authority)) return "approval_required";
  if (health?.state === "degraded") return "degraded";
  if (health?.state === "unavailable") return "unavailable";
  return "checking";
}

function compatibilityFor(entry) {
  return {
    cellSchema: CELL_SCHEMA,
    adapterContract: ["discover", "authorize", "execute", "progress", "cancel", "reconcile", "disable"],
    surfaces: ["runtime", "dashboard", "receipt", "doctor"],
    transport: entry.transport || "in_process",
    version: entry.version || "1.0.0"
  };
}

function connectorCell(connector) {
  const authority = connector.authority;
  const setupReviewed = ["reviewed", "connected"].includes(connector.setupState);
  const setup = { ...connector.setup, userActionRequired: connector.setup?.userActionRequired === true && !setupReviewed };
  return redact({
    schema: CELL_SCHEMA,
    id: connector.id,
    kind: cellKind(connector),
    name: connector.name,
    description: connector.description,
    enabled: connector.enabled,
    capabilities: connector.capabilities,
    authority,
    health: connector.health,
    setup: { ...setup, state: connector.setupState || "not_started" },
    compatibility: compatibilityFor(connector),
    execution: {
      automaticRead: READ_EFFECTS.has(authority),
      approvalRequired: WRITE_EFFECTS.has(authority),
      externalEffect: authority.startsWith("external"),
      idempotencyRequired: WRITE_EFFECTS.has(authority)
    },
    seamlessState: seamlessState({ ...connector, setup })
  });
}

function toolCell(tool) {
  const authority = tool.effect;
  const enabled = tool.readiness === "ready";
  const setup = { authentication: "none", userActionRequired: tool.approval === "explicit" };
  return redact({
    schema: CELL_SCHEMA,
    id: `tool.${tool.id}`,
    kind: "tool",
    name: tool.id,
    description: `Runtime tool: ${tool.capabilities.join(", ")}`,
    enabled,
    capabilities: tool.capabilities,
    authority,
    health: { state: tool.readiness === "ready" ? "ready" : "unavailable", checkedAt: null },
    setup,
    compatibility: compatibilityFor({ ...tool, id: `tool.${tool.id}`, transport: "in_process", version: "1.0.0" }),
    execution: {
      automaticRead: READ_EFFECTS.has(authority) && tool.approval === "none",
      approvalRequired: tool.approval === "explicit" || WRITE_EFFECTS.has(authority),
      externalEffect: authority.startsWith("external"),
      idempotencyRequired: true
    },
    seamlessState: seamlessState({ enabled, health: { state: tool.readiness === "ready" ? "ready" : "unavailable" }, setup, authority })
  });
}

export class ConnectionCellRegistry {
  constructor({ connectorController, toolRegistry } = {}) {
    this.connectorController = connectorController;
    this.toolRegistry = toolRegistry;
  }

  snapshot() {
    const connectors = this.connectorController?.list?.() || [];
    const tools = this.toolRegistry?.snapshot?.().tools || [];
    const cells = [...connectors.map(connectorCell), ...tools.map(toolCell)];
    return { schema: "gpao_t3.connection_cell_registry.v1", cells };
  }

  get(cellId) {
    const cell = this.snapshot().cells.find(entry => entry.id === cellId);
    if (!cell) throw new RuntimeError("connection_cell_not_found", "Requested connection cell is not installed", 404, { cellId });
    return cell;
  }

  plan({ cellId, action = "execute", args = {}, idempotencyKey = null } = {}) {
    const cell = this.get(cellId);
    const requestedEffect = String(args?.effect || cell.authority);
    if (SECRET_KEY.test(JSON.stringify(args || {}))) {
      throw new RuntimeError("connection_cell_secret_forbidden", "Connection cell arguments must not contain secret material", 400, { cellId });
    }
    const approvalRequired = cell.execution.approvalRequired || !READ_EFFECTS.has(requestedEffect);
    const blockedReason = cell.seamlessState === "disabled" ? "disabled"
      : cell.seamlessState === "needs_setup_review" ? "setup_review_required"
      : cell.seamlessState === "degraded" ? "health_degraded"
      : cell.seamlessState === "unavailable" ? "unavailable"
      : approvalRequired && !idempotencyKey ? "approval_required"
      : null;
    return redact({
      schema: CELL_PLAN_SCHEMA,
      cellId: cell.id,
      kind: cell.kind,
      action,
      authority: cell.authority,
      requestedEffect,
      compatibility: cell.compatibility,
      automatic: !approvalRequired && blockedReason === null,
      approvalRequired,
      idempotencyRequired: cell.execution.idempotencyRequired,
      externalEffect: cell.execution.externalEffect,
      status: blockedReason ? "blocked" : "admitted",
      blockedReason,
      nextSafeAction: blockedReason ? nextSafeAction(blockedReason) : "execute_with_receipt",
      args
    });
  }
}

function nextSafeAction(reason) {
  if (reason === "disabled") return "enable_or_choose_another_cell";
  if (reason === "setup_review_required") return "review_setup_before_enable";
  if (reason === "approval_required") return "request_explicit_approval";
  if (reason === "health_degraded") return "check_health_before_retry";
  if (reason === "unavailable") return "reconnect_or_disable";
  return "manual_review";
}

export { CELL_SCHEMA, CELL_PLAN_SCHEMA };
