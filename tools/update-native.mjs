import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const installRoot = path.resolve(arg("--install-root", path.join(os.homedir(), ".local", "share", "gpao-t3")));
const receiptPath = path.join(installRoot, "INSTALL-RECEIPT.json");
if (!fs.existsSync(receiptPath)) throw new Error("GPAO-T3 is not installed");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const feedPath = path.resolve(arg("--feed", ""));
if (!feedPath || !fs.existsSync(feedPath)) throw new Error("A readable release feed path is required");
const feed = JSON.parse(fs.readFileSync(feedPath, "utf8"));
if (feed.schema !== "gpao_t3.update_feed.v1" || feed.product !== "gpao-t3" || !Array.isArray(feed.releases)) throw new Error("Update feed identity is invalid");
const platform = `${process.platform}-${process.arch}`;
const next = feed.releases.find(entry => entry.schema === "gpao_t3.release_manifest.v2" && entry.product === "gpao-t3" && entry.platform === platform);
if (!next) throw new Error("No compatible GPAO-T3 release is available");
if (next.releaseId === receipt.releaseId) {
  console.log(JSON.stringify({ schema: "gpao_t3.update_receipt.v1", status: "up_to_date", releaseId: receipt.releaseId }, null, 2));
} else if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ schema: "gpao_t3.update_receipt.v1", status: "available", currentReleaseId: receipt.releaseId, nextReleaseId: next.releaseId, requiresApproval: true }, null, 2));
} else {
  const releasesRoot = path.dirname(feedPath);
  if (path.basename(next.archive) !== next.archive || !next.archive.endsWith(".tar.gz")) throw new Error("Update archive path is invalid");
  const archive = path.join(releasesRoot, next.archive);
  const manifest = path.join(releasesRoot, next.archive.replace(/\.tar\.gz$/, ".manifest.json"));
  const installer = path.join(installRoot, "releases", receipt.releaseId, "tools", "install-native.mjs");
  const result = spawnSync(process.execPath, [installer, "--archive", archive, "--manifest", manifest, "--install-root", installRoot, "--state-dir", receipt.stateDir], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "GPAO-T3 update failed");
  console.log(JSON.stringify({ schema: "gpao_t3.update_receipt.v1", status: "updated", install: JSON.parse(result.stdout) }, null, 2));
}
