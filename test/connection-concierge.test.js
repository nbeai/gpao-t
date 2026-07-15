import assert from "node:assert/strict";
import test from "node:test";
import { createFoundationConnectorCatalog } from "../src/core/connector-catalog.js";
import { CONNECTION_CONCIERGE_SCHEMA, createConnectionConcierge, proposeConnectionSetup } from "../src/core/connection-concierge.js";

function concierge() {
  return createConnectionConcierge({
    providerCatalog: { snapshot: () => ({ providers: [{ id: "codex-oauth" }, { id: "openai" }, { id: "anthropic" }, { id: "google-gemini" }] }) },
    connectorCatalog: createFoundationConnectorCatalog()
  });
}

test("turns Korean and English connection requests into public review-only proposals", () => {
  const parser = concierge();
  const chatgpt = parser.propose("ChatGPT 연결해줘");
  const search = parser.propose("Please enable web search");
  const mcp = parser.propose("MCP 추가하고 싶어");

  assert.equal(chatgpt.schema, CONNECTION_CONCIERGE_SCHEMA);
  assert.deepEqual(chatgpt.proposals, [{ kind: "provider", providerId: "codex-oauth", setupRequest: { kind: "provider_connection", providerId: "codex-oauth" }, userReviewRequired: true, execute: false }]);
  assert.equal(search.proposals[0].connectorId, "web.search");
  assert.equal(mcp.proposals[0].connectorId, "mcp.external");
  for (const result of [chatgpt, search, mcp]) {
    assert.equal(result.status, "proposed");
    assert.equal(result.execute, false);
    assert.equal(result.userReviewRequired, true);
    assert.equal(result.proposals[0].execute, false);
    assert.equal(result.proposals[0].userReviewRequired, true);
  }
});

test("keeps external connector proposals review-only and excludes local built-ins", () => {
  const result = concierge().propose("로컬 상태 확인과 웹 검색 켜줘");
  assert.deepEqual(result.proposals.map(proposal => proposal.connectorId), ["web.search"]);
  assert.equal(result.proposals[0].userReviewRequired, true);
  assert.equal(result.proposals[0].execute, false);
});

test("supports mixed intent in a deterministic catalog order", () => {
  const result = concierge().propose("ChatGPT 연결하고 웹 검색 켜고 MCP 추가해줘");
  assert.deepEqual(result.proposals.map(proposal => proposal.providerId || proposal.connectorId), ["codex-oauth", "web.search", "mcp.external"]);
  assert.equal(result.execute, false);
  assert.equal(result.userReviewRequired, true);
});

test("keeps unrelated requests separate and rejects unsupported connection requests safely", () => {
  const unrelated = concierge().propose("오늘 날씨가 좋네요");
  const unknown = concierge().propose("Perplexity 연결해줘");
  assert.equal(unrelated.status, "not_applicable");
  assert.equal(unknown.status, "not_supported");
  assert.equal(unknown.reason, "unsupported_connection_request");
  for (const result of [unrelated, unknown]) {
    assert.deepEqual(result.proposals, []);
    assert.equal("setupRequest" in result, false);
    assert.equal(result.execute, false);
    assert.equal(result.userReviewRequired, false);
  }
});

test("rejects invalid and secret-like input without echoing secret material or raw errors", () => {
  const secret = "sk-private-value-123456789";
  const invalid = proposeConnectionSetup(null);
  const rejected = concierge().propose(`ChatGPT 연결해줘 api_key=${secret}`);
  assert.deepEqual(invalid.proposals, []);
  assert.equal(invalid.reason, "invalid_request");
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.reason, "secret_like_input");
  assert.equal(rejected.execute, false);
  assert.doesNotMatch(JSON.stringify(rejected), new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(rejected), /endpoint|raw error|api_key/i);
});
