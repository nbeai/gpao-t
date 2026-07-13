import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildMemoryContextHeart,
  verifyMemoryContextHeart,
} from "../src/core/memory-context-heart.js";
import {
  buildMemorySearchIndex,
} from "../src/core/memory-search.js";

function tempRuntime() {
  return mkdtempSync(join(tmpdir(), "gpao-t-memory-heart-"));
}

test("Memory/Context Heart proves local memory search without external embedding quota", () => {
  const stateDir = tempRuntime();
  mkdirSync(join(stateDir, "memory"), { recursive: true });
  writeFileSync(join(stateDir, "memory", "wiki.json"), `${JSON.stringify({
    schema: "gpao_t.memory_wiki.v0_1",
    status: "local_candidate_store",
    entries: [{
      id: "mem.gpao-t.context",
      title: "GPAO-T context memory",
      body: "GPAO-T must keep local memory search alive without external embedding quota.",
      tags: ["gpao-t", "memory"],
      createdAt: "2026-07-13T00:00:00.000Z",
    }],
  })}\n`);
  buildMemorySearchIndex({ stateDir });

  const heart = buildMemoryContextHeart({
    root: stateDir,
    stateDir,
    query: "external embedding quota",
  });

  assert.equal(heart.search.externalQuotaRequired, false);
  assert.equal(heart.search.provider, "local_hash");
  assert.equal(heart.search.resultCount > 0, true);
  assert.ok(heart.observations.some((item) => item.id === "local_memory_search_available"));
  assert.equal(verifyMemoryContextHeart({ heart }).status, "ready");
});

test("Memory/Context Heart reports degraded sources without weakening authority boundaries", () => {
  const heart = buildMemoryContextHeart({
    memoryStatus: {
      status: "ready",
      baselineSearch: "available_after_index",
      embeddingSearch: {
        externalQuotaRequired: false,
        provider: "local_hash",
      },
      index: { documents: 3 },
      sources: [{ id: "workspace_memory", status: "degraded" }],
    },
    memoryIndex: { status: "ready", counts: { documents: 3 } },
    searchResult: { status: "ready", results: [{ id: "memdoc.1" }] },
    reviewQueueSummary: {
      status: "ready",
      counts: { records: 0 },
      authority: {
        durableMemoryPromotion: "blocked",
        compatibilityMemoryWrite: "blocked",
        externalSend: "blocked",
        applyRequiresExplicitApproval: true,
      },
    },
    autoGrowthSummary: {
      status: "empty",
      totalRuns: 0,
      completedLocalAutoLoops: 0,
      approvalRequired: 0,
    },
    autoGrowthVerification: {
      status: "passed",
      findings: [],
    },
  });

  assert.equal(heart.status, "review");
  assert.equal(heart.severity, "P2");
  assert.ok(heart.observations.some((item) => item.id === "degraded_memory_sources_skipped"));
  assert.equal(heart.authorityBoundary.durableMemoryPromotion, "blocked");
  assert.equal(verifyMemoryContextHeart({ heart }).status, "ready");
});

test("Memory/Context Heart blocks when local search depends on external quota", () => {
  const heart = buildMemoryContextHeart({
    memoryStatus: {
      status: "needs_index",
      baselineSearch: "no_sources",
      embeddingSearch: {
        externalQuotaRequired: true,
        provider: "openai",
      },
      index: { documents: 0 },
      sources: [],
    },
    memoryIndex: { status: "missing", counts: { documents: 0 } },
    searchResult: null,
    reviewQueueSummary: {
      status: "ready",
      counts: { records: 0 },
      authority: {
        durableMemoryPromotion: "blocked",
        compatibilityMemoryWrite: "blocked",
        externalSend: "blocked",
        applyRequiresExplicitApproval: true,
      },
    },
    autoGrowthSummary: {
      status: "empty",
      totalRuns: 0,
      completedLocalAutoLoops: 0,
      approvalRequired: 0,
    },
    autoGrowthVerification: {
      status: "passed",
      findings: [],
    },
  });

  const verification = verifyMemoryContextHeart({ heart });
  assert.equal(verification.status, "blocked");
  assert.ok(verification.findings.includes("external_embedding_quota_required"));
  assert.ok(verification.findings.includes("local_memory_search_not_available"));
});
