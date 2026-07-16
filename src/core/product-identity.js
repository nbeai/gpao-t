export const PRODUCT_IDENTITY = Object.freeze({
  productId: "gpao-t3",
  productName: "GPAO-T3",
  runtimeName: "GPAO-T3 Runtime",
  packageName: "gpao-t3-foundation-runtime",
  schemaPrefix: "gpao_t3.",
  stateNamespace: "gpao-t3",
  defaultStateDirectory: ".gpao-t3",
  databaseFile: "gpao-t3.sqlite",
  serviceName: "ai.nbeai.gpao-t3.runtime",
  processTitle: "gpao-t3-runtime",
  updateChannel: "gpao-t3-stable",
  localSessionCookie: "gpao_t3_local_session",
  localSessionStorage: "gpao-t3.sessions.v1",
  environmentPrefix: "GPAO_T3_"
});

export const STATE_OWNERSHIP = Object.freeze([
  Object.freeze({ domain: "runtime_intent", owner: "sqlite", durability: "durable", table: "commands" }),
  Object.freeze({ domain: "execution_outbox", owner: "sqlite", durability: "durable", table: "outbox" }),
  Object.freeze({ domain: "event_receipt_progress", owner: "sqlite", durability: "durable", table: "events/receipts/progress" }),
  Object.freeze({ domain: "turn_stage_telemetry", owner: "sqlite", durability: "durable", table: "turn_stage_telemetry" }),
  Object.freeze({ domain: "provider_connection_metadata", owner: "sqlite", durability: "durable", table: "preferences" }),
  Object.freeze({ domain: "connector_controls", owner: "sqlite", durability: "durable", table: "preferences" }),
  Object.freeze({ domain: "messenger_sessions", owner: "sqlite", durability: "durable", table: "messenger_sessions/channel_bindings" }),
  Object.freeze({ domain: "channel_ingress", owner: "sqlite", durability: "durable", table: "channel_inbound/channel_checkpoints" }),
  Object.freeze({ domain: "channel_delivery", owner: "sqlite", durability: "durable", table: "channel_deliveries" }),
  Object.freeze({ domain: "channel_context_packet", owner: "runtime_core", durability: "derived_authority_boundary", table: "messenger_sessions/channel_inbound" }),
  Object.freeze({ domain: "local_auth_session", owner: "runtime_process", durability: "ephemeral_security_boundary", table: null }),
  Object.freeze({ domain: "memory_wiki", owner: "sqlite", durability: "durable_review_gated", table: "memory_wiki" }),
  Object.freeze({ domain: "memory_search_projection", owner: "sqlite", durability: "derived_rebuildable", table: "memory_lexical_fts/memory_vector_fts/memory_semantic_fts/memory_vector_projection" }),
  Object.freeze({ domain: "context_influence", owner: "sqlite", durability: "durable_replay_gated", table: "context_influences" }),
  Object.freeze({ domain: "mct_admission", owner: "sqlite", durability: "durable_canonical", table: "mct_task_packets/mct_tcell_candidates/mct_admission_decisions" }),
  Object.freeze({ domain: "mct_response_influence", owner: "sqlite", durability: "durable_trace_ledger", table: "mct_response_influences" }),
  Object.freeze({ domain: "session_workspace", owner: "sqlite", durability: "durable", table: "session_workspaces/workspace_messages" }),
  Object.freeze({ domain: "response_document", owner: "sqlite", durability: "durable_canonical", table: "response_documents" }),
  Object.freeze({ domain: "surface_event_projection", owner: "sqlite", durability: "durable_replay_projection", table: "surface_event_journal" })
]);

export function schemaName(name) {
  return `${PRODUCT_IDENTITY.schemaPrefix}${name}`;
}
