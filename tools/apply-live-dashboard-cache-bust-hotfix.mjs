#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const liveRoot =
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";
const indexPath = path.join(liveRoot, "index.html");
const marker = "gpao_runtime_recovery=20260712T2135";

const html = fs.readFileSync(indexPath, "utf8");
const before = html;
const next = html.replace(
  /(<script type="module" crossorigin src="\.\/assets\/index-[^"?]+\.js)(?:\?[^"]*)?("><\/script>)/,
  `$1?${marker}$2`,
);

if (next === before) {
  throw new Error("Could not apply GPAO-T runtime cache-bust hotfix to live index.html");
}

fs.writeFileSync(indexPath, next);

const evidenceDir = path.join(
  process.cwd(),
  "docs/03-verification/evidence/live-dashboard-cache-bust-hotfix",
);
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(
  path.join(evidenceDir, "2026-07-12T21-35-00-kst.json"),
  `${JSON.stringify(
    {
      schema: "gpao_t.live_dashboard_cache_bust_hotfix.v1",
      generatedAt: new Date().toISOString(),
      liveRoot,
      indexPath,
      marker,
      reason:
        "Safari kept a stale broken main module after the broad standalone namespace rebuild was rolled back. Force the restored live main module to load with a recovery query.",
      scope: ["live control-ui index.html main module src only"],
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      status: "applied",
      indexPath,
      marker,
    },
    null,
    2,
  ),
);
