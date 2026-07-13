#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFile, lstat, mkdir, readlink, readdir, stat, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function packagePath(root, name) {
  return join(root, "node_modules", ...name.split("/"));
}

function parseMissingPackage(output) {
  const name =
    /Cannot find package '([^']+)'/u.exec(output)?.[1] ??
    /Cannot find module '([^']+)'/u.exec(output)?.[1] ??
    null;
  return name?.startsWith("@gpao-t/") ? name.replace(/^@gpao-t\//u, "@openclaw/") : name;
}

async function copyPackage(sourceRoot, stageRoot, name) {
  const source = packagePath(sourceRoot, name);
  const target = packagePath(stageRoot, name);
  if (!(await exists(source))) throw new Error(`source dependency not found: ${name}`);
  async function copyEntry(from, to) {
    const info = await lstat(from);
    if (info.isDirectory()) {
      await mkdir(to, { recursive: true });
      const entries = await readdir(from);
      for (const entry of entries) await copyEntry(join(from, entry), join(to, entry));
    } else if (info.isSymbolicLink()) {
      await mkdir(dirname(to), { recursive: true });
      const link = await readlink(from);
      try {
        await symlink(link, to);
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
    } else if (info.isFile()) {
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
    }
  }
  await copyEntry(source, target);
}

async function main() {
  const sourceRoot = resolve(arg("--source-root"));
  const stageRoot = resolve(arg("--stage-root"));
  const command = arg("--", null);
  const maxIterations = Number(arg("--max", "50"));
  const runArgsIndex = process.argv.indexOf("--");
  if (runArgsIndex === -1) throw new Error("usage: -- <command> [args...] is required");
  const runArgs = process.argv.slice(runArgsIndex + 1);
  const copied = [];

  for (let index = 0; index < maxIterations; index += 1) {
    const result = spawnSync(runArgs[0], runArgs.slice(1), {
      cwd: stageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0) {
      console.log(JSON.stringify({ status: "passed", iterations: index, copied }, null, 2));
      return;
    }
    const output = `${result.stdout}\n${result.stderr}`;
    const missing = parseMissingPackage(output);
    if (!missing) {
      process.stderr.write(output);
      throw new Error(`command failed without missing package diagnostic: ${runArgs.join(" ")}`);
    }
    if (copied.includes(missing)) {
      process.stderr.write(output);
      throw new Error(`missing package repeated after copy: ${missing}`);
    }
    process.stderr.write(`[stage-missing-deps] ${missing}\n`);
    await copyPackage(sourceRoot, stageRoot, missing);
    copied.push(missing);
  }
  throw new Error(`dependency staging exceeded ${maxIterations} iterations`);
}

await main();
