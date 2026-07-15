import { RuntimeError } from "./errors.js";

export const CAPABILITY_GROUPS = Object.freeze([
  "runtime", "files", "web", "browser_ui", "messaging_channels", "sessions_agents",
  "automation", "gateway_devices", "memory_context", "media", "tool_search_plugins_mcp"
]);

export const CAPABILITY_KINDS = Object.freeze(["tool", "model", "channel", "mcp", "browser", "device", "runtime"]);
const AUTHORITIES = new Set(["read", "local_write", "external_send", "external_mutation", "destructive"]);
const SIDE_EFFECTS = new Set(["none", "local", "external", "destructive"]);
const LIFECYCLE = ["install", "preflight", "activate", "health", "invoke", "reconcile", "disable", "remove", "update", "rollback"];
const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function fail(message, details) { throw new RuntimeError("invalid_capability_manifest", message, 400, details); }
function strings(value, name) {
  if (!Array.isArray(value) || !value.length || value.some(entry => typeof entry !== "string" || !entry.trim())) fail(`${name} must contain non-empty strings`);
  return [...new Set(value.map(entry => entry.trim()))];
}
function schema(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.type !== "object") fail(`${name} must be an object JSON schema`);
  return structuredClone(value);
}

export function negotiateCapabilityProtocol(manifest, core = { major: 1, minor: 2 }) {
  const protocol = manifest.protocol;
  const compatible = protocol.major === core.major && core.minor >= protocol.minCompatibleMinor && protocol.minor >= Math.max(0, core.minor - 2);
  if (!compatible) throw new RuntimeError("capability_protocol_incompatible", "Capability protocol is not compatible with this GPAO-T3 runtime", 409, { capabilityId: manifest.id, core, adapter: protocol });
  return { schema: "gpao_t3.capability_protocol_negotiation.v1", core, adapter: protocol, selected: { major: core.major, minor: Math.min(core.minor, protocol.minor) } };
}

export function validateCapabilityManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Capability manifest must be an object");
  if (input.schema !== "gpao_t3.capability_manifest.v1" || input.manifestVersion !== 1) fail("Capability manifest schema is unsupported");
  if (!ID.test(input.id || "")) fail("Capability id is invalid");
  if (!CAPABILITY_KINDS.includes(input.kind)) fail("Capability kind is unsupported", { kind: input.kind });
  const groups = strings(input.groups, "groups");
  if (groups.some(group => !CAPABILITY_GROUPS.includes(group))) fail("Capability group is unsupported");
  if (!input.protocol || ![input.protocol.major, input.protocol.minor, input.protocol.minCompatibleMinor].every(Number.isInteger)) fail("Protocol version is incomplete");
  if (input.protocol.minCompatibleMinor > input.protocol.minor) fail("Protocol minimum exceeds adapter minor");
  if (!AUTHORITIES.has(input.authority) || !SIDE_EFFECTS.has(input.sideEffect)) fail("Authority or side effect is unsupported");
  if (input.sideEffect === "none" && input.authority !== "read") fail("Side-effect-free capabilities must remain read authority");
  if (!input.isolation || input.isolation.mode !== "worker" || input.isolation.permitRevalidation !== true) fail("Capability must use an isolated worker with permit revalidation");
  if (!input.lifecycle || LIFECYCLE.some(operation => input.lifecycle[operation] !== true)) fail("Capability lifecycle is incomplete");
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1 || input.timeoutMs > 3_600_000) fail("Capability timeout is invalid");
  if (!input.provenance?.source || !input.provenance?.license) fail("Capability provenance and license are required");
  return Object.freeze({
    schema: input.schema, manifestVersion: 1, id: input.id, name: String(input.name || input.id), description: String(input.description || ""),
    version: String(input.version || ""), kind: input.kind, groups, capabilities: strings(input.capabilities, "capabilities"),
    protocol: { ...input.protocol }, inputSchema: schema(input.inputSchema, "inputSchema"), outputSchema: schema(input.outputSchema, "outputSchema"),
    streaming: input.streaming === true, cancellation: input.cancellation === true, timeoutMs: input.timeoutMs,
    cost: { model: input.cost?.model || "unknown", currency: input.cost?.currency || null }, secretBoundary: input.secretBoundary || "none",
    authority: input.authority, sideEffect: input.sideEffect, isolation: { ...input.isolation }, lifecycle: { ...input.lifecycle },
    provenance: { source: input.provenance.source, license: input.provenance.license }, status: input.status || "not_configured"
  });
}

export function capabilitySummary(manifest) {
  return { id: manifest.id, name: manifest.name, description: manifest.description, version: manifest.version, kind: manifest.kind, groups: [...manifest.groups], capabilities: [...manifest.capabilities], authority: manifest.authority, sideEffect: manifest.sideEffect, status: manifest.status };
}

export const CAPABILITY_MANIFEST_LIFECYCLE = Object.freeze([...LIFECYCLE]);

export function validateCapabilityValue(value, definition, direction = "input") {
  if (definition.type !== "object" || !value || typeof value !== "object" || Array.isArray(value)) throw new RuntimeError("capability_schema_mismatch", `Capability ${direction} must be an object`, 400);
  const properties = definition.properties || {};
  for (const field of definition.required || []) if (!(field in value)) throw new RuntimeError("capability_schema_mismatch", `Capability ${direction} is missing a required field`, 400, { field });
  if (definition.additionalProperties === false) for (const field of Object.keys(value)) if (!(field in properties)) throw new RuntimeError("capability_schema_mismatch", `Capability ${direction} contains an unsupported field`, 400, { field });
  for (const [field, child] of Object.entries(value)) {
    const expected = properties[field]?.type;
    if (expected && ((expected === "array" && !Array.isArray(child)) || (expected === "object" && (!child || typeof child !== "object" || Array.isArray(child))) || (!["array", "object"].includes(expected) && typeof child !== expected))) throw new RuntimeError("capability_schema_mismatch", `Capability ${direction} field has the wrong type`, 400, { field });
  }
  return value;
}
