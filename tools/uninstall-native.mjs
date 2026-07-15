import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const installDir = path.resolve(arg("--install-dir", ""));
if (!installDir || !fs.existsSync(installDir)) throw new Error("A readable --install-dir is required");
if (process.argv.includes("--confirm") === false) throw new Error("Uninstall requires --confirm");
const receiptPath = path.join(installDir, "INSTALL-RECEIPT.json");
if (!fs.existsSync(receiptPath)) throw new Error("Refusing to remove a directory without a GPAO-T Native install receipt");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
if (receipt.schema !== "gpao_t.native_install_receipt.v1") throw new Error("Install receipt is not valid");
fs.rmSync(installDir, { recursive: true, force: false, maxRetries: 2 });
console.log(JSON.stringify({ schema: "gpao_t.native_uninstall_receipt.v1", removedAt: new Date().toISOString(), installDir, stateDirPreserved: receipt.stateDir }, null, 2));
