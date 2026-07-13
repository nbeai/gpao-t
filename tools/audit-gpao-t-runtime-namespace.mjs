#!/usr/bin/env node
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIVE_CONTROL_UI =
  process.env.GPAO_T_LIVE_CONTROL_UI ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";

const NAMESPACE_PATTERNS = [
  { id: "service_worker_cache", pattern: /["']openclaw-control-["']/g, risk: "cache_migration_required" },
  { id: "notification_tag", pattern: /openclaw-notification/g, risk: "notification_tag_migration_required" },
  { id: "storage_key", pattern: /openclaw\.(control|device|workspace|gateway)[.\w-]*/g, risk: "storage_key_mirror_required" },
  { id: "custom_element", pattern: /openclaw-[a-z0-9-]+/g, risk: "custom_element_wrapper_required" },
  { id: "mount_id", pattern: /openclaw[_-]mount[_-][a-z0-9-]+|openclaw-app/g, risk: "dom_mount_compat_required" },
  { id: "build_constant", pattern: /__OPENCLAW_[A-Z0-9_]+__/g, risk: "build_constant_alias_required" },
];

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
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
    } else if (info.isFile() && /\.(js|html|css|json|webmanifest|svg)$/.test(path)) {
      files.push(path);
    }
  }
  return files;
}

function migrationStageFor(hit) {
  if (hit.id === "service_worker_cache") return "mirror_then_delete_old_cache_on_activate";
  if (hit.id === "storage_key") return "read_old_write_new_then_backfill";
  if (hit.id === "custom_element") return "register_gpao_t_wrapper_keep_old_alias";
  if (hit.id === "notification_tag") return "write_new_tag_keep_old_dismiss_compat";
  if (hit.id === "mount_id") return "add_gpao_t_mount_alias_keep_old_dom_fallback";
  return "alias_first_then_cutover";
}

export async function auditGpaoTRuntimeNamespace({ liveRoot = DEFAULT_LIVE_CONTROL_UI } = {}) {
  const files = await collectFiles(liveRoot, liveRoot);
  const hits = [];
  const migrationEvidence = {
    storageMirrorScript: false,
    serviceWorkerGpaoCachePrefix: false,
    serviceWorkerLegacyCacheCompatibility: false,
    notificationTagCutover: false,
    customElementAliasSeed: false,
    customElementAliasBridge: false,
    customElementAliasCount: 0,
  };
  for (const file of files) {
    const relPath = normalizeRel(relative(liveRoot, file));
    const source = await readFile(file, "utf8").catch(() => "");
    if (source.includes("gpao_t_runtime_namespace_mirror_v0_1")) {
      migrationEvidence.storageMirrorScript = true;
    }
    if (source.includes('const CACHE_PREFIX = "gpao-t-control-";')) {
      migrationEvidence.serviceWorkerGpaoCachePrefix = true;
    }
    if (source.includes('const LEGACY_CACHE_PREFIX = "openclaw-control-";')) {
      migrationEvidence.serviceWorkerLegacyCacheCompatibility = true;
    }
    if (source.includes('tag: data.tag || "gpao-t-notification"')) {
      migrationEvidence.notificationTagCutover = true;
    }
    if (
      source.includes('defineAlias("gpao-t-app", "openclaw-app")') &&
      source.includes('defineAlias("gpao-t-tooltip", "openclaw-tooltip")')
    ) {
      migrationEvidence.customElementAliasSeed = true;
    }
    if (source.includes("gpao_t_custom_element_alias_bridge_v0_1")) {
      migrationEvidence.customElementAliasBridge = true;
      const listMatch = source.match(/var legacyElementNames = (\[[^\]]*\]);/);
      if (listMatch) {
        try {
          const names = JSON.parse(listMatch[1]);
          migrationEvidence.customElementAliasCount = Math.max(
            migrationEvidence.customElementAliasCount,
            Array.isArray(names) ? names.length : 0,
          );
        } catch {}
      }
    }
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes("var legacyElementNames = ")) return;
      for (const item of NAMESPACE_PATTERNS) {
        item.pattern.lastIndex = 0;
        if (!item.pattern.test(line)) continue;
        hits.push({
          id: item.id,
          path: relPath,
          line: index + 1,
          risk: item.risk,
          migrationStage: migrationStageFor(item),
          text: line.trim().slice(0, 240),
        });
      }
    });
  }
  const byRisk = hits.reduce((acc, hit) => {
    acc[hit.risk] = (acc[hit.risk] || 0) + 1;
    return acc;
  }, {});
  const stageOneReady =
    migrationEvidence.storageMirrorScript &&
    migrationEvidence.serviceWorkerGpaoCachePrefix &&
    migrationEvidence.serviceWorkerLegacyCacheCompatibility &&
    migrationEvidence.notificationTagCutover &&
    (migrationEvidence.customElementAliasSeed || migrationEvidence.customElementAliasBridge);
  const bundleAliasBridgeReady = stageOneReady
    && migrationEvidence.customElementAliasBridge
    && migrationEvidence.customElementAliasCount >= 3;
  const status = hits.length
    ? bundleAliasBridgeReady
      ? "bundle_alias_bridge_ready_rebuild_required"
      : stageOneReady
        ? "stage_one_migrated_followup_required"
        : "migration_required"
    : "ready";
  return {
    schema: "gpao_t.runtime_namespace_audit.v1",
    generatedAt: new Date().toISOString(),
    liveRoot,
    status,
    hitCount: hits.length,
    byRisk,
    migrationEvidence,
    stageOneReady,
    bundleAliasBridgeReady,
    remainingRisk:
      hits.length && bundleAliasBridgeReady
        ? "Inherited OpenClaw runtime identifiers remain in built chunks and fallback compatibility code. Runtime now has manifest-backed GPAO-T custom element aliases for bundle-level compatibility; a source rebuild is still required to remove the old identifiers completely."
        : hits.length && stageOneReady
          ? "Inherited OpenClaw runtime identifiers remain in built chunks and fallback compatibility code. Stage one now mirrors storage/cache/notification boundaries and seeds GPAO-T element aliases, but bundle-level custom element migration still requires a rebuild or manifest-backed compatibility patch."
        : hits.length
          ? "Runtime namespace migration evidence is incomplete."
          : "No inherited namespace hits found.",
    hits,
    migrationRule:
      "Do not blind-replace runtime namespace keys. Add GPAO-T mirrors, preserve existing sessions, then cut over with rollback evidence.",
  };
}

async function main() {
  const liveRoot = readArg("--live-root", DEFAULT_LIVE_CONTROL_UI);
  const out = readArg("--out", "");
  const audit = await auditGpaoTRuntimeNamespace({ liveRoot });
  const json = `${JSON.stringify(audit, null, 2)}\n`;
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, json);
  }
  console.log(json);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
