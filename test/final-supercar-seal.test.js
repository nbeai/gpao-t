import { mkdtemp, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { auditPackageIntegrity } from "../tools/audit-gpao-t-final-supercar-seal.mjs";

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("auditPackageIntegrity accepts a manifest-backed local package", async () => {
  const packageRoot = await mkdtemp(join(tmpdir(), "gpao-t-package-"));
  const packageBase = "gpao-t-owner-ops-0.1.0-local-candidate";
  const archiveBody = "local package archive";
  const archiveName = `${packageBase}.zip`;
  const bundleName = `${packageBase}.bundle.json`;
  const manifestName = `${packageBase}.manifest.json`;

  await writeFile(join(packageRoot, archiveName), archiveBody);
  await writeFile(join(packageRoot, `${archiveName}.sha256`), `${sha256Text(archiveBody)}  ${archiveName}\n`);
  await writeFile(join(packageRoot, bundleName), JSON.stringify({ schema: "test.bundle" }));
  await writeFile(
    join(packageRoot, manifestName),
    JSON.stringify({
      archiveName,
      bundleFile: bundleName,
      fileCount: 1,
    }),
  );

  const audit = await auditPackageIntegrity({ packageRoot, packageBase });

  assert.equal(audit.status, "ready");
  assert.equal(audit.checks.every((check) => check.status === "ready"), true);
});

test("auditPackageIntegrity blocks hash drift", async () => {
  const packageRoot = await mkdtemp(join(tmpdir(), "gpao-t-package-"));
  const packageBase = "gpao-t-owner-ops-0.1.0-local-candidate";
  const archiveName = `${packageBase}.zip`;
  const bundleName = `${packageBase}.bundle.json`;
  const manifestName = `${packageBase}.manifest.json`;

  await writeFile(join(packageRoot, archiveName), "changed archive");
  await writeFile(join(packageRoot, `${archiveName}.sha256`), `deadbeef  ${archiveName}\n`);
  await writeFile(join(packageRoot, bundleName), JSON.stringify({ schema: "test.bundle" }));
  await writeFile(
    join(packageRoot, manifestName),
    JSON.stringify({
      archiveName,
      bundleFile: bundleName,
      fileCount: 1,
    }),
  );

  const audit = await auditPackageIntegrity({ packageRoot, packageBase });

  assert.equal(audit.status, "blocked");
  assert.equal(audit.checks.find((check) => check.id === "archive_sha256").status, "blocked");
});
