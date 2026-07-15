#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_RUNTIME_ROOT = process.env.GPAO_T_RUNTIME_ROOT
  || join(homedir(), ".gpao-t", "current", "compatibility", "gpao-t");
const DEFAULT_EVIDENCE_ROOT = process.env.GPAO_T_HOTFIX_EVIDENCE_ROOT
  || join(REPO_ROOT, "docs", "03-verification", "evidence", "live-chat-layout-recovery-hotfix");
const APPLY_TOKEN = "apply-gpao-t-chat-layout-recovery-hotfix";
const MARKER = "gpao_t_chat_layout_recovery_v0_1";

const RECOVERY_CSS = `
    <style data-gpao-t="${MARKER}">
      html,
      body,
      openclaw-app,
      openclaw-app-shell {
        height: 100% !important;
        min-height: 100% !important;
      }

      openclaw-app,
      openclaw-app-shell {
        display: block !important;
        width: 100% !important;
      }

      .shell.shell--chat,
      .content.content--chat {
        min-height: 0 !important;
        height: 100% !important;
      }

      .content.content--chat {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        overflow: hidden !important;
      }

      .content.content--chat > openclaw-router-outlet,
      openclaw-router-outlet,
      openclaw-chat-page,
      openclaw-chat-pane {
        display: flex !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      openclaw-chat-pane > .card.chat,
      openclaw-chat-pane .chat,
      openclaw-chat-pane .chat-workbench,
      openclaw-chat-pane .chat-workbench__main,
      openclaw-chat-pane .chat-split-container {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      openclaw-chat-pane .chat-workbench__main,
      openclaw-chat-pane .chat-split-container {
        overflow: hidden !important;
      }
    </style>`;

export function patchChatLayoutRecoveryHtml(source) {
  const html = String(source || "");
  const existingPattern = new RegExp(`\\s*<style data-gpao-t="${MARKER}">[\\s\\S]*?<\\/style>`);
  if (html.includes(`data-gpao-t="${MARKER}"`)) {
    const matches = html.match(new RegExp(existingPattern.source, "g")) || [];
    if (matches.length !== 1) {
      throw new Error(`chat layout recovery expected one existing marker, found ${matches.length}`);
    }
    return html.replace(existingPattern, RECOVERY_CSS);
  }
  const headClosings = html.match(/<\/head>/gi) || [];
  if (headClosings.length !== 1) {
    throw new Error(`chat layout recovery expected one </head>, found ${headClosings.length}`);
  }
  return html.replace(/<\/head>/i, `${RECOVERY_CSS}\n  </head>`);
}

export async function runChatLayoutRecoveryHotfix({
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  evidenceRoot = DEFAULT_EVIDENCE_ROOT,
  apply = false,
  approvalToken = "",
  now = new Date(),
} = {}) {
  if (apply && approvalToken !== APPLY_TOKEN) {
    throw new Error(`apply requires --approval-token ${APPLY_TOKEN}`);
  }
  const ownedRuntimeRoot = assertGpaoTRuntimeRoot(runtimeRoot);
  const indexPath = join(ownedRuntimeRoot, "dist", "control-ui", "index.html");
  const before = await readFile(indexPath, "utf8");
  const after = patchChatLayoutRecoveryHtml(before);
  const changed = before !== after;
  const baseReport = {
    schema: "gpao_t.live_chat_layout_recovery_hotfix.v2",
    generatedAt: now.toISOString(),
    mode: apply ? "apply" : "dry-run",
    status: apply ? "pending_apply" : "review",
    sourceRoot: REPO_ROOT,
    runtimeRoot: ownedRuntimeRoot,
    indexPath,
    marker: MARKER,
    changed,
    beforeSha256: sha256(before),
    afterSha256: sha256(after),
    approvalGate: apply ? "verified" : "not_requested",
    writesPerformed: false,
  };
  if (!apply) return baseReport;

  const evidenceDir = join(resolve(evidenceRoot), stamp(now));
  const backupPath = changed ? join(evidenceDir, "index.html.before") : null;
  const receiptPath = join(evidenceDir, "receipt.json");
  await mkdir(evidenceDir, { recursive: true });
  if (changed) {
    await copyFile(indexPath, backupPath);
    await chmod(backupPath, 0o600);
  }

  try {
    if (changed) await writeFile(indexPath, after);
    const readback = await readFile(indexPath, "utf8");
    if (sha256(readback) !== baseReport.afterSha256) {
      throw new Error("chat layout recovery readback hash mismatch");
    }
    const receipt = {
      ...baseReport,
      status: changed ? "applied" : "already_applied",
      writesPerformed: changed,
      backupPath,
      backupSha256: backupPath ? sha256(await readFile(backupPath, "utf8")) : null,
      readbackSha256: sha256(readback),
      receiptPath,
      rollback: backupPath ? `restore ${backupPath} to ${indexPath}` : "not_required_no_change",
      expectedVisualContract: {
        routeHeight: "chat route custom elements fill the content height",
        composerPosition: "message composer remains in the lower viewport",
        clipping: "route header and top messages remain visible",
      },
    };
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    return receipt;
  } catch (error) {
    if (changed && backupPath) await copyFile(backupPath, indexPath);
    throw error;
  }
}

function assertGpaoTRuntimeRoot(runtimeRoot) {
  const resolvedRoot = resolve(runtimeRoot || DEFAULT_RUNTIME_ROOT);
  if (basename(resolvedRoot) !== "gpao-t" || basename(dirname(resolvedRoot)) !== "compatibility") {
    throw new Error("runtime root must use the GPAO-T compatibility/gpao-t layout");
  }
  if (resolvedRoot.includes(`${join("node_modules", "openclaw")}`)) {
    throw new Error("globally installed OpenClaw runtime targets are forbidden");
  }
  return resolvedRoot;
}

function parseArgs(argv) {
  const args = {
    runtimeRoot: DEFAULT_RUNTIME_ROOT,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    apply: false,
    approvalToken: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--runtime-root") args.runtimeRoot = argv[++index] || "";
    else if (arg === "--evidence-root") args.evidenceRoot = argv[++index] || "";
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--approval-token") args.approvalToken = argv[++index] || "";
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const report = await runChatLayoutRecoveryHotfix(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
