#!/usr/bin/env node
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIVE_CONTROL_UI =
  process.env.GPAO_T_LIVE_CONTROL_UI ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".html",
  ".css",
  ".svg",
  ".txt",
  ".webmanifest",
]);

const FORBIDDEN_PATTERNS = [
  { id: "openclaw_name", pattern: /\bOpenClaw\b|\bopenclaw\b/g },
  { id: "control_ui_name", pattern: /\bControl UI\b/g },
  { id: "clawhub_name", pattern: /\bClawHub\b|\bclawhub\b/g },
  { id: "legacy_mascot_en", pattern: /\blobster\b|\bLobster\b|\breef\b|\bclaws\b/g },
  { id: "legacy_mascot_ko", pattern: /바닷가재|산호초|집게/g },
  { id: "openclaw_docs_url", pattern: /docs\.openclaw\.ai/g },
];

const DEFAULT_SCAN_TARGETS = [
  "bin",
  "src",
  "tools",
  "runtime-workspace",
  "docs/01-product",
  "docs/02-design",
  "docs/03-engineering",
  "docs/04-skill-ecosystem",
  "docs/05-release",
  "test",
];

const EXCLUDED_PARTS = new Set([
  ".git",
  "node_modules",
  "docs/03-verification/evidence",
  "docs/99-out-of-scope",
  ".gpao-t/packages",
]);

const USER_SURFACE_PATH_MARKERS = [
  "bin/gpao-t.js",
  "docs/05-release/",
  "runtime-workspace/",
  "src/core/control-center",
  "src/core/workspace-shell",
  "src/core/browser-local-app-shell",
  "src/core/core-work-surface",
  "src/core/context-mesh-replay",
  "src/core/memory-candidate-review-queue",
  "src/core/model-invocation",
  "src/core/runtime-workspace-welcome",
];

const TECHNICAL_PROVENANCE_MARKERS = [
  "docs/00-canon/",
  "docs/01-product/GPAO-T-COMPETITIVE-RESEARCH",
  "docs/03-engineering/",
  "docs/04-skill-ecosystem/",
  "src/core/openclaw-absorption-control.js",
  "tools/",
  "test/",
];

const COMPAT_INTERNAL_MARKERS = [
  "sw.js",
  "index.html",
  "assets/index-",
  "assets/debug-page",
  "assets/usage-page",
];

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function normalizeRel(path) {
  return path.split("\\").join("/");
}

function isExcluded(relPath) {
  return [...EXCLUDED_PARTS].some((part) => relPath === part || relPath.startsWith(`${part}/`));
}

function shouldReadFile(file) {
  return TEXT_EXTENSIONS.has(extname(file)) || file.endsWith(".webmanifest");
}

async function collectFiles(root, base = root) {
  const entries = await readdir(root).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry);
    const relPath = normalizeRel(relative(base, path));
    if (isExcluded(relPath)) continue;
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) {
      files.push(...await collectFiles(path, base));
    } else if (info.isFile() && shouldReadFile(path)) {
      files.push(path);
    }
  }
  return files;
}

function classifyHit({ relPath, line, patternId, target }) {
  if (target === "live-control-ui") {
    if (relPath.includes("/assets/") && /OpenClaw mobile|Official OpenClaw|ClawHub|docs\.openclaw|openclaw doctor|openclaw models auth|openclaw dashboard/.test(line)) {
      return "user_visible";
    }
    if (COMPAT_INTERNAL_MARKERS.some((marker) => relPath.includes(marker))) return "compat_internal";
    return "review";
  }

  if (USER_SURFACE_PATH_MARKERS.some((marker) => relPath.includes(marker))) {
    if (/source|substrate|provenance|upstream|compat|호환|기술|출처|상속|재료/.test(line)) {
      return "technical_provenance";
    }
    if (patternId === "openclaw_name" && /sourceType|openclaw_session|openclaw_memory|openclaw_web|@openclaw|openclaw-absorption/.test(line)) {
      return "compat_internal";
    }
    return "user_visible";
  }

  if (TECHNICAL_PROVENANCE_MARKERS.some((marker) => relPath.includes(marker))) return "technical_provenance";
  return "review";
}

async function scanFile({ file, repoRoot, target }) {
  const source = await readFile(file, "utf8").catch(() => "");
  const relPath = normalizeRel(relative(repoRoot, file));
  const hits = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const item of FORBIDDEN_PATTERNS) {
      item.pattern.lastIndex = 0;
      if (!item.pattern.test(line)) continue;
      hits.push({
        target,
        path: relPath,
        line: index + 1,
        pattern: item.id,
        classification: classifyHit({ relPath, line, patternId: item.id, target }),
        text: line.trim().slice(0, 240),
      });
    }
  });
  return hits;
}

async function scanRepo({ repoRoot }) {
  const hits = [];
  for (const target of DEFAULT_SCAN_TARGETS) {
    const root = join(repoRoot, target);
    const files = await collectFiles(root, repoRoot);
    for (const file of files) {
      hits.push(...await scanFile({ file, repoRoot, target: "repo" }));
    }
  }
  return hits;
}

async function scanLiveControlUi({ liveRoot }) {
  const files = await collectFiles(liveRoot, liveRoot);
  const hits = [];
  for (const file of files) {
    hits.push(...await scanFile({ file, repoRoot: liveRoot, target: "live-control-ui" }));
  }
  return hits;
}

export async function auditGpaoTCompleteSeal({
  repoRoot = process.cwd(),
  liveRoot = DEFAULT_LIVE_CONTROL_UI,
  includeLive = true,
} = {}) {
  const repoHits = await scanRepo({ repoRoot });
  const liveHits = includeLive ? await scanLiveControlUi({ liveRoot }) : [];
  const hits = [...repoHits, ...liveHits];
  const counts = hits.reduce((acc, hit) => {
    acc[hit.classification] = (acc[hit.classification] || 0) + 1;
    return acc;
  }, {});
  const userVisibleHits = hits.filter((hit) => hit.classification === "user_visible");
  return {
    schema: "gpao_t.complete_seal_audit.v1",
    generatedAt: new Date().toISOString(),
    repoRoot,
    liveRoot: includeLive ? liveRoot : null,
    status: userVisibleHits.length ? "blocked" : "ready",
    counts,
    userVisibleHitCount: userVisibleHits.length,
    hitCount: hits.length,
    userVisibleHits,
    hits,
    completionRule:
      "status is ready only when no forbidden OpenClaw-derived product identity appears in user-visible surfaces.",
  };
}

async function main() {
  const repoRoot = readArg("--repo-root", process.cwd());
  const liveRoot = readArg("--live-root", DEFAULT_LIVE_CONTROL_UI);
  const includeLive = !hasArg("--no-live");
  const strict = hasArg("--strict");
  const out = readArg("--out", "");
  const audit = await auditGpaoTCompleteSeal({ repoRoot, liveRoot, includeLive });
  const json = `${JSON.stringify(audit, null, 2)}\n`;
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, json);
  }
  console.log(json);
  if (strict && audit.status !== "ready") {
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
