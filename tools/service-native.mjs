import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function command(name, args, { allowFailure = false } = {}) {
  const result = spawnSync(name, args, { encoding: "utf8" });
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr || result.stdout || `${name} failed`);
  return result;
}

const action = process.argv[2] || "status";
const installRoot = path.resolve(arg("--install-root", path.join(os.homedir(), ".local", "share", "gpao-t3")));
const source = path.join(installRoot, "service", "ai.nbeai.gpao-t3.runtime.plist");
const agentsDir = path.resolve(arg("--launch-agents-dir", path.join(os.homedir(), "Library", "LaunchAgents")));
const destination = path.join(agentsDir, "ai.nbeai.gpao-t3.runtime.plist");
const domain = `gui/${process.getuid()}`;
const service = `${domain}/ai.nbeai.gpao-t3.runtime`;
if (process.platform !== "darwin") throw new Error("GPAO-T3 LaunchAgent service management currently requires macOS");

if (action === "install") {
  if (!fs.existsSync(source)) throw new Error("GPAO-T3 service manifest is missing");
  fs.mkdirSync(agentsDir, { recursive: true, mode: 0o700 });
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, 0o600);
  let activated = false;
  if (process.argv.includes("--activate")) {
    command("launchctl", ["bootout", service], { allowFailure: true });
    command("launchctl", ["bootstrap", domain, destination]);
    command("launchctl", ["kickstart", "-k", service]);
    activated = true;
  }
  console.log(JSON.stringify({ schema: "gpao_t3.service_receipt.v1", action, installed: true, activated, service: "ai.nbeai.gpao-t3.runtime", manifest: destination }, null, 2));
} else if (action === "remove") {
  command("launchctl", ["bootout", service], { allowFailure: true });
  if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
  console.log(JSON.stringify({ schema: "gpao_t3.service_receipt.v1", action, installed: false, activated: false, service: "ai.nbeai.gpao-t3.runtime" }, null, 2));
} else if (action === "status") {
  const result = command("launchctl", ["print", service], { allowFailure: true });
  console.log(JSON.stringify({ schema: "gpao_t3.service_status.v1", installed: fs.existsSync(destination), active: result.status === 0, service: "ai.nbeai.gpao-t3.runtime" }, null, 2));
} else {
  throw new Error(`Unknown service action: ${action}`);
}
