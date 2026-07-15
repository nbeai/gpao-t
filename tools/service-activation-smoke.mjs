import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releases = path.join(root, ".gpao-t3", "releases");
const feed = JSON.parse(fs.readFileSync(path.join(releases, "update-feed.json"), "utf8"));
const latest = feed.releases.find(entry => entry.platform === `${process.platform}-${process.arch}`);
const manifestPath = latest ? path.join(releases, latest.archive.replace(/\.tar\.gz$/, ".manifest.json")) : null;
if (!manifestPath) throw new Error("Latest GPAO-T3 manifest is required");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-service-activation-"));
const installRoot = path.join(temporary, "install");
const stateDir = path.join(temporary, "state");
const agentsDir = path.join(temporary, "LaunchAgents");

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

async function waitForHealth(timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch("http://127.0.0.1:18899/health");
      if (response.ok) return response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Activated GPAO-T3 service did not become healthy");
}

let launcher = null;
let activated = false;
try {
  try {
    const occupied = await fetch("http://127.0.0.1:18899/health", { signal: AbortSignal.timeout(300) });
    if (occupied.ok) throw new Error("Port 18899 is already serving another runtime");
  } catch (error) {
    if (error.message?.includes("already serving")) throw error;
  }
  const archive = path.join(releases, manifest.archive);
  const install = JSON.parse(run(process.execPath, [path.join(root, "tools", "install-native.mjs"), "--archive", archive, "--manifest", manifestPath, "--install-root", installRoot, "--state-dir", stateDir]));
  launcher = path.join(installRoot, "bin", "gpao-t3");
  const service = JSON.parse(run(launcher, ["service", "install", "--activate", "--launch-agents-dir", agentsDir]));
  activated = service.activated === true;
  const health = await waitForHealth();
  const dashboard = await fetch("http://127.0.0.1:18899/");
  const html = await dashboard.text();
  if (!dashboard.ok || !html.includes("GPAO-T3")) throw new Error("Activated dashboard did not expose the GPAO-T3 product surface");
  run("/usr/bin/open", ["http://127.0.0.1:18899"]);
  await new Promise(resolve => setTimeout(resolve, 1_000));
  const status = JSON.parse(run(launcher, ["service", "status", "--launch-agents-dir", agentsDir]));
  if (!status.active) throw new Error("LaunchAgent status did not report active");
  console.log(JSON.stringify({ schema: "gpao_t3.service_activation_smoke.v1", service: service.service, activated: true, health: health.status, product: health.product, dashboard: "opened", statusReadback: "active" }, null, 2));
} finally {
  if (launcher && fs.existsSync(launcher)) run(launcher, ["service", "remove", "--launch-agents-dir", agentsDir], { allowFailure: true });
  if (fs.existsSync(installRoot)) {
    const receipt = JSON.parse(fs.readFileSync(path.join(installRoot, "INSTALL-RECEIPT.json"), "utf8"));
    const node = path.join(installRoot, "releases", receipt.releaseId, "runtime", "bin", "node");
    run(node, [path.join(installRoot, "releases", receipt.releaseId, "tools", "uninstall-native.mjs"), "--install-root", installRoot, "--confirm"], { allowFailure: true });
  }
  if (activated) await new Promise(resolve => setTimeout(resolve, 250));
}
