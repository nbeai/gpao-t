import { RuntimeError } from "./errors.js";
import { capabilitySummary, negotiateCapabilityProtocol, validateCapabilityManifest } from "./capability-manifest.js";

export class CapabilityPlatform {
  constructor({ manifests = [], protocol = { major: 1, minor: 2 } } = {}) {
    this.protocol = protocol;
    this.entries = new Map();
    for (const manifest of manifests) this.install(manifest);
  }

  install(input) {
    const manifest = validateCapabilityManifest(input);
    if (this.entries.has(manifest.id)) throw new RuntimeError("capability_already_installed", "Capability is already installed", 409);
    const negotiation = negotiateCapabilityProtocol(manifest, this.protocol);
    const searchText = [manifest.id, manifest.name, manifest.description, manifest.kind, ...manifest.groups, ...manifest.capabilities].join(" ").toLowerCase();
    this.entries.set(manifest.id, { manifest, negotiation, state: manifest.status, previous: [], searchText });
    return this.describe(manifest.id);
  }

  search({ query = "", group = null, kind = null, limit = 20 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RuntimeError("invalid_capability_search", "Capability search limit must be between 1 and 100", 400);
    const terms = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
    const capabilities = [];
    for (const entry of this.entries.values()) {
      if (group && !entry.manifest.groups.includes(group)) continue;
      if (kind && entry.manifest.kind !== kind) continue;
      if (terms.length && !terms.every(term => entry.searchText.includes(term))) continue;
      capabilities.push({ ...capabilitySummary(entry.manifest), status: entry.state });
      if (capabilities.length >= limit) break;
    }
    return { schema: "gpao_t3.capability_search.v1", query: String(query), filters: { group, kind }, capabilities };
  }

  describe(id) {
    const entry = this.entries.get(String(id));
    if (!entry) return null;
    return { schema: "gpao_t3.capability_description.v1", ...capabilitySummary(entry.manifest), status: entry.state, protocol: entry.negotiation, inputSchema: entry.manifest.inputSchema, outputSchema: entry.manifest.outputSchema, streaming: entry.manifest.streaming, cancellation: entry.manifest.cancellation, timeoutMs: entry.manifest.timeoutMs, cost: entry.manifest.cost, secretBoundary: entry.manifest.secretBoundary, isolation: entry.manifest.isolation, lifecycle: entry.manifest.lifecycle, provenance: entry.manifest.provenance };
  }

  transition(id, operation, { nextState } = {}) {
    const entry = this.entries.get(String(id));
    if (!entry) throw new RuntimeError("capability_not_found", "Capability is not installed", 404);
    const states = { preflight: "checked", activate: "ready", health: entry.state, reconcile: entry.state, disable: "disabled", remove: "removed" };
    if (!(operation in states)) throw new RuntimeError("capability_lifecycle_invalid", "Capability lifecycle operation is unsupported", 400);
    entry.previous.push({ state: entry.state, version: entry.manifest.version });
    entry.state = nextState || states[operation] || entry.state;
    return { schema: "gpao_t3.capability_lifecycle_receipt.v1", capabilityId: id, operation, status: entry.state };
  }

  update(id, input) {
    const entry = this.entries.get(String(id));
    if (!entry) throw new RuntimeError("capability_not_found", "Capability is not installed", 404);
    const manifest = validateCapabilityManifest(input);
    if (manifest.id !== entry.manifest.id || manifest.version === entry.manifest.version) throw new RuntimeError("capability_update_invalid", "Capability update must preserve identity and change version", 400);
    const negotiation = negotiateCapabilityProtocol(manifest, this.protocol);
    entry.previous.push({ manifest: entry.manifest, negotiation: entry.negotiation, state: entry.state });
    entry.manifest = manifest; entry.negotiation = negotiation; entry.state = "checked";
    entry.searchText = [manifest.id, manifest.name, manifest.description, manifest.kind, ...manifest.groups, ...manifest.capabilities].join(" ").toLowerCase();
    return { schema: "gpao_t3.capability_lifecycle_receipt.v1", capabilityId: id, operation: "update", version: manifest.version, status: entry.state };
  }

  rollback(id) {
    const entry = this.entries.get(String(id));
    const previous = entry?.previous.pop();
    if (!entry || !previous?.manifest) throw new RuntimeError("capability_rollback_unavailable", "Capability has no update available to roll back", 409);
    entry.manifest = previous.manifest; entry.negotiation = previous.negotiation; entry.state = previous.state;
    entry.searchText = [entry.manifest.id, entry.manifest.name, entry.manifest.description, entry.manifest.kind, ...entry.manifest.groups, ...entry.manifest.capabilities].join(" ").toLowerCase();
    return { schema: "gpao_t3.capability_lifecycle_receipt.v1", capabilityId: id, operation: "rollback", version: entry.manifest.version, status: entry.state };
  }
}
