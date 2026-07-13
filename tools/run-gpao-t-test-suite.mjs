#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const CONTROL_CENTER_TEST = "test/control-center.test.js";
const CONTROL_CENTER_GROUPS = [
  "builds an inspectable|exposes local data|summarizes memory|builds a UI snapshot|exposes Control Center|renders a static|exposes static|keeps first Control|builds the first core|validates submission",
  "responsive visual|browser-safe|browser-local app-shell|renders the browser-local|packaged desktop Tauri|packaged desktop planning|read-mostly Tauri|app-shell-specific|packaged-shell visual|work-surface visual",
  "work-surface confirmation|first local draft|approval preview UX|design reference gate visual|design realization pass 001|design realization pass 002|execution approval UX|audit write design|approval record write UX",
  "serves the static Control Center",
  "runs serving smoke verification",
];

const testFiles = readdirSync("test")
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => join("test", file))
  .filter((file) => file !== CONTROL_CENTER_TEST)
  .sort();

run("node", [
  "--test",
  "--test-concurrency=1",
  "--test-timeout=600000",
  "--test-reporter=spec",
  ...testFiles,
]);

for (const pattern of CONTROL_CENTER_GROUPS) {
  run("node", [
    "--test",
    "--test-concurrency=1",
    "--test-timeout=420000",
    "--test-reporter=spec",
    `--test-name-pattern=${pattern}`,
    CONTROL_CENTER_TEST,
  ]);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
