import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const installDir = path.resolve(arg("--install-root", arg("--install-dir", "")));
if (!installDir || !fs.existsSync(installDir)) throw new Error("A readable --install-root is required");
if (process.argv.includes("--confirm") === false) throw new Error("Uninstall requires --confirm");
const receiptPath = path.join(installDir, "INSTALL-RECEIPT.json");
if (!fs.existsSync(receiptPath)) throw new Error("Refusing to remove a directory without a GPAO-T3 install receipt");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
if (receipt.schema !== "gpao_t3.install_receipt.v2") throw new Error("Install receipt is not valid");
fs.rmSync(installDir, { recursive: true, force: false, maxRetries: 2 });
console.log(JSON.stringify({ schema: "gpao_t3.uninstall_receipt.v2", removedAt: new Date().toISOString(), installRoot: installDir, stateDirPreserved: receipt.stateDir }, null, 2));
