const SCHEMA = "gpao_t3.connection_concierge_proposal.v1";

const DEFAULT_PROVIDERS = Object.freeze([
  "openai",
  "codex-oauth",
  "anthropic",
  "google-gemini"
]);

const DEFAULT_CONNECTORS = Object.freeze([
  "web.search",
  "mcp.external",
  "channel.telegram",
  "channel.document-export"
]);

const SETUP_LANGUAGE = /(?:connect|connection|set\s*up|configure|enable|add|use|연결|설정|켜\s*(?:줘|주세요|주다)?|추가|사용(?:하고)?\s*싶)/i;
const SECRET_LIKE_INPUT = /(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|token|secret|password|비밀번호)\s*[:=]\s*\S+|bearer\s+\S+)/i;

function publicResult({ status, reason = null, proposals = [] }) {
  return {
    schema: SCHEMA,
    status,
    reason,
    execute: false,
    userReviewRequired: proposals.some(proposal => proposal.userReviewRequired),
    proposals
  };
}

function catalogIds(catalog, key, defaults) {
  const source = Array.isArray(catalog) ? catalog : catalog?.snapshot?.()?.[key];
  if (!Array.isArray(source)) return new Set(defaults);
  return new Set(source.map(entry => typeof entry === "string" ? entry : entry?.id).filter(Boolean));
}

function includesAny(input, patterns) {
  return patterns.some(pattern => pattern.test(input));
}

function providerRequest(providerId) {
  return {
    kind: "provider",
    providerId,
    setupRequest: { kind: "provider_connection", providerId },
    userReviewRequired: true,
    execute: false
  };
}

function connectorRequest(connectorId) {
  return {
    kind: "connector",
    connectorId,
    setupRequest: { kind: "connector_setup", connectorId },
    userReviewRequired: true,
    execute: false
  };
}

/**
 * Converts connection-oriented language into public, review-only setup
 * proposals. It does not invoke catalogs, providers, connectors, or storage.
 */
export function createConnectionConcierge({ providerCatalog, connectorCatalog } = {}) {
  const providerIds = catalogIds(providerCatalog, "providers", DEFAULT_PROVIDERS);
  const connectorIds = catalogIds(connectorCatalog, "connectors", DEFAULT_CONNECTORS);

  return {
    propose(request) {
      if (typeof request !== "string" || !request.trim()) {
        return publicResult({ status: "rejected", reason: "invalid_request" });
      }
      if (SECRET_LIKE_INPUT.test(request)) {
        return publicResult({ status: "rejected", reason: "secret_like_input" });
      }
      if (!SETUP_LANGUAGE.test(request)) {
        return publicResult({ status: "not_applicable" });
      }

      const proposals = [];
      if (providerIds.has("codex-oauth") && includesAny(request, [/chatgpt/i, /codex/i])) proposals.push(providerRequest("codex-oauth"));
      if (providerIds.has("openai") && includesAny(request, [/openai/i])) proposals.push(providerRequest("openai"));
      if (providerIds.has("anthropic") && includesAny(request, [/anthropic/i, /claude/i])) proposals.push(providerRequest("anthropic"));
      if (providerIds.has("google-gemini") && includesAny(request, [/gemini/i, /google\s*(?:ai|gemini)/i])) proposals.push(providerRequest("google-gemini"));

      if (connectorIds.has("web.search") && includesAny(request, [/웹\s*검색/i, /web\s*search/i, /search\s*(?:on|켜|enable)/i])) {
        proposals.push(connectorRequest("web.search"));
      }
      if (connectorIds.has("mcp.external") && /\bmcp\b/i.test(request)) proposals.push(connectorRequest("mcp.external"));
      if (connectorIds.has("channel.telegram") && includesAny(request, [/telegram/i, /텔레그램/i])) proposals.push(connectorRequest("channel.telegram"));
      if (connectorIds.has("channel.document-export") && includesAny(request, [/문서\s*내보내기/i, /document\s*export/i, /export\s*document/i])) proposals.push(connectorRequest("channel.document-export"));

      return publicResult({
        status: proposals.length ? "proposed" : "not_supported",
        reason: proposals.length ? null : "unsupported_connection_request",
        proposals
      });
    }
  };
}

export function proposeConnectionSetup(request, options) {
  return createConnectionConcierge(options).propose(request);
}

export { SCHEMA as CONNECTION_CONCIERGE_SCHEMA };
