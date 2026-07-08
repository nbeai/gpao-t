export function buildRuntimeDataContract() {
  return {
    schema: "gpao_t.runtime_data_contract.v0_1",
    status: "ready",
    storageRoot: ".gpao-t",
    storageModel: "local_files_only",
    schemaFile: "schema/gpao-t-runtime-data-schema.json",
    surfaces: [
      {
        id: "runtime_state",
        path: ".gpao-t/state/runtime.json",
        format: "json",
        purpose: "local active flow, counters, and authority boundary snapshot",
        mutation: "read_write",
      },
      {
        id: "audit_events",
        path: ".gpao-t/events/audit.jsonl",
        format: "jsonl",
        purpose: "append-only local events for trace, recovery, and authority review",
        mutation: "append_only",
      },
      {
        id: "memory_wiki",
        path: ".gpao-t/memory/wiki.json",
        format: "json",
        purpose: "source-linked candidate memory entries before admission",
        mutation: "read_write",
      },
      {
        id: "tcell_candidates",
        path: ".gpao-t/memory/tcell-candidates.jsonl",
        format: "jsonl",
        purpose: "candidate T-cells generated from Memory Wiki entries",
        mutation: "append_only",
      },
      {
        id: "replay_history",
        path: ".gpao-t/recovery/history.jsonl",
        format: "jsonl",
        purpose: "local replay recovery records for repeated-pattern evidence",
        mutation: "append_only",
      },
      {
        id: "growth_proposals",
        path: ".gpao-t/growth/proposals.jsonl",
        format: "jsonl",
        purpose: "review-only self-growth proposals",
        mutation: "append_only",
      },
      {
        id: "growth_application_gates",
        path: ".gpao-t/growth/application-gates.jsonl",
        format: "jsonl",
        purpose: "approval, replay, audit, and rollback gate reviews",
        mutation: "append_only",
      },
      {
        id: "install_hardening",
        path: ".gpao-t/ops/install-hardening.jsonl",
        format: "jsonl",
        purpose: "local install, update, and rollback readiness reviews",
        mutation: "append_only",
      },
    ],
    authorityBoundary: {
      externalTelemetry: "not_used",
      externalSync: "not_used",
      secretStorage: "not_used",
      durableMemoryPromotion: "blocked_in_this_slice",
      userDataDeletion: "local_filesystem_control",
    },
    migrationPolicy: {
      currentVersion: "0.1.0",
      compatibility: "append-only json/jsonl during skeleton phase",
      migrationRequiredNow: false,
      futureRequirement:
        "Any schema-breaking change must add a migration preview, backup path, rollback note, and replay check.",
    },
  };
}

export function buildOperationsReliabilityContract() {
  return {
    schema: "gpao_t.operations_reliability_contract.v0_1",
    status: "ready",
    runtimeMode: "local_cli_and_static_gateway_contract",
    retryPolicy: {
      previewCommands: "safe_to_retry",
      recordCommands: "append_only; repeat runs create new review evidence records",
      externalActions: "not_executed_in_this_slice",
    },
    timeoutPolicy: {
      localComputation: "bounded_by_current_process",
      networkCalls: "not_used",
      daemonOrBackgroundTask: "not_started",
    },
    idempotencyPolicy: {
      readCommands: "idempotent",
      previewCommands: "idempotent_for_same_inputs",
      appendRecordCommands: "non_idempotent_by_design_but_local_only",
      liveMutationCommands: "not_available_in_this_slice",
    },
    duplicatePrevention: {
      liveExternalEffects: "prevented_by_absence_of_external_execution",
      auditRecords: "append-only evidence may repeat and should be summarized by future review UI",
      growthApplication: "blocked until a future apply engine can enforce proposal-id level idempotency",
    },
    failureRecovery: {
      localState: "delete or restore .gpao-t after local backup",
      replay: "rerun replay fixtures and compare recovery view",
      installUpdateRollback: "use hardening review before any future executor exists",
    },
    nextHardeningRequirement:
      "Before any daemon, connector, external model, or live apply engine is enabled, add explicit timeout, retry, idempotency key, and rollback tests.",
  };
}

export function buildOperationsContractSummary() {
  const data = buildRuntimeDataContract();
  const reliability = buildOperationsReliabilityContract();
  return {
    schema: "gpao_t.operations_contract_summary.v0_1",
    status: data.status === "ready" && reliability.status === "ready" ? "ready" : "review",
    dataSurfaces: data.surfaces.length,
    storageRoot: data.storageRoot,
    storageModel: data.storageModel,
    schemaFile: data.schemaFile,
    runtimeMode: reliability.runtimeMode,
    migrationRequiredNow: data.migrationPolicy.migrationRequiredNow,
    externalTelemetry: data.authorityBoundary.externalTelemetry,
    externalActions: reliability.retryPolicy.externalActions,
    previewRetryPolicy: reliability.retryPolicy.previewCommands,
    recordRetryPolicy: reliability.retryPolicy.recordCommands,
    nextHardeningRequirement: reliability.nextHardeningRequirement,
  };
}
