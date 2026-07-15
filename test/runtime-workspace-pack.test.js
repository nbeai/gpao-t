import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const TOOL = fileURLToPath(new URL("../tools/apply-gpao-t-runtime-workspace-pack.mjs", import.meta.url));
const SOURCE_PACK = fileURLToPath(new URL("../runtime-workspace/gpao-t", import.meta.url));
const TOKEN = "apply-gpao-t-runtime-workspace";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-runtime-workspace-pack-"));
}

function runTool(args) {
  return JSON.parse(execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8" }));
}

describe("GPAO-T runtime workspace pack", () => {
  it("verifies the source pack as a GPAO-T runtime contract", () => {
    const root = tempRoot();
    const report = runTool([
      "--source-pack",
      SOURCE_PACK,
      "--evidence-root",
      join(root, "evidence"),
    ]);

    assert.equal(report.status, "dry_run");
    assert.equal(report.verification.status, "pass");
    assert.ok(report.sourceSummary.files.some((entry) => entry.file === "WELCOME.md"));
  });

  it("requires an apply token, backs up existing files, applies the pack, and verifies live workspace output", async () => {
    const root = tempRoot();
    const liveWorkspace = join(root, "workspace");
    const evidenceRoot = join(root, "evidence");
    await mkdir(liveWorkspace, { recursive: true });
    await writeFile(join(liveWorkspace, "AGENTS.md"), "# AGENTS.md - Your Workspace\n");

    const blocked = spawnSync(process.execPath, [
      TOOL,
      "--source-pack",
      SOURCE_PACK,
      "--live-workspace",
      liveWorkspace,
      "--evidence-root",
      evidenceRoot,
      "--apply",
      "--token",
      "wrong",
    ], { encoding: "utf8" });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /apply_token_required/);

    const logoSource = join(root, "logo.jpeg");
    await cp(fileURLToPath(new URL("../runtime-workspace/gpao-t/RUNTIME-MANIFEST.json", import.meta.url)), logoSource);
    const applied = runTool([
      "--source-pack",
      SOURCE_PACK,
      "--live-workspace",
      liveWorkspace,
      "--evidence-root",
      evidenceRoot,
      "--logo-source",
      logoSource,
      "--apply",
      "--token",
      TOKEN,
    ]);

    assert.equal(applied.status, "applied");
    assert.equal(applied.verification.status, "pass");
    assert.equal(existsSync(join(liveWorkspace, "MEMORY.md")), true);
    assert.equal(existsSync(join(liveWorkspace, "WELCOME.md")), true);
    assert.equal(existsSync(join(liveWorkspace, "gpao-logo.jpeg")), true);
    assert.match(readFileSync(join(liveWorkspace, "AGENTS.md"), "utf8"), /GPAO-T Runtime Constitution/);
    const day = new Date().toISOString().slice(0, 10);
    assert.match(
      readFileSync(join(liveWorkspace, "memory", `${day}.md`), "utf8"),
      /GPAO-T runtime workspace contract applied/,
    );
    const tools = readFileSync(join(liveWorkspace, "TOOLS.md"), "utf8");
    assert.match(tools, /127\.0\.0\.1:18799/);
    assert.doesNotMatch(tools, /~\/\.openclaw|\/Users\/jyp\/\.openclaw/);
    assert.ok(applied.backedUp.some((entry) => entry.file === "AGENTS.md" && entry.status === "backed_up"));

    const verified = runTool([
      "--source-pack",
      SOURCE_PACK,
      "--live-workspace",
      liveWorkspace,
      "--evidence-root",
      evidenceRoot,
      "--verify-live",
    ]);
    assert.equal(verified.status, "verified_live");
    assert.equal(verified.verification.status, "pass");
  });

  it("accepts an absolute canonical GPAO-T live root in a personalized workspace", async () => {
    const root = tempRoot();
    const sourcePack = join(root, "source-pack");
    const evidenceRoot = join(root, "evidence");
    await cp(SOURCE_PACK, sourcePack, { recursive: true });
    const toolsPath = join(sourcePack, "TOOLS.md");
    const tools = readFileSync(toolsPath, "utf8").replaceAll("~/.gpao-t", "/Users/tester/.gpao-t");
    await writeFile(toolsPath, tools);

    const report = runTool([
      "--source-pack",
      sourcePack,
      "--evidence-root",
      evidenceRoot,
    ]);

    assert.equal(report.status, "dry_run");
    assert.equal(report.verification.status, "pass");
  });
});
