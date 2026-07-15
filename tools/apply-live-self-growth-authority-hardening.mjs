#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APPLY_TOKEN = "apply-gpao-t-self-growth-authority-hardening";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_LIVE_DIST = "/Users/jyp/.gpao-t/current/compatibility/gpao-t/dist";
const DEFAULT_BACKUP_ROOT = "/Users/jyp/.gpao-t/backups/self-growth-authority-hardening";
const DEFAULT_EVIDENCE_ROOT = join(
  REPO_ROOT,
  "docs/03-verification/evidence/phase-3-tools-memory-growth-2026-07-14",
);
const KERNEL_RELATIVE_PATH = "gpao-t-runtime-kernel/core";
const KERNEL_IMPORT = `./${KERNEL_RELATIVE_PATH}/auto-memory-growth-loop.js`;

export function patchLiveGrowthHandler(source) {
  if (source.includes(`await import("${KERNEL_IMPORT}")`)) {
    return { source, status: "already_hardened" };
  }

  const oldCall = "const autoMemoryGrowth = answerText ? runAutoMemoryGrowthLoop({";
  const newCall = [
    `const autoMemoryGrowthRuntime = answerText ? await import("${KERNEL_IMPORT}") : null;`,
    "\t\tconst autoMemoryGrowth = answerText ? autoMemoryGrowthRuntime.runAutoMemoryGrowthLoop({",
  ].join("\n");
  const oldText = "\t\t\ttext: answerText,\n\t\t\trequest:";
  const newText = [
    "\t\t\ttext: answerText,",
    "\t\t\tgrowthSignalText: stringParam(params.userExpectation) || stringParam(params.activeTarget),",
    "\t\t\trequest:",
  ].join("\n");
  const oldCandidate = [
    "\t\t\tcandidate: {",
    "\t\t\t\ttitle: candidateDraft.candidate.title,",
    "\t\t\t\toperatingPrinciple: candidateDraft.candidate.operatingPrinciple,",
    "\t\t\t\treason: candidateDraft.candidate.reason,",
    "\t\t\t\tanchor: candidateDraft.candidate.anchor",
    "\t\t\t},",
  ].join("\n");

  for (const [label, needle] of [
    ["growth_call", oldCall],
    ["growth_signal", oldText],
    ["generic_candidate", oldCandidate],
  ]) {
    if (!source.includes(needle)) {
      throw new Error(`live self-growth patch anchor missing: ${label}`);
    }
  }

  const patched = source
    .replace(oldCall, newCall)
    .replace(oldText, newText)
    .replace(`${oldCandidate}\n`, "")
    .replace(
      'automaticLocalCandidateApply: "allowed_after_source_replay_and_rollback_gates"',
      'automaticLocalCandidateApply: "blocked_until_explicit_user_approval"',
    );

  return { source: patched, status: "patched" };
}

export async function findLiveGrowthHandler(liveDist) {
  const files = (await readdir(liveDist))
    .filter((name) => /^gpao-t-[A-Za-z0-9_-]+\.js$/.test(name))
    .sort();
  if (files.length !== 1) {
    throw new Error(`expected one GPAO-T live handler in ${liveDist}; found ${files.length}`);
  }
  return join(liveDist, files[0]);
}

export async function buildLiveGrowthHardeningPreview({ liveDist = DEFAULT_LIVE_DIST } = {}) {
  const handler = await findLiveGrowthHandler(liveDist);
  const source = await readFile(handler, "utf8");
  const patch = patchLiveGrowthHandler(source);
  return {
    schema: "gpao_t.live_self_growth_authority_hardening_preview.v1",
    status: patch.status === "already_hardened" ? "already_hardened" : "ready_to_apply",
    liveDist,
    handler,
    currentHandlerSha256: sha256(source),
    nextHandlerSha256: sha256(patch.source),
    kernelSource: join(REPO_ROOT, "src/core"),
    kernelTarget: join(liveDist, KERNEL_RELATIVE_PATH),
    mutationExecuted: false,
  };
}

async function applyLiveGrowthHardening({ liveDist, expectedSha }) {
  const preview = await buildLiveGrowthHardeningPreview({ liveDist });
  if (preview.currentHandlerSha256 !== expectedSha) {
    throw new Error(
      `live handler hash mismatch: expected ${expectedSha}, actual ${preview.currentHandlerSha256}`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(DEFAULT_BACKUP_ROOT, stamp);
  const kernelTarget = join(liveDist, KERNEL_RELATIVE_PATH);
  const handlerSource = await readFile(preview.handler, "utf8");
  const patched = patchLiveGrowthHandler(handlerSource);

  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  await cp(preview.handler, join(backupDir, basename(preview.handler)));
  await mkdir(kernelTarget, { recursive: true });
  await cp(join(REPO_ROOT, "src/core"), kernelTarget, { recursive: true, force: true });
  if (patched.status === "patched") {
    await writeFile(preview.handler, patched.source);
  }

  const finalHandler = await readFile(preview.handler, "utf8");
  const kernelFile = join(kernelTarget, "auto-memory-growth-loop.js");
  const kernelSource = await readFile(kernelFile, "utf8");
  const receipt = {
    schema: "gpao_t.live_self_growth_authority_hardening_receipt.v1",
    status: "applied",
    createdAt: new Date().toISOString(),
    liveDist,
    handler: preview.handler,
    backupDir,
    kernelTarget,
    hashes: {
      beforeHandler: preview.currentHandlerSha256,
      afterHandler: sha256(finalHandler),
      kernel: sha256(kernelSource),
    },
    assertions: {
      currentKernelImport: finalHandler.includes(`await import("${KERNEL_IMPORT}")`),
      userSignalForwarded: finalHandler.includes("growthSignalText: stringParam(params.userExpectation)"),
      genericCandidateRemoved: !finalHandler.includes("title: candidateDraft.candidate.title"),
      automaticApplyClaimRemoved:
        !finalHandler.includes('automaticLocalCandidateApply: "allowed_after_source_replay_and_rollback_gates"'),
    },
  };
  if (Object.values(receipt.assertions).some((value) => !value)) {
    throw new Error("post-apply self-growth authority assertions failed");
  }
  await mkdir(DEFAULT_EVIDENCE_ROOT, { recursive: true });
  await writeFile(
    join(DEFAULT_EVIDENCE_ROOT, "LIVE-SELF-GROWTH-AUTHORITY-HARDENING-RECEIPT.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return receipt;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const liveDist = readArg("--live-dist") || DEFAULT_LIVE_DIST;
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify(await buildLiveGrowthHardeningPreview({ liveDist }), null, 2));
  } else {
    if (readArg("--token") !== APPLY_TOKEN) {
      throw new Error("valid --token is required before live mutation");
    }
    const expectedSha = readArg("--expected-handler-sha");
    if (!expectedSha) {
      throw new Error("--expected-handler-sha is required before live mutation");
    }
    console.log(JSON.stringify(await applyLiveGrowthHardening({ liveDist, expectedSha }), null, 2));
  }
}
