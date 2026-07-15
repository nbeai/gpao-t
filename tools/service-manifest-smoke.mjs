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
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-service-smoke-"));
const installRoot = path.join(temporary, "install");
const stateDir = path.join(temporary, "state");
const agentsDir = path.join(temporary, "LaunchAgents");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

const archive = path.join(releases, manifest.archive);
const install = JSON.parse(run(process.execPath, [path.join(root, "tools", "install-native.mjs"), "--archive", archive, "--manifest", manifestPath, "--install-root", installRoot, "--state-dir", stateDir]));
const launcher = path.join(installRoot, "bin", "gpao-t3");
const installed = JSON.parse(run(launcher, ["service", "install", "--launch-agents-dir", agentsDir]));
const status = JSON.parse(run(launcher, ["service", "status", "--launch-agents-dir", agentsDir]));
const removed = JSON.parse(run(launcher, ["service", "remove", "--launch-agents-dir", agentsDir]));
if (!installed.installed || installed.activated || !status.installed || status.active || removed.installed) throw new Error("Service manifest lifecycle contract failed");
const node = path.join(installRoot, "releases", install.releaseId, "runtime", "bin", "node");
run(node, [path.join(installRoot, "releases", install.releaseId, "tools", "uninstall-native.mjs"), "--install-root", installRoot, "--confirm"]);
console.log(JSON.stringify({ schema: "gpao_t3.service_manifest_smoke.v1", manifestInstall: "pass", activation: "not_requested", statusReadback: "inactive", removal: "pass", statePreserved: fs.existsSync(stateDir) }, null, 2));
