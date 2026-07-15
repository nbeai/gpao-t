#!/usr/bin/env node
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_LIVE_CONTROL_UI =
  process.env.GPAO_T_LIVE_CONTROL_UI ||
  "/Users/jyp/.gpao-t/current/compatibility/gpao-t/dist/control-ui";

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

function classifyHit({ relPath, line, context, patternId, target, matchedText }) {
  if (target === "live-control-ui") {
    const isAsset = relPath.startsWith("assets/") || relPath.includes("/assets/");
    if (isAsset && patternId === "openclaw_name" && matchedText === "openclaw") return "compat_internal";
    if (isAsset && patternId === "clawhub_name" && matchedText === "clawhub") return "compat_internal";
    if (
      isAsset &&
      patternId === "openclaw_name" &&
      /OPENCLAW_INTERNAL_CONTEXT|OpenClaw runtime context|OpenClaw runtime event/.test(context)
    ) {
      return "compat_internal";
    }
    if (isAsset) return "user_visible";
    if (COMPAT_INTERNAL_MARKERS.some((marker) => relPath.includes(marker))) return "compat_internal";
    return "review";
  }

  if (relPath === "docs/05-release/GPAO-T-NEXT-CHAT-WORK-ORDER-2026-07-14.md") {
    return "technical_provenance";
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
      for (const match of line.matchAll(item.pattern)) {
        const column = (match.index ?? 0) + 1;
        const contextStart = Math.max(0, column - 81);
        const contextEnd = Math.min(line.length, column - 1 + match[0].length + 160);
        const context = line.slice(contextStart, contextEnd).trim();
        hits.push({
          target,
          path: relPath,
          line: index + 1,
          column,
          pattern: item.id,
          classification: classifyHit({
            relPath,
            line,
            context,
            patternId: item.id,
            target,
            matchedText: match[0],
          }),
          text: context,
        });
      }
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
  return { files, hits };
}

export async function auditGpaoTCompleteSeal({
  repoRoot = process.cwd(),
  liveRoot = DEFAULT_LIVE_CONTROL_UI,
  includeLive = true,
} = {}) {
  const repoHits = await scanRepo({ repoRoot });
  const liveScan = includeLive
    ? await scanLiveControlUi({ liveRoot })
    : { files: [], hits: [] };
  const liveHits = liveScan.hits;
  const hits = [...repoHits, ...liveHits];
  const counts = hits.reduce((acc, hit) => {
    acc[hit.classification] = (acc[hit.classification] || 0) + 1;
    return acc;
  }, {});
  const userVisibleHits = hits.filter((hit) => hit.classification === "user_visible");
  const liveRootReadable = !includeLive || liveScan.files.length > 0;
  return {
    schema: "gpao_t.complete_seal_audit.v1",
    generatedAt: new Date().toISOString(),
    repoRoot,
    liveRoot: includeLive ? liveRoot : null,
    status: !liveRootReadable || userVisibleHits.length ? "blocked" : "ready",
    liveRootReadable,
    scannedLiveFileCount: liveScan.files.length,
    auditErrors: liveRootReadable
      ? []
      : [{ id: "live_control_ui_missing", path: liveRoot }],
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
