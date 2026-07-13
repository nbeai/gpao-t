#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function dependencyNames(pkg, { includeOptional }) {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...(includeOptional ? Object.keys(pkg.optionalDependencies ?? {}) : []),
  ];
}

async function copyPackage({ sourceRoot, stageRoot, name }) {
  const source = packagePath(sourceRoot, name);
  const target = packagePath(stageRoot, name);
  if (!(await exists(source))) throw new Error(`source dependency not found: ${name}`);
  await mkdir(dirname(target), { recursive: true });
  const sourceParent = dirname(source);
  const targetParent = dirname(target);
  const base = source.slice(sourceParent.length + 1);
  const tarball = join(tmpdir(), `gpao-t-stage-dep-${name.replaceAll("/", "__")}-${process.pid}.tar`);
  const pack = spawnSync("tar", ["-cf", tarball, "-C", sourceParent, base], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (pack.status !== 0) {
    await rm(tarball, { force: true });
    throw new Error(`tar pack failed for ${name}: ${(pack.stderr || pack.stdout).trim()}`);
  }
  const unpack = spawnSync("tar", ["-xf", tarball, "-C", targetParent], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  await rm(tarball, { force: true });
  if (unpack.status !== 0) {
    throw new Error(`tar unpack failed for ${name}: ${(unpack.stderr || unpack.stdout).trim()}`);
  }
}

async function main() {
  const sourceRoot = resolve(arg("--source-root"));
  const stageRoot = resolve(arg("--stage-root"));
  const includeOptional = process.argv.includes("--include-optional");
  const rootPackage = await readJson(join(stageRoot, "package.json"));
  const queue = dependencyNames(rootPackage, { includeOptional });
  const copied = new Set();
  const missing = [];

  while (queue.length > 0) {
    const name = queue.shift();
    if (!name || copied.has(name) || name.startsWith("@openclaw/")) continue;
    const source = packagePath(sourceRoot, name);
    if (!(await exists(source))) {
      missing.push(name);
      continue;
    }
    process.stderr.write(`[stage-runtime-deps] ${name}\n`);
    await copyPackage({ sourceRoot, stageRoot, name });
    copied.add(name);
    const packageJsonPath = join(source, "package.json");
    if (await exists(packageJsonPath)) {
      const pkg = await readJson(packageJsonPath);
      for (const dependency of dependencyNames(pkg, { includeOptional })) {
        if (!copied.has(dependency)) queue.push(dependency);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`missing dependencies: ${missing.sort().join(", ")}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "staged",
        sourceRoot,
        stageRoot,
        includeOptional,
        dependencyCount: copied.size,
        skippedWorkspacePackages: ["@openclaw/*"],
      },
      null,
      2,
    ),
  );
}

await main();
