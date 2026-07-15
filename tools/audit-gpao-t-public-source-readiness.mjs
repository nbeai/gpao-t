#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

const SCAN_TARGETS = [
  "README.md",
  "package.json",
  "bin",
  "config",
  "docs",
  "installer",
  "runtime-workspace",
  "src",
  "test",
  "tools",
  "workspace-notes",
];

const IDENTITY_SCAN_TARGETS = [
  "README.md",
  "docs/05-release",
  "docs/README.md",
  "installer/README.md",
  "installer/MACOS-README.md",
  "runtime-workspace",
  "src/core/model-connection-settings.js",
  "src/core/release-contract.js",
  "src/core/update-boundary.js",
  "workspace-notes/WHAT-WE-ARE-BUILDING.md",
  "workspace-notes/WHAT-IS-NOT-DONE.md",
];

const SKIP_PATH_PARTS = new Set([
  ".git",
  ".gpao-t",
  ".beai-harness",
  "node_modules",
]);

const SKIP_PREFIXES = [
  "docs/03-verification/evidence/",
  "docs/99-history/",
];

const SECRET_PATTERNS = [
  { id: "openai_key", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { id: "github_token", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { id: "slack_token", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { id: "google_api_key", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { id: "private_key", pattern: /BEGIN (?:RSA|OPENSSH|PRIVATE) KEY/ },
  { id: "bearer_token", pattern: /Bearer\s+[A-Za-z0-9._-]{24,}/ },
  { id: "raw_gateway_token", pattern: /"token"\s*:\s*"[A-Za-z0-9_-]{48,}"/ },
  { id: "telegram_bot_token", pattern: /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/ },
];

const MODEL_OR_USER_FACING_OPENCLAW_PATTERNS = [
  { id: "openclaw_context_guard", pattern: /OpenClaw is (?:capped|using the configured model context limit)/ },
  { id: "openclaw_configure_guidance", pattern: /`openclaw configure`|openclaw models auth login/ },
  { id: "openclaw_identity_prompt", pattern: /personal agent running inside OpenClaw|## OpenClaw Agent Soul/ },
  { id: "openclaw_product_surface", pattern: /Official OpenClaw|OpenClaw mobile|docs\.openclaw\.ai/ },
  { id: "test_team_release_language", pattern: /\btest[- ]team\b|테스트\s*팀|release\s*candidate|릴리스\s*후보|배포\s*후보/i },
];

function normalize(path) {
  return path.split("\\").join("/");
}

function walk(root, current = root, out = []) {
  if (!existsSync(current)) return out;
  const stat = statSync(current);
  const rel = normalize(relative(root, current));
  if (rel && SKIP_PREFIXES.some((prefix) => rel.startsWith(prefix))) return out;
  if (stat.isDirectory()) {
    const name = current.split(/[\\/]/).at(-1);
    if (SKIP_PATH_PARTS.has(name)) return out;
    for (const entry of readdirSync(current)) walk(root, join(current, entry), out);
    return out;
  }
  if (stat.isFile() && /\.(?:mjs|js|json|md|txt|yml|yaml|command|plist|example)$/u.test(current)) {
    out.push(current);
  }
  return out;
}

function scanFile(root, file, patterns) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/u);
  const hits = [];
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of patterns) {
      pattern.pattern.lastIndex = 0;
      if (!pattern.pattern.test(lines[index])) continue;
      hits.push({
        file: normalize(relative(root, file)),
        line: index + 1,
        rule: pattern.id,
        text: lines[index].trim().slice(0, 240),
      });
    }
  }
  return hits;
}

function gitStatus(root) {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return { status: "unknown", lines: [] };
  return {
    status: result.stdout.trim() ? "dirty" : "clean",
    lines: result.stdout.trim().split(/\r?\n/u).filter(Boolean),
  };
}

export function auditGpaoTPublicSourceReadiness({ repoRoot = PROJECT_ROOT } = {}) {
  const root = resolve(repoRoot);
  const files = SCAN_TARGETS.flatMap((target) => walk(root, join(root, target)));
  const identityFiles = IDENTITY_SCAN_TARGETS.flatMap((target) => walk(root, join(root, target)));
  const secretHits = files.flatMap((file) => scanFile(root, file, SECRET_PATTERNS));
  const identityHits = identityFiles.flatMap((file) => scanFile(root, file, MODEL_OR_USER_FACING_OPENCLAW_PATTERNS));
  const status = gitStatus(root);
  const dirtyRiskLines = status.lines.filter((line) => {
    const path = line.slice(3);
    const code = line.slice(0, 2);
    return (code === "??" && path.startsWith("docs/03-verification/evidence/"))
      || path.startsWith(".gpao-t/")
      || path.startsWith(".beai-harness/")
      || path.includes(".DS_Store");
  });
  const blockers = [
    ...secretHits.map((hit) => ({ type: "secret", ...hit })),
    ...identityHits.map((hit) => ({ type: "identity_or_release_language", ...hit })),
    ...dirtyRiskLines.map((line) => ({ type: "dirty_public_risk", file: line.slice(3), line: 0, rule: "dirty_public_risk", text: line })),
  ];

  return {
    schema: "gpao_t.public_source_readiness.v1",
    status: blockers.length ? "blocked" : "ready",
    repoRoot: root,
    scannedFiles: files.length,
    scannedIdentitySurfaceFiles: identityFiles.length,
    git: status,
    blockerCount: blockers.length,
    blockers,
    rule:
      "Public source transition is blocked when raw secrets, model/user-facing OpenClaw identity text, test-candidate release language, dirty evidence dumps, runtime state, or local metadata are present.",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditGpaoTPublicSourceReadiness({ repoRoot: process.cwd() });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "ready") process.exitCode = 1;
}
