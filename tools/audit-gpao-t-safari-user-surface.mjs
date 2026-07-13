#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const DEFAULT_ROUTES = [
  "/chat",
  "/sessions",
  "/settings",
  "/agents",
  "/skills",
  "/nodes",
  "/dreaming",
  "/documents",
];

const DEFAULT_FORBIDDEN = [
  "OpenClaw",
  "Gateway",
  "ClawHub",
  "Control UI",
  "openclaw",
  "Gateway 상태",
  "Open session menu",
  "Assistant",
  "assistant",
  "Assistants",
  "Keep Last Assistants",
  "Clawdette",
  "Skills",
  "Skill Workshop",
  "openclaw-absorption",
  "admission",
  "replay",
  "Replay",
  "rollback",
  "OpenClaw session row",
];

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

function runSafariJs(js) {
  const escaped = js.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `tell application "Safari" to do JavaScript "${escaped}" in front document`;
  const shellScript = script.replace(/'/g, "'\\''");
  return execSync(`osascript -e '${shellScript}'`, { encoding: "utf8", shell: "/bin/zsh" }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function routeUrl(base, route) {
  return new URL(route, base).href;
}

async function main() {
  const out = readArg("--out");
  const delayMs = Number(readArg("--delay-ms", "1800"));
  const routes = readArg("--routes")
    ? readArg("--routes").split(",").map((route) => route.trim()).filter(Boolean)
    : DEFAULT_ROUTES;
  const forbidden = readArg("--forbidden")
    ? readArg("--forbidden").split(",").map((item) => item.trim()).filter(Boolean)
    : DEFAULT_FORBIDDEN;
  const restore = !hasArg("--no-restore");

  const start = JSON.parse(runSafariJs("JSON.stringify({href: location.href, origin: location.origin})"));
  const results = [];

  for (const route of routes) {
    const target = routeUrl(start.origin, route);
    runSafariJs(`location.href = ${JSON.stringify(target)}; "ok";`);
    await sleep(delayMs);
    const audit = JSON.parse(runSafariJs(`
      (() => {
        const forbidden = ${JSON.stringify(forbidden)};
        const roots = [];
        const collect = (root) => {
          if (!root) return;
          roots.push(root);
          for (const node of root.querySelectorAll ? root.querySelectorAll("*") : []) {
            if (node.shadowRoot) collect(node.shadowRoot);
          }
        };
        collect(document);
        const visibleHits = [];
        const hiddenHits = [];
        const sample = [];
        for (const root of roots) {
          for (const node of root.querySelectorAll ? root.querySelectorAll("*") : []) {
            const tag = node.tagName || "";
            if (["SCRIPT", "STYLE", "HEAD", "META", "LINK"].includes(tag)) continue;
            const computed = getComputedStyle(node);
            const text = (node.innerText || node.textContent || "").trim();
            const aria = node.getAttribute?.("aria-label") || "";
            const title = node.getAttribute?.("title") || "";
            const combined = [text, aria, title].join(" ");
            if (text && sample.length < 10) {
              sample.push(text.slice(0, 180));
            }
            if (!combined || !forbidden.some((item) => combined.includes(item))) continue;
            const hit = {
              tag,
              className: String(node.className || "").slice(0, 120),
              aria,
              title,
              text: text.slice(0, 260),
              hidden: node.hidden,
              display: computed.display,
              visibility: computed.visibility,
              height: computed.height,
            };
            if (node.hidden || computed.display === "none" || computed.visibility === "hidden") hiddenHits.push(hit);
            else visibleHits.push(hit);
          }
        }
        return JSON.stringify({
          title: document.title,
          url: location.href,
          visibleHitCount: visibleHits.length,
          visibleHits: visibleHits.slice(0, 30),
          hiddenHitCount: hiddenHits.length,
          hiddenHits: hiddenHits.slice(0, 10),
          sample,
        });
      })()
    `));
    results.push({ route, target, ...audit });
  }

  if (restore) {
    runSafariJs(`location.href = ${JSON.stringify(start.href)}; "restored";`);
  }

  const report = {
    schema: "gpao_t.safari_user_surface_audit.v0_1",
    status: results.every((result) => result.visibleHitCount === 0) ? "ready" : "review",
    createdAt: new Date().toISOString(),
    startUrl: start.href,
    routes,
    forbidden,
    results,
  };

  const json = JSON.stringify(report, null, 2);
  if (out) await writeFile(out, `${json}\n`);
  console.log(json);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
