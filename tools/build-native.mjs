import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const required = ["src/index.js", "src/ui/index.html", "src/ui/app.js", "src/ui/app.css", "src/ui/assets/gpao-t3-logo.jpeg"];
const files = required.map(relative => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Missing native runtime build input: ${relative}`);
  return { path: relative, sha256: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") };
});
const output = path.join(root, ".gpao-t3", "build");
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
if (process.platform === "darwin") {
  const bin = path.join(output, "bin");
  const helper = path.join(bin, "gpao-t3-keychain-helper");
  fs.mkdirSync(bin, { recursive: true, mode: 0o700 });
  const compiled = spawnSync("xcrun", ["swiftc", "-O", path.join(root, "native", "macos-keychain-helper.swift"), "-o", helper], { encoding: "utf8" });
  if (compiled.status !== 0) throw new Error("Failed to build the macOS Keychain helper");
  const signed = spawnSync("codesign", ["--force", "--sign", "-", helper], { encoding: "utf8" });
  if (signed.status !== 0) throw new Error("Failed to sign the macOS Keychain helper");
  fs.chmodSync(helper, 0o755);
}
fs.writeFileSync(path.join(output, "native-build-manifest.json"), `${JSON.stringify({ schema: "gpao_t3.native_build_manifest.v1", createdAt: new Date().toISOString(), files }, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ schema: "gpao_t3.native_build.v1", status: "passed", files: files.map(file => file.path) }, null, 2));
