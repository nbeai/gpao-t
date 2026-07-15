import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { createGrowthProposal, evaluateGrowthReplay, GROWTH_LIMITS } from "../src/core/growth-engine.js";
import { StateStore } from "../src/core/store.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { createHttpServer } from "../src/core/http.js";
import { mctSurfacePayloadFindings } from "../src/core/mct-contract.js";
import { proposalInput } from "./fixtures/mct-r3-cases.js";

const schema = JSON.parse(fs.readFileSync(new URL("../src/schemas/mct-contract.v1.schema.json", import.meta.url), "utf8"));
const validate = new Ajv2020({ strict: false }).compile(schema);
const defaultPolicy = Object.freeze({ maxAnchors: 3, maxSupporting: 6, relevanceThreshold: 0.15, anchorThreshold: 0.15 });
const defaultSnapshot = canonicalDigest("gpao_t3.growth_policy_snapshot.v1", defaultPolicy);
function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r3-")); }
function assertCanonical(record) { assert.equal(validate(record), true, JSON.stringify(validate.errors)); }

test("MCT-R3 requires distinct repeated evidence and emits an R0-canonical proposal", () => {
  assert.throws(() => createGrowthProposal(proposalInput({ observations: proposalInput().observations.slice(0, 1) })), error => error.code === "growth_recurrence_required");
  assert.throws(() => createGrowthProposal(proposalInput({ observations: [proposalInput().observations[0], { ...proposalInput().observations[1], traceRef: proposalInput().observations[0].traceRef }] })), error => error.code === "growth_recurrence_required");
  const bundle = createGrowthProposal(proposalInput());
  assertCanonical(bundle.record);
  assert.equal(bundle.record.status, "review_required");
  assert.equal(bundle.record.replayCaseIds.length, 2);
  assert.equal(bundle.detail.recurrenceCount, 2);
});

test("MCT-R3 replay uses only sealed server fixtures and blocks non-improvement", () => {
  const proposal = createGrowthProposal(proposalInput());
  const replay = evaluateGrowthReplay({ proposal: proposal.record, detail: proposal.detail, datasetSplit: "evaluation" });
  assertCanonical(replay.record);
  assert.equal(replay.record.passed, true);
  assert.equal(replay.detail.sealed, true);
  assert.equal(replay.detail.fixtureDigest, canonicalDigest("gpao_t3.sealed_growth_replay.v1", replay.detail.cases));
  const ineffective = createGrowthProposal(proposalInput({ proposedChange: { maxAnchors: 3, relevanceThreshold: 0.15 } }));
  assert.equal(evaluateGrowthReplay({ proposal: ineffective.record, detail: ineffective.detail }).record.passed, false);
  assert.throws(() => createGrowthProposal(proposalInput({ proposedChange: { maxAnchors: -100, relevanceThreshold: 999 } })), error => error.code === "growth_policy_value_invalid");
  assert.throws(() => evaluateGrowthReplay({ proposal: proposal.record, detail: proposal.detail, datasetSplit: "client-invented" }), error => error.code === "growth_replay_split_invalid");
});

test("MCT-R3 persists canonical records, requires A2, survives restart, and verifies rollback separately", () => {
  const dir = stateDir();
  let store = new StateStore(dir);
  try {
    const proposal = store.saveGrowthProposal(createGrowthProposal(proposalInput()));
    const replay = store.saveGrowthReplayResult(evaluateGrowthReplay({ proposal: proposal.record, detail: proposal.detail }));
    assert.throws(() => store.transaction(() => store.applyGrowthMutation(proposal.record.id, replay.record.id, { ownerId: "owner:a", snapshotDigest: defaultSnapshot, snapshotPolicy: defaultPolicy })), error => error.code === "growth_approval_required");
    assert.throws(() => store.transaction(() => store.reviewGrowthProposal(proposal.record.id, "approved", { principalId: "owner:b", decisionClass: "A2" })), error => error.code === "growth_a2_required");
    const approved = store.transaction(() => store.reviewGrowthProposal(proposal.record.id, "approved", { principalId: "owner:a", decisionClass: "A2" }));
    const applied = store.transaction(() => store.applyGrowthMutation(proposal.record.id, replay.record.id, { ownerId: "owner:a", ttlMs: Number.MAX_SAFE_INTEGER, snapshotDigest: defaultSnapshot, snapshotPolicy: defaultPolicy }));
    for (const record of [approved.record, replay.record, applied.mutation.record, applied.rollbackReceipt.record]) assertCanonical(record);
    assert.equal(applied.mutation.record.expiresAt - applied.mutation.record.createdAt, GROWTH_LIMITS.maxCanaryTtlMs);
    store.close(); store = new StateStore(dir);
    assert.equal(store.listGrowthMutations("owner:a", { activeOnly: true }).mutations.length, 1);
    assert.throws(() => store.transaction(() => store.rollbackGrowthMutation(applied.mutation.record.id, { ownerId: "owner:b", reason: "forbidden" })), error => error.code === "growth_mutation_not_found");
    const pending = store.transaction(() => store.rollbackGrowthMutation(applied.mutation.record.id, { ownerId: "owner:a", reason: "post_replay_regression" }));
    assert.equal(pending.rollbackReceipt.record.verified, false);
    const verified = store.transaction(() => store.verifyGrowthRollback(applied.mutation.record.id, { ownerId: "owner:a", projectionPurge: true, snapshotRestored: true, postRollbackReplay: true }));
    assert.equal(verified.record.verified, true);
    assert.equal(verified.record.projectionPurge, true);
    assertCanonical(verified.record);
    assert.equal(store.listGrowthMutations("owner:a", { activeOnly: true }).mutations.length, 0);
  } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("MCT-R3 public projections expose only sealed SurfaceEvent payloads", () => {
  const proposal = createGrowthProposal(proposalInput()).record;
  const replay = evaluateGrowthReplay({ proposal, detail: createGrowthProposal(proposalInput()).detail }).record;
  assert.deepEqual(mctSurfacePayloadFindings("growth.proposed", { proposalId: proposal.id, scope: proposal.scope.level, approvalState: proposal.status }), []);
  assert.deepEqual(mctSurfacePayloadFindings("growth.replayed", { proposalId: proposal.id, replayResultId: replay.id, passed: replay.passed }), []);
  assert.deepEqual(mctSurfacePayloadFindings("growth.proposed", { proposalId: proposal.id, scope: proposal.scope.level, approvalState: proposal.status, diagnosis: proposal.diagnosis }), ["unsupported:diagnosis"]);
});

test("MCT-R3 HTTP rejects client replay metrics and proves apply-turn-rollback-turn restoration", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  const { server } = createHttpServer(runtime, { port: 0 }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`); const cookie = dashboard.headers.get("set-cookie");
    const headers = { cookie, origin: base, "content-type": "application/json" };
    const input = proposalInput({ ownerId: undefined, scope: { level: "session", sessionId: "56a09944-c239-4a14-a2c0-70d58a3f1fa0" } }); delete input.ownerId;
    const proposed = await fetch(`${base}/v1/growth/proposals`, { method: "POST", headers, body: JSON.stringify(input) }).then(response => response.json());
    const proposalId = proposed.proposal.id;
    const forged = await fetch(`${base}/v1/growth/proposals/${proposalId}/replay`, { method: "POST", headers, body: JSON.stringify({ scenarios: [{ fixed: true, candidate: { quality: 1 } }] }) });
    assert.equal(forged.status, 400);
    assert.equal((await forged.json()).code, "growth_replay_client_metrics_forbidden");
    const replayed = await fetch(`${base}/v1/growth/proposals/${proposalId}/replay`, { method: "POST", headers, body: "{}" }).then(response => response.json());
    assert.equal(replayed.replayResult.passed, true);
    assert.equal((await fetch(`${base}/v1/growth/proposals/${proposalId}/apply`, { method: "POST", headers, body: JSON.stringify({ approved: true, replayResultId: replayed.replayResult.id }) })).status, 409);
    await fetch(`${base}/v1/growth/proposals/${proposalId}/review`, { method: "POST", headers, body: JSON.stringify({ approved: true }) });
    const applied = await fetch(`${base}/v1/growth/proposals/${proposalId}/apply`, { method: "POST", headers, body: JSON.stringify({ approved: true, replayResultId: replayed.replayResult.id, ttlMs: 60_000 }) }).then(response => response.json());
    const canaryTurn = await fetch(`${base}/v1/os-turns`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ requestId: "growth-canary-turn", sessionId: input.scope.sessionId, input: "현재 요청을 우선해줘" }) }).then(response => response.json());
    assert.deepEqual(canaryTurn.growthPolicy.mutationIds, [applied.mutation.id]);
    const rolledBack = await fetch(`${base}/v1/growth/mutations/${applied.mutation.id}/rollback`, { method: "POST", headers, body: JSON.stringify({ approved: true, reason: "user_requested" }) }).then(response => response.json());
    assert.equal(rolledBack.rollbackReceipt.verified, true);
    const restoredTurn = await fetch(`${base}/v1/os-turns`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ requestId: "growth-restored-turn", sessionId: input.scope.sessionId, input: "현재 요청을 우선해줘" }) }).then(response => response.json());
    assert.deepEqual(restoredTurn.growthPolicy.mutationIds, []);
  } finally { await new Promise(resolve => server.close(resolve)); await runtime.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("MCT-R3 expiry permits reapply and auxiliary-column tampering fails integrity and ownership", () => {
  const dir = stateDir(); const store = new StateStore(dir);
  try {
    const proposal = store.saveGrowthProposal(createGrowthProposal(proposalInput()));
    const replay = store.saveGrowthReplayResult(evaluateGrowthReplay({ proposal: proposal.record, detail: proposal.detail }));
    store.transaction(() => store.reviewGrowthProposal(proposal.record.id, "approved", { principalId: "owner:a", decisionClass: "A2" }));
    const first = store.transaction(() => store.applyGrowthMutation(proposal.record.id, replay.record.id, { ownerId: "owner:a", ttlMs: 10, snapshotDigest: defaultSnapshot, snapshotPolicy: defaultPolicy }));
    store.db.prepare("UPDATE mct_mutation_ledger SET expires_at = 0 WHERE mutation_id = ?").run(first.mutation.record.id);
    assert.throws(() => store.transaction(() => store.applyGrowthMutation(proposal.record.id, replay.record.id, { ownerId: "owner:a", ttlMs: 10, snapshotDigest: defaultSnapshot, snapshotPolicy: defaultPolicy })), error => error.code === "growth_expiry_reconciliation_required");
    store.db.prepare("UPDATE mct_mutation_ledger SET expires_at = ? WHERE mutation_id = ?").run(first.mutation.record.expiresAt, first.mutation.record.id);
    store.transaction(() => store.expireGrowthMutations(first.mutation.record.expiresAt + 1));
    const second = store.transaction(() => store.applyGrowthMutation(proposal.record.id, replay.record.id, { ownerId: "owner:a", ttlMs: 10, snapshotDigest: defaultSnapshot, snapshotPolicy: defaultPolicy }));
    assert.notEqual(second.mutation.record.id, first.mutation.record.id);
    store.db.prepare("UPDATE mct_mutation_ledger SET owner_id = 'owner:b' WHERE mutation_id = ?").run(second.mutation.record.id);
    assert.throws(() => store.verifyIntegrity(), error => error.code === "growth_journal_integrity_failed");
    assert.throws(() => store.transaction(() => store.rollbackGrowthMutation(second.mutation.record.id, { ownerId: "owner:b", reason: "forged_owner" })), error => error.code === "growth_mutation_not_found");
  } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("MCT-R3 runtime verifies an expired rollback before reapplying the same proposal", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const input = proposalInput(); delete input.now;
    const proposed = await runtime.proposeGrowth("owner:a", input);
    const replayed = await runtime.replayGrowth("owner:a", proposed.proposal.id);
    await runtime.reviewGrowth("owner:a", proposed.proposal.id, true);
    const first = await runtime.applyGrowth("owner:a", proposed.proposal.id, replayed.replayResult.id, 1);
    await new Promise(resolve => setTimeout(resolve, Math.max(2, first.mutation.expiresAt - Date.now() + 2)));
    const second = await runtime.applyGrowth("owner:a", proposed.proposal.id, replayed.replayResult.id, 60_000);
    assert.notEqual(second.mutation.id, first.mutation.id);
    const expiredReceipt = await runtime.writer.call("getRollbackReceiptBundle", { receiptId: first.rollbackReceipt.id });
    assert.equal(expiredReceipt.record.verified, true);
    assert.equal(expiredReceipt.detail.postRollbackReplay, true);
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("MCT-R3 replays each canary against the active baseline and composes chronologically", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const firstInput = proposalInput({ proposedChange: { maxAnchors: 2 } }); delete firstInput.now;
    const secondInput = proposalInput({ proposedChange: { relevanceThreshold: 0.2 } }); delete secondInput.now;
    const firstProposal = await runtime.proposeGrowth("owner:a", firstInput);
    const firstReplay = await runtime.replayGrowth("owner:a", firstProposal.proposal.id);
    await runtime.reviewGrowth("owner:a", firstProposal.proposal.id, true);
    const first = await runtime.applyGrowth("owner:a", firstProposal.proposal.id, firstReplay.replayResult.id, 60_000);
    const secondProposal = await runtime.proposeGrowth("owner:a", secondInput);
    const secondReplay = await runtime.replayGrowth("owner:a", secondProposal.proposal.id);
    await runtime.reviewGrowth("owner:a", secondProposal.proposal.id, true);
    const second = await runtime.applyGrowth("owner:a", secondProposal.proposal.id, secondReplay.replayResult.id, 60_000);
    const projected = runtime.growthAdmissionPolicy({ userId: "owner:a", projectId: "project-t3" });
    assert.equal(projected.policy.maxAnchors, 2);
    assert.equal(projected.policy.relevanceThreshold, 0.2);
    assert.equal(projected.policy.anchorThreshold, 0.2);
    assert.deepEqual(projected.mutationIds, [first.mutation.id, second.mutation.id]);
    assert.ok(second.mutation.createdAt > first.mutation.createdAt);
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("MCT-R3 rejects a replay when another canary changes its sealed baseline", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const firstInput = proposalInput({ proposedChange: { maxAnchors: 2 } }); delete firstInput.now;
    const staleInput = proposalInput({ proposedChange: { relevanceThreshold: 0.2 } }); delete staleInput.now;
    const firstProposal = await runtime.proposeGrowth("owner:a", firstInput);
    const firstReplay = await runtime.replayGrowth("owner:a", firstProposal.proposal.id);
    const staleProposal = await runtime.proposeGrowth("owner:a", staleInput);
    const staleReplay = await runtime.replayGrowth("owner:a", staleProposal.proposal.id);
    await runtime.reviewGrowth("owner:a", firstProposal.proposal.id, true);
    await runtime.applyGrowth("owner:a", firstProposal.proposal.id, firstReplay.replayResult.id, 60_000);
    await runtime.reviewGrowth("owner:a", staleProposal.proposal.id, true);
    await assert.rejects(
      runtime.applyGrowth("owner:a", staleProposal.proposal.id, staleReplay.replayResult.id, 60_000),
      error => error.code === "growth_replay_baseline_changed"
    );
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});
