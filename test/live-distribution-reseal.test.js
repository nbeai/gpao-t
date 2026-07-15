import assert from "node:assert/strict";
import test from "node:test";

import { diffManifestRecords } from "../tools/reseal-live-gpao-t-distribution.mjs";

test("diffManifestRecords separates changed, missing, and unexpected paths", () => {
  const expected = [
    { path: "a.js", kind: "file", size: 1, sha256: "a" },
    { path: "gone.js", kind: "file", size: 1, sha256: "b" },
  ];
  const actual = [
    { path: "a.js", kind: "file", size: 2, sha256: "c" },
    { path: "new.js", kind: "file", size: 1, sha256: "d" },
  ];

  assert.deepEqual(diffManifestRecords(expected, actual), {
    changed: ["a.js"],
    missing: ["gone.js"],
    unexpected: ["new.js"],
  });
});
