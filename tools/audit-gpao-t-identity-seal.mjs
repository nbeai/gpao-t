#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());

const BLOCKED_PATTERNS = [
  /GPAO for OpenClaw/g,
  /GPAO-T\/OpenClaw/g,
  /live OpenClaw dashboard absorption/g,
  /--openclaw-home/g,
  /OpenClaw보다/g,
];

const SCAN_TARGETS = [
  "README.md",
  "installer/README.md",
  "installer/gpao-t-macos-local.mjs",
  "runtime-workspace/gpao-t/AGENTS.md",
  "src/core",
  "test",
  "docs/05-release",
  "docs/03-engineering/GPAO-T-PHASE-2-PERSONAL-GROWTH-OS-WORK-ORDER-v0.1-ko.md",
];

function walk(path, out = []) {
  if (!existsSync(path)) return out;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    const { readdirSync } = awaitFs();
    for (const entry of readdirSync(path)) walk(join(path, entry), out);
    return out;
  }
  if (stat.isFile()) out.push(path);
  return out;
}

function awaitFs() {
  return { readdirSync: globalThis.__gpaoReaddirSync || requireFs().readdirSync };
}

function requireFs() {
  return globalThis.__gpaoFs || (globalThis.__gpaoFs = Object.fromEntries([]));
}

// Avoid CommonJS require in runtime code; this small dynamic import keeps the
// audit script ESM while keeping walk simple.
const { readdirSync } = await import("node:fs");
globalThis.__gpaoReaddirSync = readdirSync;

const files = SCAN_TARGETS.flatMap((target) => walk(join(root, target))).filter((file) =>
  /\.(mjs|js|json|md|txt|yml|yaml)$/.test(file),
);

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[index])) {
        hits.push({
          file: relative(root, file),
          line: index + 1,
          pattern: pattern.source,
          text: lines[index].trim(),
        });
      }
    }
  }
}

const result = {
  schema: "gpao_t.identity_seal_audit.v0_1",
  status: hits.length ? "blocked" : "ready",
  scannedFiles: files.length,
  blockedPatterns: BLOCKED_PATTERNS.map((pattern) => pattern.source),
  hits,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (hits.length) process.exitCode = 1;
