#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, realpath, rm, writeFile, chmod } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  collectTree,
  createZipArchive,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const VERSION = GPAO_T_RELEASE_CONTRACT.version;
const INSTALLER_MANIFEST = "GPAO-T-INSTALLER-MANIFEST.json";
const execFileAsync = promisify(execFile);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function hashFile(pathname) {
  const hash = createHash("sha256");
  const data = await readFile(pathname);
  hash.update(data);
  return hash.digest("hex");
}

async function copyFile(source, destination, mode) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  if (mode) await chmod(destination, mode);
}

async function copyTemplate(source, destination, replacements, mode) {
  let text = await readFile(source, "utf8");
  for (const [needle, replacement] of Object.entries(replacements)) text = text.replaceAll(needle, replacement);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, text);
  if (mode) await chmod(destination, mode);
}

function normalizeArchitecture(value) {
  if (value === "x86_64") return "x64";
  if (value === "arm64") return "arm64";
  return value;
}

async function inspectNodeArchitectures(pathname) {
  const { stdout = "", stderr = "" } = await execFileAsync("lipo", ["-info", pathname], { encoding: "utf8" });
  const output = `${stdout}\n${stderr}`;
  const fat = output.match(/are:\s+(.+)$/m);
  if (fat) return fat[1].trim().split(/\s+/u).map(normalizeArchitecture).sort();
  const thin = output.match(/architecture:\s*(\S+)/u);
  if (thin) return [normalizeArchitecture(thin[1])];
  throw new Error(`Unable to determine Node architecture: ${pathname}`);
}

async function resolveNodeRuntime({ nodeSource, nodeSourceArm64, nodeSourceX64, outputPath }) {
  await mkdir(dirname(outputPath), { recursive: true });
  const explicit = {
    arm64: nodeSourceArm64 ? await realpath(resolve(nodeSourceArm64)) : null,
    x64: nodeSourceX64 ? await realpath(resolve(nodeSourceX64)) : null,
  };
  const primary = await realpath(resolve(nodeSource ?? process.execPath));
  const primaryArchitectures = await inspectNodeArchitectures(primary);
  if (primaryArchitectures.includes("arm64") && primaryArchitectures.includes("x64")) {
    await copyFile(primary, outputPath, 0o700);
    return { architecture: "universal", architectures: primaryArchitectures, sources: { universal: primary } };
  }
  if (!explicit.arm64 && primaryArchitectures.includes("arm64")) explicit.arm64 = primary;
  if (!explicit.x64 && primaryArchitectures.includes("x64")) explicit.x64 = primary;
  const slices = Object.entries(explicit).filter(([, pathname]) => pathname);
  for (const [architecture, pathname] of slices) {
    const actual = await inspectNodeArchitectures(pathname);
    if (!actual.includes(architecture)) throw new Error(`Node source ${pathname} is not a ${architecture} binary`);
  }
  if (explicit.arm64 && explicit.x64) {
    await execFileAsync("lipo", ["-create", explicit.arm64, explicit.x64, "-output", outputPath]);
    await chmod(outputPath, 0o700);
    return { architecture: "universal", architectures: ["arm64", "x64"], sources: explicit };
  }
  if (slices.length !== 1) throw new Error("A macOS installer needs an arm64 Node, an x64 Node, or both for a universal package");
  const [architecture, pathname] = slices[0];
  await copyFile(pathname, outputPath, 0o700);
  return { architecture, architectures: [architecture], sources: { [architecture]: pathname } };
}

export async function buildMacosInstaller({
  distribution,
  output,
  archive,
  nodeSource = process.execPath,
  nodeSourceArm64 = null,
  nodeSourceX64 = null,
}) {
  if (process.platform !== "darwin") throw new Error("The GPAO-T macOS installer must be built on macOS");
  const sourceDistribution = resolve(distribution);
  const outputRoot = resolve(output);
  const archivePath = resolve(archive);
  await verifyDistributionManifest(sourceDistribution);

  await rm(outputRoot, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(outputRoot, { recursive: true });

  const packagedDistribution = join(outputRoot, `gpao-t-${VERSION}`);
  await cp(sourceDistribution, packagedDistribution, { recursive: true, verbatimSymlinks: true });
  const nodeRuntimePath = join(outputRoot, "runtime", "node");
  const runtime = await resolveNodeRuntime({ nodeSource, nodeSourceArm64, nodeSourceX64, outputPath: nodeRuntimePath });
  await copyTemplate(
    join(PROJECT_ROOT, "installer", "GPAO-T-Install.command"),
    join(outputRoot, "GPAO-T-Install.command"),
    { "@@PACKAGE_ARCH@@": runtime.architecture, "@@PACKAGE_VERSION@@": VERSION },
    0o755,
  );
  await copyFile(join(PROJECT_ROOT, "installer", "MACOS-README.md"), join(outputRoot, "README.md"));

  const installerSources = [
    ["installer/gpao-t-macos-local.mjs", "installer/gpao-t-macos-local.mjs"],
    ["installer/ai.nbeai.gpao-t.plist.template", "installer/ai.nbeai.gpao-t.plist.template"],
    ["tools/gpao-t-local-install-lib.mjs", "tools/gpao-t-local-install-lib.mjs"],
    ["src/core/provider-auth-heart.js", "src/core/provider-auth-heart.js"],
    ["src/core/model-connection-settings.js", "src/core/model-connection-settings.js"],
    ["src/core/doctor-recovery-heart.js", "src/core/doctor-recovery-heart.js"],
  ];
  for (const [source, destination] of installerSources) {
    await copyFile(join(PROJECT_ROOT, source), join(outputRoot, destination));
  }
  await copyFile(join(PROJECT_ROOT, "LICENSE"), join(outputRoot, "LICENSE"));
  await copyFile(join(PROJECT_ROOT, "THIRD_PARTY_NOTICES.md"), join(outputRoot, "THIRD_PARTY_NOTICES.md"));

  const files = await collectTree(outputRoot, { skipManifest: true });
  const manifest = {
    schema: "gpao_t.macos_installer_manifest.v1",
    productId: GPAO_T_RELEASE_CONTRACT.productId,
    product: "nBeAI. GPAO-T",
    version: VERSION,
    platform: "macos",
    architecture: runtime.architecture,
    generatedAt: new Date().toISOString(),
    entrypoint: "GPAO-T-Install.command",
    runtimeNode: {
      path: "runtime/node",
      sources: runtime.sources,
      architectures: runtime.architectures,
      sha256: await hashFile(nodeRuntimePath),
    },
    distribution: {
      path: `gpao-t-${VERSION}`,
      manifest: JSON.parse(await readFile(join(packagedDistribution, "GPAO-T-DISTRIBUTION-MANIFEST.json"), "utf8")),
    },
    fileCount: files.length,
    totalBytes: files.reduce((sum, item) => sum + (item.size ?? 0), 0),
    files,
  };
  await writeFile(join(outputRoot, INSTALLER_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  const archiveRecord = await createZipArchive(outputRoot, archivePath);
  const checksumPath = `${archivePath}.sha256`;
  await writeFile(checksumPath, `${archiveRecord.sha256}  ${archivePath.slice(archivePath.lastIndexOf("/") + 1)}\n`);
  return {
    output: outputRoot,
    archive: archiveRecord.path,
    archiveSha256: archiveRecord.sha256,
    checksum: checksumPath,
    manifestPath: join(outputRoot, INSTALLER_MANIFEST),
    architecture: runtime.architecture,
    architectures: runtime.architectures,
    nodeVersion: process.version,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distribution = resolve(arg("--distribution", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${VERSION}`)));
  const output = resolve(arg("--output", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${VERSION}-macos-installer`)));
  const archive = resolve(arg("--archive", `${output}.zip`));
  const report = await buildMacosInstaller({
    distribution,
    output,
    archive,
    nodeSource: arg("--node-source", process.execPath),
    nodeSourceArm64: arg("--node-source-arm64", null),
    nodeSourceX64: arg("--node-source-x64", null),
  });
  console.log(JSON.stringify({ status: "sealed", ...report }, null, 2));
}
