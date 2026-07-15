import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releases = path.join(root, ".gpao-t3", "releases");
const feed = JSON.parse(fs.readFileSync(path.join(releases, "update-feed.json"), "utf8"));
const latest = feed.releases.find(entry => entry.platform === `${process.platform}-${process.arch}`);
const distribution = fs.readdirSync(releases).filter(name => name.endsWith(`-${process.platform}-${process.arch}`)).find(name => {
  try { return JSON.parse(fs.readFileSync(path.join(releases, name, "DISTRIBUTION.json"), "utf8")).releaseId === latest?.releaseId; }
  catch { return false; }
});
if (!distribution) throw new Error("A macOS GPAO-T3 distribution directory is required");
const directory = path.join(releases, distribution);
const descriptor = JSON.parse(fs.readFileSync(path.join(directory, "DISTRIBUTION.json"), "utf8"));
const home = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-installer-home-"));
const installer = path.join(directory, descriptor.installer);
const result = spawnSync(installer, [], { encoding: "utf8", env: { ...process.env, HOME: home, GPAO_T3_INSTALL_NO_ACTIVATE: "1", GPAO_T3_INSTALL_NO_OPEN: "1" } });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "설치.command failed");
const installRoot = path.join(home, ".local", "share", "gpao-t3");
const stateDir = path.join(home, ".gpao-t3");
const launcher = path.join(installRoot, "bin", "gpao-t3");
const verify = spawnSync(launcher, ["verify-turn", "--state-dir", stateDir], { encoding: "utf8", env: { ...process.env, HOME: home } });
if (verify.status !== 0 || JSON.parse(verify.stdout).status !== "succeeded") throw new Error(verify.stderr || verify.stdout || "Installed launcher verification failed");
const receipt = JSON.parse(fs.readFileSync(path.join(installRoot, "INSTALL-RECEIPT.json"), "utf8"));
const node = path.join(installRoot, "releases", receipt.releaseId, "runtime", "bin", "node");
const uninstall = spawnSync(node, [path.join(installRoot, "releases", receipt.releaseId, "tools", "uninstall-native.mjs"), "--install-root", installRoot, "--confirm"], { encoding: "utf8" });
if (uninstall.status !== 0 || fs.existsSync(installRoot) || !fs.existsSync(stateDir)) throw new Error(uninstall.stderr || "Installer smoke cleanup failed");
console.log(JSON.stringify({ schema: "gpao_t3.installer_command_smoke.v1", distribution: descriptor.releaseId, installer: "double_click_command", bundledRuntime: receipt.bundledRuntime.nodeVersion, verificationTurn: "succeeded", serviceActivation: "skipped_in_smoke", dashboardOpen: "skipped_in_smoke", uninstall: "pass", statePreserved: true }, null, 2));
