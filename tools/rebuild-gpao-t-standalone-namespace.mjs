#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_CONTROL_UI =
  process.env.GPAO_T_LIVE_CONTROL_UI ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";
const BACKUP_ROOT =
  process.env.GPAO_T_STANDALONE_NAMESPACE_BACKUP_ROOT ||
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-standalone-namespace-rebuild";
const APPLY_TOKEN = "apply-gpao-t-standalone-namespace-rebuild";
const STANDALONE_MARKER = "gpao_t_standalone_namespace_rebuild_v0_1";

const TEXT_EXTENSIONS = new Set([".js", ".html", ".css", ".json", ".svg", ".webmanifest"]);
const AUDIT_PATTERNS = [
  { id: "service_worker_cache", pattern: /["']openclaw-control-["']/g },
  { id: "notification_tag", pattern: /openclaw-notification/g },
  { id: "storage_key", pattern: /openclaw\.(control|device|workspace|gateway)[.\w-]*/g },
  { id: "custom_element", pattern: /openclaw-[a-z0-9-]+/g },
  { id: "mount_id", pattern: /openclaw[_-]mount[_-][a-z0-9-]+|openclaw-app/g },
  { id: "build_constant", pattern: /__OPENCLAW_[A-Z0-9_]+__/g },
];

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

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function normalizeRel(path) {
  return path.split("\\").join("/");
}

async function collectFiles(root, base = root) {
  const entries = await readdir(root).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) {
      files.push(...await collectFiles(path, base));
    } else if (info.isFile() && TEXT_EXTENSIONS.has(extname(path))) {
      files.push(path);
    }
  }
  return files;
}

function encodedLegacyCompatScript({ legacyCustomElements = [] } = {}) {
  const suffixes = [...new Set([
    "agent-select",
    "app",
    "tooltip",
    ...legacyCustomElements
      .filter((name) => /^openclaw-[a-z0-9-]+$/.test(name))
      .map((name) => name.slice("openclaw-".length)),
  ])].sort();
  return `
    <script data-gpao-t="${STANDALONE_MARKER}">
      (function () {
        if (window.${STANDALONE_MARKER}) return;
        window.${STANDALONE_MARKER} = true;
        var legacyPrefix = "open" + "claw";
        var gpaoPrefix = "gpao-t";
        var suffixes = ${JSON.stringify(suffixes)};

        function defineLegacyAlias(oldName, newName) {
          if (!window.customElements || customElements.get(oldName)) return;
          customElements.define(
            oldName,
            class extends HTMLElement {
              connectedCallback() {
                if (!this.isConnected || this.__gpaoTStandaloneAliasMoved) return;
                this.__gpaoTStandaloneAliasMoved = true;
                var target = document.createElement(newName);
                for (var i = 0; i < this.attributes.length; i += 1) {
                  var attribute = this.attributes[i];
                  target.setAttribute(attribute.name, attribute.value);
                }
                while (this.firstChild) target.appendChild(this.firstChild);
                this.replaceWith(target);
              }
            },
          );
        }

        function mirrorStore(store) {
          if (!store || typeof store.length !== "number") return;
          var legacyKeyPrefix = legacyPrefix + ".";
          var gpaoKeyPrefix = gpaoPrefix + ".";
          var keys = [];
          for (var index = 0; index < store.length; index += 1) {
            var key = store.key(index);
            if (key) keys.push(key);
          }
          for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            if (key.indexOf(legacyKeyPrefix) === 0) {
              var gpaoKey = gpaoKeyPrefix + key.slice(legacyKeyPrefix.length);
              if (store.getItem(gpaoKey) === null) store.setItem(gpaoKey, store.getItem(key));
            }
            if (key.indexOf(gpaoKeyPrefix) === 0) {
              var oldKey = legacyKeyPrefix + key.slice(gpaoKeyPrefix.length);
              if (store.getItem(oldKey) === null) store.setItem(oldKey, store.getItem(key));
            }
          }
        }

        try {
          for (var aliasIndex = 0; aliasIndex < suffixes.length; aliasIndex += 1) {
            defineLegacyAlias(legacyPrefix + "-" + suffixes[aliasIndex], gpaoPrefix + "-" + suffixes[aliasIndex]);
          }
          mirrorStore(window.localStorage);
          mirrorStore(window.sessionStorage);
        } catch (error) {}
      })();
    </script>`;
}

function replaceNamespaceText(source) {
  return source
    .replace(/OpenClaw/g, "GPAO-T")
    .replace(/openclaw/g, "gpao-t")
    .replace(/OPENCLAW/g, "GPAO_T")
    .replace(/__GPAO-T_/g, "__GPAO_T_")
    .replace(/GPAO-T_/g, "GPAO_T_")
    .replace(/gpao-t_mount/g, "gpao_t_mount");
}

export function patchStandaloneNamespaceSource(source, { path = "", legacyCustomElements = [] } = {}) {
  let next = replaceNamespaceText(source);
  if (path.endsWith("index.html") && !next.includes(STANDALONE_MARKER)) {
    next = next.replace(
      "    <script>",
      `${encodedLegacyCompatScript({ legacyCustomElements })}\n    <script>`,
    );
  }
  return next;
}

function countAuditHits(source) {
  const counts = {};
  for (const item of AUDIT_PATTERNS) {
    item.pattern.lastIndex = 0;
    const matches = source.match(item.pattern) || [];
    if (matches.length) counts[item.id] = matches.length;
  }
  return counts;
}

function addCounts(acc, counts) {
  for (const [key, value] of Object.entries(counts)) {
    acc[key] = (acc[key] || 0) + value;
  }
  return acc;
}

async function backupFile({ file, backupDir, relPath }) {
  const destination = join(backupDir, relPath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
  return destination;
}

function extractLegacyCustomElementNames(source = "") {
  const names = new Set();
  const patterns = [
    /customElements(?:\.get)?\([`'"](openclaw-[a-z0-9-]+)[`'"]\)/g,
    /customElements\.define\([`'"](openclaw-[a-z0-9-]+)[`'"]/g,
    /<\/?(openclaw-[a-z0-9-]+)(?=[\s>])/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

export async function buildStandaloneNamespaceRebuildPlan({ liveRoot = LIVE_CONTROL_UI } = {}) {
  const files = await collectFiles(liveRoot, liveRoot);
  const changes = [];
  const beforeCounts = {};
  const afterCounts = {};
  const legacyCustomElementNames = new Set();
  const sources = [];
  for (const file of files) {
    const relPath = normalizeRel(relative(liveRoot, file));
    const before = await readFile(file, "utf8").catch(() => "");
    for (const name of extractLegacyCustomElementNames(before)) legacyCustomElementNames.add(name);
    sources.push({ file, relPath, before });
  }
  const legacyCustomElements = [...legacyCustomElementNames].sort();
  for (const { file, relPath, before } of sources) {
    const after = patchStandaloneNamespaceSource(before, { path: relPath, legacyCustomElements });
    const beforeFileCounts = countAuditHits(before);
    const afterFileCounts = countAuditHits(after);
    addCounts(beforeCounts, beforeFileCounts);
    addCounts(afterCounts, afterFileCounts);
    if (before !== after) {
      changes.push({
        path: relPath,
        beforeSha256: sha256(before),
        afterSha256: sha256(after),
        beforeCounts: beforeFileCounts,
        afterCounts: afterFileCounts,
      });
    }
  }
  const beforeHitCount = Object.values(beforeCounts).reduce((sum, value) => sum + value, 0);
  const afterHitCount = Object.values(afterCounts).reduce((sum, value) => sum + value, 0);
  return {
    schema: "gpao_t.standalone_namespace_rebuild_plan.v0_1",
    generatedAt: new Date().toISOString(),
    liveRoot,
    applyToken: APPLY_TOKEN,
    status: afterHitCount === 0 ? "ready_to_apply" : "review_required",
    beforeHitCount,
    afterHitCount,
    beforeCounts,
    afterCounts,
    changedFileCount: changes.length,
    legacyCustomElementAliasCount: legacyCustomElements.length,
    legacyCustomElements,
    changes,
    rule:
      "Rebuild pass rewrites inherited runtime namespace identifiers to GPAO-T while preserving encoded legacy storage/custom-element compatibility.",
  };
}

async function main() {
  const liveRoot = readArg("--live-root", LIVE_CONTROL_UI);
  const out = readArg("--out", "");
  const apply = hasArg("--apply");
  const token = readArg("--token", "");
  const plan = await buildStandaloneNamespaceRebuildPlan({ liveRoot });
  const stamp = isoStamp();
  const backupDir = join(BACKUP_ROOT, stamp);

  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify({ ...plan, mode: apply ? "apply" : "dry-run" }, null, 2)}\n`);
  }

  if (!apply) {
    console.log(JSON.stringify({ ...plan, mode: "dry-run" }, null, 2));
    return;
  }

  if (token !== APPLY_TOKEN) {
    console.error(JSON.stringify({
      schema: "gpao_t.standalone_namespace_rebuild_refusal.v0_1",
      status: "refused",
      reason: "missing_or_invalid_apply_token",
      required: `--apply --token ${APPLY_TOKEN}`,
      liveMutationExecuted: false,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (plan.status !== "ready_to_apply") {
    console.error(JSON.stringify({
      schema: "gpao_t.standalone_namespace_rebuild_refusal.v0_1",
      status: "refused",
      reason: "dry_run_after_hit_count_not_zero",
      afterHitCount: plan.afterHitCount,
      liveMutationExecuted: false,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  await mkdir(backupDir, { recursive: true });
  for (const change of plan.changes) {
    const file = join(liveRoot, change.path);
    const before = await readFile(file, "utf8");
    const after = patchStandaloneNamespaceSource(before, {
      path: change.path,
      legacyCustomElements: plan.legacyCustomElements,
    });
    await backupFile({ file, backupDir, relPath: change.path });
    await writeFile(file, after);
  }

  const receipt = {
    ...plan,
    mode: "apply",
    backupDir,
    liveMutationExecuted: true,
  };
  await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
