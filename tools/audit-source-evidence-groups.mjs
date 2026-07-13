#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

const GROUP_RULES = [
  { group: "runtime_kernel", match: (path) => path.startsWith("src/core/") || path === "src/index.js" },
  { group: "cli_tools_gateway", match: (path) => path.startsWith("bin/") || path.startsWith("tools/") || path === "package.json" },
  { group: "tests", match: (path) => path.startsWith("test/") || path.startsWith("fixtures/") },
  { group: "runtime_workspace_seed", match: (path) => path.startsWith("runtime-workspace/") },
  { group: "product_docs", match: (path) => path.startsWith("docs/00-canon/") || path.startsWith("docs/01-product/") || path.startsWith("docs/02-design/") || path.startsWith("docs/02-workflow/") || path.startsWith("docs/03-engineering/") || path.startsWith("docs/04-skill-ecosystem/") || path.startsWith("docs/05-release/") || path.startsWith("workspace-notes/") || path === "README.md" || path === "docs/README.md" || path === "docs/DEVELOPMENT-PRINCIPLES.md" || /^docs\/[^/]+\.md$/.test(path) || path === "GPAO-T-WORKSPACE-CONTRACT-v0.1-ko.md" },
  { group: "curated_evidence", match: (path) => path.startsWith("docs/03-verification/evidence/") && /\.(md|json|png|jpg|jpeg)$/.test(path) && !path.includes("/live-backups/") },
  { group: "generated_evidence", match: (path) => path.startsWith("docs/03-verification/evidence/live-backups/") || path.startsWith("docs/03-verification/evidence/live-") || path.includes("/backups/") || path.endsWith(".before") },
  { group: "verification_docs", match: (path) => path.startsWith("docs/03-verification/") },
  { group: "out_of_scope", match: (path) => path.startsWith("docs/99-out-of-scope/") },
  { group: "repo_hygiene", match: (path) => path === ".gitignore" },
];

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function parsePorcelainLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3);
  const arrow = " -> ";
  const path = rawPath.includes(arrow) ? rawPath.split(arrow).at(-1) : rawPath;
  return { status, path };
}

export function classifyPath(path) {
  const normalized = path.split("\\").join("/");
  const rule = GROUP_RULES.find((item) => item.match(normalized));
  return rule ? rule.group : "needs_review";
}

export function classifyStatusLines(lines) {
  const entries = lines.filter(Boolean).map((line) => {
    const parsed = parsePorcelainLine(line);
    return {
      ...parsed,
      group: classifyPath(parsed.path),
    };
  });
  const groups = entries.reduce((acc, entry) => {
    if (!acc[entry.group]) acc[entry.group] = { count: 0, paths: [] };
    acc[entry.group].count += 1;
    acc[entry.group].paths.push(entry.path);
    return acc;
  }, {});
  return { entries, groups };
}

export function buildSourceEvidenceGroupAudit({ porcelain, repoRoot = REPO_ROOT } = {}) {
  const lines = (porcelain || "").split(/\r?\n/);
  const { entries, groups } = classifyStatusLines(lines);
  const needsReview = groups.needs_review?.count || 0;
  return {
    schema: "gpao_t.source_evidence_group_audit.v0_1",
    generatedAt: new Date().toISOString(),
    repoRoot,
    status: needsReview ? "review" : "ready",
    entryCount: entries.length,
    groupCounts: Object.fromEntries(Object.entries(groups).map(([group, value]) => [group, value.count])),
    groups,
    commitOrder: [
      "repo_hygiene",
      "runtime_kernel",
      "cli_tools_gateway",
      "tests",
      "runtime_workspace_seed",
      "product_docs",
      "verification_docs",
      "curated_evidence",
    ],
    excludeFromNormalCommit: ["generated_evidence", "out_of_scope"],
    completionRule:
      "ready means every current git status entry is assigned to a review lane. It does not stage or commit files.",
  };
}

async function main() {
  const repoRoot = readArg("--repo-root", REPO_ROOT);
  const out = readArg("--out", "");
  const porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  const report = buildSourceEvidenceGroupAudit({ porcelain, repoRoot });
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
