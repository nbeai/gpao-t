import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuntimeError } from "./errors.js";

export const LIVE_STATE_DIR = path.resolve(os.homedir(), ".gpao-t");
export const LIVE_SOURCE_DIR = path.resolve("/Users/jyp/Developer/gpao-t");

export function defaultStateDir() {
  return path.resolve(process.env.GPAO_T_STATE_DIR || path.join(os.homedir(), ".gpao-t-next"));
}

export function assertSafeStateDir(input) {
  const stateDir = path.resolve(input || defaultStateDir());
  if (stateDir === LIVE_STATE_DIR || stateDir === LIVE_SOURCE_DIR || stateDir.startsWith(`${LIVE_STATE_DIR}${path.sep}`)) {
    throw new RuntimeError("protected_live_path", "Native Runtime cannot use the live GPAO-T path", 409);
  }
  if (stateDir.includes(`${path.sep}.openclaw${path.sep}`) || stateDir.endsWith(`${path.sep}.openclaw`)) {
    throw new RuntimeError("foreign_state_path", "Native Runtime cannot use an OpenClaw state path", 409);
  }
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(stateDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new RuntimeError("unsafe_state_path", "Native Runtime state path must be a real directory", 409);
  }
  fs.chmodSync(stateDir, 0o700);
  return stateDir;
}

export function assertFileMode(file, mode) {
  const stat = fs.statSync(file);
  if ((stat.mode & 0o777) !== mode) {
    throw new RuntimeError("unsafe_permissions", `${path.basename(file)} must use mode ${mode.toString(8)}`, 500);
  }
}
