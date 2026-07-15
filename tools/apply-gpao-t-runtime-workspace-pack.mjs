#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_SOURCE_PACK = join(REPO_ROOT, "runtime-workspace", "gpao-t");
const DEFAULT_LIVE_WORKSPACE = join(process.env.HOME || "/Users/jyp", ".gpao-t", "workspace");
const DEFAULT_EVIDENCE_ROOT = join(
  REPO_ROOT,
  "docs",
  "03-verification",
  "evidence",
  "runtime-workspace-pack",
);
const APPLY_TOKEN = "apply-gpao-t-runtime-workspace";
const DEFAULT_LOGO_SOURCE =
  "/Users/jyp/Pictures/Photos Library.photoslibrary/resources/derivatives/A/A9FA642E-56BF-4B66-B29B-3D42A05EC8AE_1_105_c.jpeg";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function listFilesRecursive(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of await readdir(root)) {
    const full = join(root, name);
    const itemStat = await stat(full);
    if (itemStat.isDirectory()) {
      out.push(...await listFilesRecursive(full));
    } else if (itemStat.isFile()) {
      out.push(full);
    }
  }
  return out.sort();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyWorkspace({ workspace, requiredFiles }) {
  const checks = [];
  const text = async (file) => readFile(join(workspace, file), "utf8");
  const exists = (file) => existsSync(join(workspace, file));
  const pass = (id, ok, detail = "") => {
    checks.push({ id, status: ok ? "pass" : "fail", detail });
  };
  const hasCanonicalLiveRoot = (value) =>
    /(?:~|\/Users\/[^/]+)\/\.gpao-t(?:\/|\b)/.test(value);

  for (const file of requiredFiles) {
    pass(`exists:${file}`, exists(file), join(workspace, file));
  }

  const agents = exists("AGENTS.md") ? await text("AGENTS.md") : "";
  const soul = exists("SOUL.md") ? await text("SOUL.md") : "";
  const identity = exists("IDENTITY.md") ? await text("IDENTITY.md") : "";
  const tools = exists("TOOLS.md") ? await text("TOOLS.md") : "";
  const memory = exists("MEMORY.md") ? await text("MEMORY.md") : "";
  const welcome = exists("WELCOME.md") ? await text("WELCOME.md") : "";
  const heartbeat = exists("HEARTBEAT.md") ? await text("HEARTBEAT.md") : "";

  pass("agents.constitution", agents.includes("GPAO-T Runtime Constitution"));
  pass("agents.product_identity", agents.includes("nBeAI. GPAO-T"));
  pass("agents.canonical_live_root", hasCanonicalLiveRoot(agents));
  pass("agents.default_memory_path", agents.includes("`local_hybrid_memory_search`"));
  pass("agents.capability_truth", agents.includes("### Capability Truth"));
  pass("soul.gpao_t_identity", soul.includes("nBeAI. GPAO-T"));
  pass("identity.gpao_t_product", /Product Name:\*\*\s*\n\s*nBeAI\. GPAO-T/i.test(identity));
  pass("tools.secret_boundary", tools.includes("Do not expose or print gateway auth tokens"));
  pass("tools.canonical_live_root", hasCanonicalLiveRoot(tools));
  pass("tools.canonical_dashboard_port", tools.includes("127.0.0.1:18799"));
  pass("tools.no_legacy_live_root", !tools.includes("~/.openclaw") && !tools.includes("/Users/jyp/.openclaw"));
  pass("memory.north_star", memory.includes("GPAO-T North Star"));
  pass("memory.independent_product", memory.includes("separate comparison product"));
  pass("welcome.personalization", welcome.includes("First-install Personalization") && welcome.includes("Required Setup Questions"));
  pass("heartbeat.default_inactive", heartbeat.includes("inactive by default"));

  const legacyNeedles = [
    "# AGENTS.md - Your Workspace",
    "# SOUL.md - Who You Are",
    "# TOOLS.md - Local Notes",
    "# IDENTITY.md - Who Am I?",
  ];
  const markdownFiles = requiredFiles.filter((file) => file.endsWith(".md"));
  for (const file of markdownFiles) {
    const content = exists(file) ? await text(file) : "";
    const found = legacyNeedles.filter((needle) => content.includes(needle));
    pass(`legacy_template_removed:${file}`, found.length === 0, found.join(", "));
  }

  if (exists("RUNTIME-MANIFEST.json")) {
    try {
      const manifest = await readJson(join(workspace, "RUNTIME-MANIFEST.json"));
      pass("manifest.schema", manifest.schema === "gpao_t.runtime_workspace_manifest.v0_1");
      pass("manifest.product", manifest.product === "nBeAI. GPAO-T");
    } catch (error) {
      pass("manifest.parse", false, error instanceof Error ? error.message : String(error));
    }
  }

  const failures = checks.filter((check) => check.status !== "pass");
  return {
    schema: "gpao_t.runtime_workspace_verification.v0_1",
    status: failures.length ? "blocked" : "pass",
    checkedAt: new Date().toISOString(),
    workspace,
    checks,
  };
}

async function backupExistingFiles({ liveWorkspace, backupDir, files }) {
  const backedUp = [];
  await mkdir(backupDir, { recursive: true });
  for (const file of files) {
    const source = join(liveWorkspace, file);
    const target = join(backupDir, file);
    if (!existsSync(source)) {
      backedUp.push({ file, status: "missing" });
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    backedUp.push({ file, status: "backed_up", sha256: await sha256(source) });
  }
  return backedUp;
}

async function copyPackFiles({ sourcePack, liveWorkspace, files }) {
  const copied = [];
  await mkdir(liveWorkspace, { recursive: true });
  for (const file of files) {
    const source = join(sourcePack, file);
    const target = join(liveWorkspace, file);
    assert(existsSync(source), `missing_source_pack_file:${source}`);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied.push({
      file,
      sourceSha256: await sha256(source),
      targetSha256: await sha256(target),
    });
  }
  return copied;
}

async function appendDailyMemoryNote({ liveWorkspace }) {
  const memoryDir = join(liveWorkspace, "memory");
  const day = new Date().toISOString().slice(0, 10);
  const dailyFile = join(memoryDir, `${day}.md`);
  const marker = "GPAO-T runtime workspace contract applied";
  await mkdir(memoryDir, { recursive: true });
  const existing = existsSync(dailyFile) ? await readFile(dailyFile, "utf8") : "";
  if (existing.includes(marker)) {
    return { file: dailyFile, status: "already_present" };
  }
  const prefix = existing.trim() ? `${existing.trimEnd()}\n\n` : "";
  const next = `${prefix}# ${day}\n\n- ${marker}: the nBeAI. GPAO-T identity, tool, memory, and authority contract pack was applied. Durable memory remains review-gated; this note records the workspace baseline change only.\n`;
  await writeFile(dailyFile, next);
  return { file: dailyFile, status: "appended" };
}

async function copyOptionalLogo({ liveWorkspace, backupDir }) {
  const logoSource = readArg("--logo-source", process.env.GPAO_T_LOGO_SOURCE || DEFAULT_LOGO_SOURCE);
  const target = join(liveWorkspace, "gpao-logo.jpeg");
  if (!logoSource || !existsSync(logoSource)) {
    return { status: "skipped", reason: "source_missing", source: logoSource };
  }
  if (existsSync(target)) {
    await mkdir(backupDir, { recursive: true });
    await copyFile(target, join(backupDir, "gpao-logo.jpeg"));
  }
  await copyFile(logoSource, target);
  return {
    status: "copied",
    source: logoSource,
    target,
    targetSha256: await sha256(target),
  };
}

async function summarizeSourcePack({ sourcePack }) {
  const manifestPath = join(sourcePack, "RUNTIME-MANIFEST.json");
  assert(existsSync(manifestPath), `missing_manifest:${manifestPath}`);
  const manifest = await readJson(manifestPath);
  assert(Array.isArray(manifest.files), "manifest.files must be an array");
  const files = await listFilesRecursive(sourcePack);
  return {
    manifest,
    files: await Promise.all(files.map(async (file) => ({
      file: relative(sourcePack, file),
      sha256: await sha256(file),
    }))),
  };
}

async function writeReport({ evidenceRoot, stamp, report }) {
  await mkdir(evidenceRoot, { recursive: true });
  const jsonPath = join(evidenceRoot, `runtime-workspace-absorption-${stamp}.json`);
  const mdPath = join(evidenceRoot, `runtime-workspace-absorption-${stamp}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(
    mdPath,
    [
      "# GPAO-T Runtime Workspace Absorption Evidence",
      "",
      `- status: ${report.status}`,
      `- createdAt: ${report.createdAt}`,
      `- liveWorkspace: ${report.liveWorkspace}`,
      `- sourcePack: ${report.sourcePack}`,
      `- backupDir: ${report.backupDir || "none"}`,
      `- verification: ${report.verification?.status || "not_run"}`,
      "",
      "## Scope",
      "",
      "This run applies and verifies the GPAO-T runtime workspace markdown contract pack. It installs nBeAI. GPAO-T identity, memory, tool, heartbeat, and first-install welcome contracts into the canonical GPAO-T workspace.",
      "",
    ].join("\n"),
  );
  return { jsonPath, mdPath };
}

async function main() {
  const apply = hasArg("--apply");
  const verifyLiveOnly = hasArg("--verify-live");
  const token = readArg("--token");
  const sourcePack = resolve(readArg("--source-pack", DEFAULT_SOURCE_PACK));
  const liveWorkspace = resolve(readArg("--live-workspace", DEFAULT_LIVE_WORKSPACE));
  const evidenceRoot = resolve(readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT));
  const stamp = isoStamp();
  const sourceSummary = await summarizeSourcePack({ sourcePack });
  const requiredFiles = sourceSummary.manifest.files;
  const backupDir = join(evidenceRoot, "backups", stamp);

  if (apply && token !== APPLY_TOKEN) {
    throw new Error(`apply_token_required:${APPLY_TOKEN}`);
  }

  let backedUp = [];
  let copied = [];
  let dailyMemory = null;
  let logo = null;

  if (apply) {
    backedUp = await backupExistingFiles({ liveWorkspace, backupDir, files: requiredFiles });
    copied = await copyPackFiles({ sourcePack, liveWorkspace, files: requiredFiles });
    dailyMemory = await appendDailyMemoryNote({ liveWorkspace });
    logo = await copyOptionalLogo({ liveWorkspace, backupDir });
  }

  const verification = await verifyWorkspace({
    workspace: apply || verifyLiveOnly ? liveWorkspace : sourcePack,
    requiredFiles,
  });

  const report = {
    schema: "gpao_t.runtime_workspace_absorption_run.v0_1",
    status: verification.status !== "pass"
      ? "blocked"
      : apply
        ? "applied"
        : verifyLiveOnly
          ? "verified_live"
          : "dry_run",
    createdAt: new Date().toISOString(),
    applyToken: APPLY_TOKEN,
    sourcePack,
    liveWorkspace,
    backupDir: apply ? backupDir : null,
    sourceSummary,
    backedUp,
    copied,
    dailyMemory,
    logo,
    verification,
    nextChecks: [
      "Ask GPAO-T to inspect its workspace and confirm it reports nBeAI. GPAO-T identity and current canonical runtime paths.",
      "Wire WELCOME.md into first-install onboarding UI/CLI.",
      "Keep durable memory promotion behind review and replay gates.",
    ],
  };
  const evidence = await writeReport({ evidenceRoot, stamp, report });
  report.evidence = evidence;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
