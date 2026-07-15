#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { auditGpaoTCompleteSeal } from "./audit-gpao-t-complete-seal.mjs";

const LEGACY_BLOCKED_PATTERNS = [
  /GPAO for OpenClaw/g,
  /GPAO-T\/OpenClaw/g,
  /live OpenClaw dashboard absorption/g,
  /--openclaw-home/g,
  /OpenClaw보다/g,
];

const LEGACY_SCAN_TARGETS = [
  "README.md",
  "installer/README.md",
  "installer/gpao-t-macos-local.mjs",
  "runtime-workspace/gpao-t/AGENTS.md",
  "src/core",
  "test",
  "docs/05-release",
  "docs/03-engineering/GPAO-T-PHASE-2-PERSONAL-GROWTH-OS-WORK-ORDER-v0.1-ko.md",
];

export const ACTIVE_IDENTITY_TARGETS = [
  "GPAO-T-WORKSPACE-CONTRACT-v0.1-ko.md",
  "docs/00-canon/GPAO-T-SELF-GROWTH-LOOP-CONTRACT-v0.1-ko.md",
  "docs/00-canon/GPAO-T-RUNTIME-AND-ICLOUD-BOUNDARY-2026-07-13.md",
  "docs/01-product/GPAO-T-OWNER-OPERATING-GUIDE-v0.1-ko.md",
  "docs/01-product/GPAO-T-RESEARCH-FIRST-OS-STRATEGY-v0.1-ko.md",
  "docs/01-product/GPAO-T-COMPARATIVE-UX-OPERATING-PRINCIPLE-MATRIX-v0.1-ko.md",
  "docs/01-product/GPAO-T-FIRST-REAL-OS-FLOW-SCENARIO-SPEC-v0.1-ko.md",
  "docs/02-design/SCREEN-MAP.md",
  "docs/02-workflow/GPAO-T-MULTI-AGENT-OPERATING-PROTOCOL-v0.1-ko.md",
  "runtime-workspace/gpao-t/AGENTS.md",
  "runtime-workspace/gpao-t/IDENTITY.md",
  "runtime-workspace/gpao-t/SOUL.md",
  "runtime-workspace/gpao-t/MEMORY.md",
  "runtime-workspace/gpao-t/RUNTIME-MANIFEST.json",
  "src/core/runtime-workspace-welcome.js",
];

const CANONICAL_IDENTITY_PATTERN =
  /independent,?\s+local-first\s+Growth Personal AI (?:Operating System|OS)|독립적인\s+로컬 우선\s+Growth Personal AI (?:Operating System|OS)/i;
const OPENCLAW_REFERENCE_PATTERN = /OpenClaw|오픈클로/i;
const OPENCLAW_REFERENCE_CLASS_PATTERN = /OpenClaw reference class:/i;
const OPENCLAW_ALLOWED_CLASS_PATTERN =
  /third-party|제3자/i;
const OPENCLAW_ALLOWED_PURPOSE_PATTERN =
  /comparison|compatibility|migration|legal attribution|비교|호환|마이그레이션|이행|법적 귀속/i;

const RELEASE_MATURITY_PATTERNS = [
  { id: "test_team_maturity", pattern: /\btest[- ]team\b|테스트\s*팀/i },
  {
    id: "release_candidate_maturity",
    pattern: /\b(?:release|production|distribution|package|product|internal|public|supervised)\s*[-/]?\s*candidate\b/i,
  },
  {
    id: "local_candidate_maturity",
    pattern: /\b(?:local|pre-release)\s+(?:release\s+)?candidate\b/i,
  },
  { id: "candidate_document_status", pattern: /^Status:.*\bcandidate\b/i },
  { id: "candidate_maturity_ko", pattern: /출시\s*후보|릴리스\s*후보|배포\s*후보|제품\s*후보|내부\s*후보/i },
];

const OPENCLAW_FORBIDDEN_RELATIONSHIP_PATTERNS = [
  {
    id: "openclaw_body_substrate_origin_en",
    pattern: /(?:OpenClaw|오픈클로)[^.\n]*(?:\bbody\b|\bsubstrate\b|\borigin\b|\bancestor\b|\bfoundation\b)/i,
  },
  {
    id: "openclaw_body_substrate_origin_en_reverse",
    pattern: /(?:\bbody\b|\bsubstrate\b|\borigin\b|\bancestor\b|\bfoundation\b)[^.\n]*(?:OpenClaw|오픈클로)/i,
  },
  {
    id: "openclaw_body_substrate_origin_ko",
    pattern: /(?:OpenClaw|오픈클로)[^.\n]*(?:몸체|기반체|기원|조상|출발점|바탕)/i,
  },
  {
    id: "openclaw_body_substrate_origin_ko_reverse",
    pattern: /(?:몸체|기반체|기원|조상|출발점|바탕)[^.\n]*(?:OpenClaw|오픈클로)/i,
  },
  {
    id: "openclaw_built_on_relation",
    pattern: /(?:OpenClaw|오픈클로)[^.\n]*(?:built on|built by absorbing|위에|바탕으로)[^.\n]*GPAO-T/i,
  },
];

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function normalizePath(path) {
  return path.split("\\").join("/");
}

function walk(path, out = []) {
  if (!existsSync(path)) return out;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry), out);
    return out;
  }
  if (stat.isFile()) out.push(path);
  return out;
}

function scanLinePatterns({ root, file, patterns }) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let index = 0; index < lines.length; index += 1) {
    for (const item of patterns) {
      item.pattern.lastIndex = 0;
      if (!item.pattern.test(lines[index])) continue;
      hits.push({
        file: normalizePath(relative(root, file)),
        line: index + 1,
        rule: item.id,
        pattern: item.pattern.source,
        text: lines[index].trim(),
      });
    }
  }
  return hits;
}

function scanActiveIdentitySurfaces({ root, targets }) {
  const hits = [];
  for (const target of targets) {
    const file = join(root, target);
    if (!existsSync(file)) {
      hits.push({ file: target, line: 0, rule: "active_identity_surface_missing", text: "" });
      continue;
    }

    const text = readFileSync(file, "utf8");
    if (!CANONICAL_IDENTITY_PATTERN.test(text)) {
      hits.push({
        file: target,
        line: 0,
        rule: "canonical_independent_identity_missing",
        pattern: CANONICAL_IDENTITY_PATTERN.source,
        text: "",
      });
    }

    if (OPENCLAW_REFERENCE_PATTERN.test(text)) {
      const marker = text.split(/\r?\n/).find((line) => OPENCLAW_REFERENCE_CLASS_PATTERN.test(line));
      if (
        !marker ||
        !OPENCLAW_ALLOWED_CLASS_PATTERN.test(marker) ||
        !OPENCLAW_ALLOWED_PURPOSE_PATTERN.test(marker)
      ) {
        hits.push({
          file: target,
          line: marker ? text.split(/\r?\n/).indexOf(marker) + 1 : 0,
          rule: "openclaw_reference_class_missing_or_invalid",
          text: marker?.trim() || "",
        });
      }
    }

    hits.push(...scanLinePatterns({ root, file, patterns: RELEASE_MATURITY_PATTERNS }));
    hits.push(...scanLinePatterns({ root, file, patterns: OPENCLAW_FORBIDDEN_RELATIONSHIP_PATTERNS }));
  }
  return hits;
}

function scanLegacyPatterns({ root, targets }) {
  const files = targets
    .flatMap((target) => walk(join(root, target)))
    .filter((file) => /\.(mjs|js|json|md|txt|yml|yaml)$/.test(file));
  const patterns = LEGACY_BLOCKED_PATTERNS.map((pattern) => ({
    id: "legacy_identity_leak",
    pattern,
  }));
  return {
    files,
    hits: files.flatMap((file) => scanLinePatterns({ root, file, patterns })),
  };
}

export async function auditGpaoTIdentitySeal({
  repoRoot = process.cwd(),
  liveRoot,
  includeLive = true,
  includeCompleteSeal = true,
  activeTargets = ACTIVE_IDENTITY_TARGETS,
  legacyScanTargets = LEGACY_SCAN_TARGETS,
} = {}) {
  const root = resolve(repoRoot);
  const legacy = scanLegacyPatterns({ root, targets: legacyScanTargets });
  const activeSurfaceHits = scanActiveIdentitySurfaces({ root, targets: activeTargets });
  const activeTargetSet = new Set(activeTargets.map(normalizePath));
  const completeSeal = includeCompleteSeal
    ? await auditGpaoTCompleteSeal({ repoRoot: root, liveRoot, includeLive })
    : {
        liveRoot: includeLive ? liveRoot || null : null,
        liveRootReadable: true,
        scannedLiveFileCount: 0,
        userVisibleHits: [],
      };
  const userSurfaceHits = completeSeal.userVisibleHits.filter((hit) => {
    const path = normalizePath(hit.path || "");
    return !(
      hit.target === "repo" &&
      hit.pattern === "openclaw_name" &&
      activeTargetSet.has(path)
    );
  });
  const status =
    legacy.hits.length ||
    activeSurfaceHits.length ||
    userSurfaceHits.length ||
    !completeSeal.liveRootReadable
      ? "blocked"
      : "ready";

  return {
    schema: "gpao_t.identity_seal_audit.v0_2",
    status,
    scannedFiles: legacy.files.length,
    activeSurfaceCount: activeTargets.length,
    blockedPatterns: LEGACY_BLOCKED_PATTERNS.map((pattern) => pattern.source),
    hits: legacy.hits,
    activeSurfaceHits,
    liveRoot: completeSeal.liveRoot,
    liveRootReadable: completeSeal.liveRootReadable,
    scannedLiveFileCount: completeSeal.scannedLiveFileCount,
    userSurfaceHits,
    completionRule:
      "Active GPAO-T surfaces must state the independent local-first Growth Personal AI OS identity; OpenClaw is limited to explicit third-party comparison, compatibility, migration, or legal attribution; release-maturity candidate/test-team wording is blocked without weakening memory, T-cell, review, or supervised execution candidates.",
  };
}

async function main() {
  const liveRoot = readArg("--live-root", "");
  const result = await auditGpaoTIdentitySeal({
    repoRoot: readArg("--repo-root", process.cwd()),
    includeLive: !hasArg("--no-live"),
    ...(liveRoot ? { liveRoot } : {}),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "ready") process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
