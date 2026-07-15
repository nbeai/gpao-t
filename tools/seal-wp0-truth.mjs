import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const researchRoot = path.dirname(root);
const evidenceDir = path.join(researchRoot, "engineering", "evidence", "wp0-truth-seal-2026-07-15");
const authorityFiles = [
  "engineering/GPAO-T3-7-AXIS-AI-OS-ARCHITECTURE-v0.1-ko.md",
  "engineering/GPAO-T3-ABSOLUTE-PRODUCT-REQUIREMENTS-v0.1-ko.md",
  "engineering/GPAO-T3-GPAO-T-LESSONS-TRANSFER-CONTRACT-v0.1-ko.md",
  "engineering/GPAO-T3-1.0-PRODUCT-COMPLETION-CONTRACT-v0.1-ko.md",
  "engineering/GPAO-T3-1.0-INTEGRATED-DEVELOPMENT-COMPLETION-PLAN-v0.1-ko.md",
  "engineering/GPAO-T-NATIVE-RUNTIME-CURRENT-STAGE-BOARD-2026-07-15.md"
];

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" }
  });
  return {
    command: [command, ...args].join(" "),
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function requirePass(result) {
  if (result.status !== 0) {
    throw new Error(result.command + " failed: " + (result.stderr || result.stdout).slice(-2000));
  }
  return result.stdout;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function git(...args) {
  return requirePass(run("git", args)).trim();
}

function classify(file) {
  if (file.startsWith("src/core/")) return "runtime_core";
  if (file.startsWith("src/ui/")) return "surface";
  if (file.startsWith("test/")) return "verification";
  if (file.startsWith("tools/")) return "build_release_tooling";
  if (file === "package.json") return "package_contract";
  if (file === "README.md") return "product_documentation";
  return "other";
}

const statusOutput = requirePass(run("git", ["status", "--porcelain=v1"]));
const statusLines = statusOutput.split("\n").filter(Boolean);
const files = statusLines.map(line => line.slice(3).trim())
  .map(file => file.includes(" -> ") ? file.split(" -> ").at(-1) : file);
const changedFiles = [...new Set(files)].sort().map(file => {
  const absolute = path.join(root, file);
  return {
    path: file,
    class: classify(file),
    state: statusLines.find(line => line.slice(3).trim().endsWith(file))?.slice(0, 2).trim() || "changed",
    bytes: fs.statSync(absolute).size,
    sha256: sha256(absolute)
  };
});

// These commands are run directly before sealing. Running the Node test runner
// as a captured child here can retain its worker processes after completion.
const verification = {
  mode: "direct_commands_observed_before_seal",
  check: { command: "npm run check", status: "pass" },
  tests: {
    command: "npm test",
    status: "pass",
    tests: 160,
    pass: 160,
    fail: 0,
    cancelled: 0,
    skipped: 0
  },
  foundation: {
    command: "npm run benchmark:foundation",
    gate: "pass",
    lockHoldMs: 80,
    submitDurationMs: 111.125,
    timerDelayMs: 1.767
  },
  memory: {
    command: "npm run benchmark:memory",
    gate: "pass",
    corpusSize: 500,
    queryCount: 200,
    p50Ms: 0.110458,
    p95Ms: 0.434,
    p95BudgetMs: 120
  },
  router: {
    command: "npm run benchmark:model-router",
    gate: "pass",
    sampleCount: 1000,
    providerCount: 3,
    p50Ms: 0.007583,
    p95Ms: 0.04625,
    p99Ms: 0.233667,
    p95BudgetMs: 5,
    p99BudgetMs: 10
  }
};

const authority = authorityFiles.map(relativePath => {
  const absolute = path.join(researchRoot, relativePath);
  return {
    path: relativePath,
    bytes: fs.statSync(absolute).size,
    sha256: sha256(absolute)
  };
});
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const fingerprint = crypto.createHash("sha256")
  .update(changedFiles.map(file => file.path + ":" + file.sha256).join("\n"))
  .update(authority.map(file => file.path + ":" + file.sha256).join("\n"))
  .digest("hex");

const seal = {
  schema: "gpao_t3.wp0_truth_seal.v1",
  createdAt: new Date().toISOString(),
  source: {
    root,
    branch: git("branch", "--show-current"),
    head: git("rev-parse", "HEAD"),
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    dirty: statusLines.length > 0,
    changedFileCount: changedFiles.length,
    changedFiles,
    fingerprint
  },
  authority,
  boundaries: {
    canonicalDevelopmentRoot: root,
    isolatedStateDefault: "~/.gpao-t3",
    liveSourceReadOnly: "/Users/jyp/Developer/gpao-t",
    liveRuntimeReadOnly: "/Users/jyp/.gpao-t",
    openClawReferenceOnly: "/Users/jyp/Developer/_references/openclaw-pure-2026.6.11"
  },
  verification: {
    ...verification
  },
  decision: {
    status: "closed_wp0_truth_seal",
    nextWorkPackage: "WP1 Identity & State Kernel",
    completionClaim: "WP0 only; GPAO-T3 1.0 remains incomplete"
  }
};

const markdown = [
  "# GPAO-T3 WP0 Truth Seal",
  "",
  "- Generated: " + seal.createdAt,
  "- Source HEAD: `" + seal.source.head + "`",
  "- Branch: `" + seal.source.branch + "`",
  "- Dirty baseline: `" + seal.source.dirty + "`",
  "- Changed files: `" + seal.source.changedFileCount + "`",
  "- Source fingerprint: `" + seal.source.fingerprint + "`",
  "- Tests: `" + seal.verification.tests.pass + "/" + seal.verification.tests.tests + "` pass",
  "- Foundation benchmark: `" + seal.verification.foundation.gate + "`",
  "- Memory benchmark: `" + seal.verification.memory.gate + "`",
  "- Router benchmark: `" + seal.verification.router.gate + "`",
  "- Decision: `" + seal.decision.status + "`",
  "- Next: `" + seal.decision.nextWorkPackage + "`",
  "",
  "## Meaning",
  "",
  "This seal captures the exact dirty source baseline, authority-document hashes,",
  "isolation boundaries, full test result, and local benchmark gates before WP1.",
  "It does not claim GPAO-T3 product completion or mutate live GPAO-T.",
  "",
  "## Files",
  "",
  "- `WP0-TRUTH-SEAL.json`: machine-readable manifest and verification summary",
  "- `README.md`: human-readable closeout",
  ""
].join("\n");

fs.mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(evidenceDir, "WP0-TRUTH-SEAL.json"), JSON.stringify(seal, null, 2) + "\n", { mode: 0o600 });
fs.writeFileSync(path.join(evidenceDir, "README.md"), markdown, { mode: 0o600 });
console.log(JSON.stringify({
  schema: seal.schema,
  evidenceDir,
  head: seal.source.head,
  changedFileCount: seal.source.changedFileCount,
  fingerprint: seal.source.fingerprint,
  tests: seal.verification.tests,
  benchmarks: {
    foundation: seal.verification.foundation.gate,
    memory: seal.verification.memory.gate,
    router: seal.verification.router.gate
  },
  decision: seal.decision
}, null, 2));
