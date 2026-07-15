import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readJsonlTail } from "../src/core/storage.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-storage-tail-"));
}

describe("GPAO-T JSONL tail storage", () => {
  it("reads recent records from a bounded byte tail", () => {
    const root = tempRoot();
    mkdirSync(root, { recursive: true });
    const file = join(root, "events.jsonl");
    const oldPayload = "오래된 이벤트 ".repeat(4000);
    const records = [
      ...Array.from({ length: 80 }, (_, index) => ({
        id: `old.${index}`,
        type: "old",
        summary: `${oldPayload}${index}`,
      })),
      { id: "recent.1", type: "recent", summary: "GPAO-T recent event one" },
      { id: "recent.2", type: "recent", summary: "GPAO-T recent event two" },
    ];
    writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\n") + "\n");

    const tail = readJsonlTail(file, { limit: 2, maxBytes: 8 * 1024 });

    assert.deepEqual(tail.map((record) => record.id), ["recent.1", "recent.2"]);
  });

  it("deduplicates from the bounded tail without scanning the full file", () => {
    const root = tempRoot();
    const file = join(root, "events.jsonl");
    const records = [
      { id: "session.main", version: 1 },
      { id: "session.side", version: 1 },
      { id: "session.main", version: 2 },
    ];
    writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\n") + "\n");

    const tail = readJsonlTail(file, { limit: 5, dedupeKey: "id", maxBytes: 8 * 1024 });

    assert.deepEqual(tail.map((record) => `${record.id}:${record.version}`), [
      "session.side:1",
      "session.main:2",
    ]);
  });
});
