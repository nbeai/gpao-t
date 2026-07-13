#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_ROOT =
  process.env.OPENCLAW_LIVE_DIST ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist";
const CONTROL_UI_ROOT = join(LIVE_ROOT, "control-ui");
const CONTROL_UI_INDEX_HTML = join(CONTROL_UI_ROOT, "index.html");
const CONTROL_UI_SW = join(CONTROL_UI_ROOT, "sw.js");
const BACKUP_ROOT =
  process.env.GPAO_T_NAMESPACE_MIGRATION_BACKUP_ROOT ||
  "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-namespace-migration";
const APPLY_TOKEN = "apply-gpao-t-runtime-namespace-live";
const NAMESPACE_MARKER = "gpao_t_runtime_namespace_mirror_v0_1";
const CUSTOM_ELEMENT_ALIAS_MARKER = "gpao_t_custom_element_alias_bridge_v0_1";

const MIGRATION_PLAN = {
  schema: "gpao_t.runtime_namespace_migration_plan.v1",
  status: "plan_ready_apply_blocked",
  rule: "Runtime namespace migration is implemented as a guarded plan first. Live writes require a separate manifest-backed patch run.",
  stages: [
    {
      id: "storage_mirror",
      action: "Read existing openclaw.* localStorage/sessionStorage keys, write gpao-t.* mirrors, keep old keys readable.",
      rollback: "Ignore gpao-t.* mirrors and continue reading old keys.",
    },
    {
      id: "service_worker_cache_cutover",
      action: "Install gpao-t-control-* cache prefix and delete old openclaw-control-* caches only during activate after new assets are cached.",
      rollback: "Restore previous sw.js from manifest backup.",
    },
    {
      id: "custom_element_alias",
      action: "Register gpao-t-* element names and keep openclaw-* aliases until all bundles import the new names.",
      rollback: "Keep old aliases active.",
    },
    {
      id: "notification_tag_cutover",
      action: "Use gpao-t-notification tag while accepting old notification close events.",
      rollback: "Use previous tag.",
    },
  ],
  applyBoundary: {
    liveWrite: "blocked_without_explicit_apply_tool_and_backup_manifest",
    sessionLoss: "not_allowed",
    tokenExposure: "not_allowed",
    destructiveDelete: "not_allowed",
  },
};

export function buildGpaoTRuntimeNamespaceMigrationPlan() {
  return MIGRATION_PLAN;
}

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

const DEFAULT_LEGACY_CUSTOM_ELEMENTS = [
  "openclaw-agent-select",
  "openclaw-app",
  "openclaw-tooltip",
];

async function collectRuntimeFiles(root) {
  const entries = await readdir(root).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) {
      files.push(...await collectRuntimeFiles(path));
    } else if (info.isFile() && /\.(js|html|css|json|webmanifest|svg)$/.test(path)) {
      files.push(path);
    }
  }
  return files;
}

export function extractLegacyCustomElementNames(source = "") {
  const names = new Set();
  const patterns = [
    /customElements(?:\.get)?\([`'"](openclaw-[a-z0-9-]+)[`'"]\)/g,
    /customElements\.define\([`'"](openclaw-[a-z0-9-]+)[`'"]/g,
    /<\/?(openclaw-[a-z0-9-]+)(?=[\s>])/g,
    /[`'"](openclaw-[a-z0-9-]+)[`'"]/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

async function collectLegacyCustomElementNames(root) {
  const files = await collectRuntimeFiles(root);
  const names = new Set(DEFAULT_LEGACY_CUSTOM_ELEMENTS);
  for (const file of files) {
    const source = await readFile(file, "utf8").catch(() => "");
    for (const name of extractLegacyCustomElementNames(source)) {
      names.add(name);
    }
  }
  return [...names].sort();
}

export function buildNamespaceMirrorScript({ legacyCustomElements = DEFAULT_LEGACY_CUSTOM_ELEMENTS } = {}) {
  const legacyElementNames = [...new Set([...DEFAULT_LEGACY_CUSTOM_ELEMENTS, ...legacyCustomElements])]
    .filter((name) => /^openclaw-[a-z0-9-]+$/.test(name))
    .sort();
  return `
    <script data-gpao-t="${NAMESPACE_MARKER}">
      (function () {
        if (window.${NAMESPACE_MARKER}) return;
        window.${NAMESPACE_MARKER} = true;
        window.${CUSTOM_ELEMENT_ALIAS_MARKER} = true;
        var legacyElementNames = ${JSON.stringify(legacyElementNames)};

        function gpaoKeyFor(key) {
          return typeof key === "string" && key.indexOf("openclaw.") === 0
            ? "gpao-t." + key.slice("openclaw.".length)
            : "";
        }

        function legacyKeyFor(key) {
          return typeof key === "string" && key.indexOf("gpao-t.") === 0
            ? "openclaw." + key.slice("gpao-t.".length)
            : "";
        }

        function mirrorStore(store) {
          if (!store || typeof store.length !== "number") return;
          var keys = [];
          for (var index = 0; index < store.length; index += 1) {
            var key = store.key(index);
            if (key) keys.push(key);
          }
          for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            var gpaoKey = gpaoKeyFor(key);
            if (gpaoKey && store.getItem(gpaoKey) === null) {
              store.setItem(gpaoKey, store.getItem(key));
            }
            var legacyKey = legacyKeyFor(key);
            if (legacyKey && store.getItem(legacyKey) === null) {
              store.setItem(legacyKey, store.getItem(key));
            }
          }
        }

        function defineAlias(newName, oldName) {
          if (!window.customElements || customElements.get(newName)) return;
          customElements.define(
            newName,
            class extends HTMLElement {
              connectedCallback() {
                if (!this.isConnected || this.__gpaoTAliasMoved) return;
                this.__gpaoTAliasMoved = true;
                var target = document.createElement(oldName);
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

        try {
          mirrorStore(window.localStorage);
          mirrorStore(window.sessionStorage);
          for (var aliasIndex = 0; aliasIndex < legacyElementNames.length; aliasIndex += 1) {
            var oldName = legacyElementNames[aliasIndex];
            defineAlias(oldName.replace(/^openclaw-/, "gpao-t-"), oldName);
          }
        } catch (error) {}
      })();
    </script>`;
}

export function patchIndexHtmlNamespaceSource(source, options = {}) {
  const script = buildNamespaceMirrorScript(options);
  const existingScriptPattern = new RegExp(
    `\\n    <script data-gpao-t="${NAMESPACE_MARKER}">[\\s\\S]*?\\n    </script>`,
  );
  if (existingScriptPattern.test(source)) {
    return source.replace(existingScriptPattern, script);
  }
  return source.replace("    <script>", `${script}\n    <script>`);
}

export function patchServiceWorkerNamespaceSource(source) {
  let next = source;
  if (!next.includes('const LEGACY_CACHE_PREFIX = "openclaw-control-";')) {
    next = next.replace(
      'const CACHE_PREFIX = "openclaw-control-";',
      'const CACHE_PREFIX = "gpao-t-control-";\nconst LEGACY_CACHE_PREFIX = "openclaw-control-";',
    );
  }
  next = next.replace(
    "const controlKeys = cacheKeys.filter((key) => key.startsWith(CACHE_PREFIX));",
    "const controlKeys = cacheKeys.filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith(LEGACY_CACHE_PREFIX));",
  );
  next = next.replace('tag: data.tag || "openclaw-notification",', 'tag: data.tag || "gpao-t-notification",');
  return next;
}

async function backupFile({ file, backupDir, name }) {
  const destination = join(backupDir, name);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
  return destination;
}

async function main() {
  const apply = hasArg("--apply");
  const token = readArg("--token");
  const stamp = isoStamp();
  const backupDir = join(BACKUP_ROOT, stamp);

  const indexBefore = await readFile(CONTROL_UI_INDEX_HTML, "utf8").catch(() => "");
  const swBefore = await readFile(CONTROL_UI_SW, "utf8").catch(() => "");
  const legacyCustomElements = await collectLegacyCustomElementNames(CONTROL_UI_ROOT);
  const indexAfter = patchIndexHtmlNamespaceSource(indexBefore, { legacyCustomElements });
  const swAfter = patchServiceWorkerNamespaceSource(swBefore);
  const changes = [
    {
      file: CONTROL_UI_INDEX_HTML,
      backupName: "index.before.html",
      changed: indexBefore !== indexAfter,
      beforeSha256: sha256(indexBefore),
      afterSha256: sha256(indexAfter),
      migration: ["storage_key_mirror", "custom_element_alias"],
      legacyCustomElementAliasCount: legacyCustomElements.length,
    },
    {
      file: CONTROL_UI_SW,
      backupName: "sw.before.js",
      changed: swBefore !== swAfter,
      beforeSha256: sha256(swBefore),
      afterSha256: sha256(swAfter),
      migration: ["service_worker_cache_prefix", "notification_tag"],
    },
  ];
  const changed = changes.some((change) => change.changed);
  const manifest = {
    schema: "gpao_t.runtime_namespace_migration_manifest.v0_1",
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    liveRoot: LIVE_ROOT,
    controlUiRoot: CONTROL_UI_ROOT,
    backupDir: apply && changed ? backupDir : null,
    applyToken: APPLY_TOKEN,
    plan: buildGpaoTRuntimeNamespaceMigrationPlan(),
    changed,
    changes,
    liveMutationExecuted: false,
  };

  if (!apply) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (token !== APPLY_TOKEN) {
    console.error(JSON.stringify({
      schema: "gpao_t.runtime_namespace_migration_refusal.v0_1",
      status: "refused",
      reason: "missing_or_invalid_apply_token",
      required: `--apply --token ${APPLY_TOKEN}`,
      liveMutationExecuted: false,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (changed) {
    await mkdir(backupDir, { recursive: true });
    await backupFile({ file: CONTROL_UI_INDEX_HTML, backupDir, name: "index.before.html" });
    await backupFile({ file: CONTROL_UI_SW, backupDir, name: "sw.before.js" });
    await writeFile(CONTROL_UI_INDEX_HTML, indexAfter);
    await writeFile(CONTROL_UI_SW, swAfter);
    await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify({ ...manifest, liveMutationExecuted: true }, null, 2)}\n`);
  }

  console.log(JSON.stringify({ ...manifest, liveMutationExecuted: changed }, null, 2));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
