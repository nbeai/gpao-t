#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIVE_CONTROL_UI =
  process.env.GPAO_T_LIVE_CONTROL_UI ||
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";
const DEFAULT_DOM_READBACK_EVIDENCE =
  process.env.GPAO_T_ROUTE_DOM_READBACK_EVIDENCE ||
  "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/GPAO-T-SAFARI-ROUTE-DOM-READBACK-2026-07-12.md";

const REQUIRED_ROUTES = [
  { id: "dashboard", path: "/", requiredLabels: ["nBeAI. GPAO-T"] },
  { id: "chat", path: "/chat", requiredLabels: ["nBeAI. GPAO-T"] },
  { id: "settings_general", path: "/settings/general", requiredLabels: ["설정"] },
  { id: "settings_profile", path: "/settings/profile", requiredLabels: ["프로필"] },
  { id: "settings_ai_agents", path: "/settings/ai-agents", requiredLabels: ["GPAO-T"] },
  { id: "agents", path: "/agents", requiredLabels: ["에이전트"] },
  { id: "skills", path: "/skills", requiredLabels: ["기능"] },
  { id: "nodes", path: "/nodes", requiredLabels: ["노드"] },
  { id: "dreaming", path: "/dreaming", requiredLabels: ["드리밍"] },
  { id: "documents", path: "/documents", requiredLabels: ["문서"] },
];

const FORBIDDEN_VISIBLE = [
  /OpenClaw mobile/,
  /Official OpenClaw/,
  /OpenClaw 모바일/,
  /공식 OpenClaw/,
  /ClawHub/,
  /clawhub/,
  /docs\.openclaw\.ai/,
  /Control UI did not start/,
  /Keep Last Assistants/,
  /Clawdette/,
];

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function extractTitle(html) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
}

function collectStaticBundleEvidence({ indexHtml, manifest, serviceWorker }) {
  const joined = [indexHtml, manifest, serviceWorker].join("\n");
  return {
    title: extractTitle(indexHtml),
    hasGpaoBrand: /nBeAI\. GPAO-T|GPAO-T/.test(joined),
    forbiddenMatches: FORBIDDEN_VISIBLE.flatMap((pattern) => {
      const matches = joined.match(pattern);
      return matches ? [{ pattern: String(pattern), match: matches[0] }] : [];
    }),
  };
}

function resultForEvidenceSection(section) {
  if (/Result:\s*passed/i.test(section)) return "passed";
  if (/Result:\s*redirect observed/i.test(section)) return "redirect_observed";
  return "";
}

export function parseSafariDomReadbackEvidence(markdown = "") {
  const routeEvidence = {};
  const headers = [...markdown.matchAll(/^### `([^`]+)`/gm)];
  headers.forEach((match, index) => {
    const path = match[1];
    const sectionStart = match.index + match[0].length;
    const sectionEnd = headers[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(sectionStart, sectionEnd);
    const result = resultForEvidenceSection(section);
    if (!result) return;
    routeEvidence[path] = {
      path,
      result,
      accepted: result === "passed" || result === "redirect_observed",
      source: "safari_dom_readback_markdown",
    };
  });
  if (routeEvidence["/chat"]?.accepted) {
    routeEvidence["/"] = {
      path: "/",
      result: "covered_by_chat_shell",
      accepted: true,
      source: "safari_dom_readback_markdown",
    };
  }
  return routeEvidence;
}

export async function runGpaoTDashboardRouteCrawl({
  liveRoot = DEFAULT_LIVE_CONTROL_UI,
  domReadbackEvidencePath = DEFAULT_DOM_READBACK_EVIDENCE,
  now = new Date().toISOString(),
} = {}) {
  const indexHtml = await readFile(join(liveRoot, "index.html"), "utf8").catch(() => "");
  const manifest = await readFile(join(liveRoot, "manifest.webmanifest"), "utf8").catch(() => "");
  const serviceWorker = await readFile(join(liveRoot, "sw.js"), "utf8").catch(() => "");
  const staticEvidence = collectStaticBundleEvidence({ indexHtml, manifest, serviceWorker });
  const domReadbackMarkdown = await readFile(domReadbackEvidencePath, "utf8").catch(() => "");
  const domReadbackEvidence = parseSafariDomReadbackEvidence(domReadbackMarkdown);
  const routes = REQUIRED_ROUTES.map((route) => ({
    ...route,
    crawlMode: "static_inventory_with_dom_readback_evidence",
    status: !staticEvidence.hasGpaoBrand
      ? "blocked"
      : domReadbackEvidence[route.path]?.accepted
        ? "dom_readback_accepted"
        : "inventory_ready",
    domReadback: domReadbackEvidence[route.path] || null,
    missingRequiredLabels: route.requiredLabels.filter((label) => ![indexHtml, manifest].join("\n").includes(label)),
  }));
  const routeFindings = routes.flatMap((route) => (
    route.missingRequiredLabels.length && !route.domReadback?.accepted
      ? [`route_${route.id}_needs_live_dom_readback`]
      : []
  ));
  const findings = [
    ...(staticEvidence.title.includes("nBeAI. GPAO-T") ? [] : ["browser_title_not_gpao_t"]),
    ...(staticEvidence.forbiddenMatches.length ? ["forbidden_static_visible_copy_found"] : []),
    ...routeFindings,
  ];
  const status = staticEvidence.forbiddenMatches.length || !staticEvidence.hasGpaoBrand
    ? "blocked"
    : findings.length
      ? "review"
      : "ready";
  return {
    schema: "gpao_t.dashboard_route_crawl.v1",
    generatedAt: now,
    liveRoot,
    status,
    staticEvidence,
    domReadbackEvidencePath,
    domReadbackEvidenceCount: Object.keys(domReadbackEvidence).length,
    routes,
    findings,
    nextVerification:
      status === "ready"
        ? "Route seal automation is connected to the current Safari DOM readback evidence. Re-run browser readback after each visible dashboard patch."
        : "Open Safari authenticated dashboard and capture DOM/visual evidence for every reported route finding.",
  };
}

async function main() {
  const liveRoot = readArg("--live-root", DEFAULT_LIVE_CONTROL_UI);
  const out = readArg("--out", "");
  const crawl = await runGpaoTDashboardRouteCrawl({ liveRoot });
  const json = `${JSON.stringify(crawl, null, 2)}\n`;
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
