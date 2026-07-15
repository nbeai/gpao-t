import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const required = ["src/index.js", "src/ui/index.html", "src/ui/app.js", "src/ui/app.css"];
const files = required.map(relative => {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Missing native runtime build input: ${relative}`);
  return { path: relative, sha256: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") };
});
const output = path.join(root, ".gpao-t", "build");
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(output, "native-build-manifest.json"), `${JSON.stringify({ schema: "gpao_t.native_build_manifest.v1", createdAt: new Date().toISOString(), files }, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ schema: "gpao_t.native_build.v1", status: "passed", files: files.map(file => file.path) }, null, 2));
