import fs from "node:fs";
import path from "node:path";

const ACTIVE_FILES = [
  "src",
  "package.json",
  "README.md",
  "tools/build-native.mjs",
  "tools/package-release.mjs",
  "tools/install-native.mjs",
  "tools/uninstall-native.mjs",
  "tools/rollback-native.mjs",
  "tools/service-native.mjs",
  "tools/update-native.mjs",
  "tools/release-smoke.mjs"
];

const USER_SURFACE_FILES = new Set([
  "src/index.js",
  "src/core/http.js",
  "src/core/runtime.js",
  "src/core/presentation-status.js",
  "src/core/recovery-doctor.js",
  "src/core/repair-plan.js",
  "src/core/provider-catalog.js",
  "src/core/connector-catalog.js"
]);

const FORBIDDEN_ACTIVE = [
  { id: "legacy_schema", pattern: /gpao_t(?:\.|_)/g },
  { id: "legacy_state", pattern: /\.gpao-t-next/g },
  { id: "legacy_environment", pattern: /GPAO_T_/g },
  { id: "legacy_package", pattern: /gpao-t-native-runtime(?!-research)/g },
  { id: "legacy_runtime_name", pattern: /GPAO-T Native Runtime/g },
  { id: "external_runtime_identity", pattern: new RegExp("Open" + "Claw", "g") }
];

function filesUnder(root, relative, files = []) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return files;
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Identity audit refuses symbolic link: ${relative}`);
  if (stat.isFile()) {
    files.push(relative);
    return files;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    filesUnder(root, path.join(relative, entry.name), files);
  }
  return files;
}

export function auditProductIdentity(root) {
  const files = [...new Set(ACTIVE_FILES.flatMap(relative => filesUnder(root, relative)))].sort();
  const violations = [];
  for (const relative of files) {
    const text = fs.readFileSync(path.join(root, relative), "utf8");
    const isAuditDefinition = relative === path.join("src", "core", "identity-audit.js");
    if (!isAuditDefinition) {
      for (const rule of FORBIDDEN_ACTIVE) {
        for (const match of text.matchAll(rule.pattern)) violations.push({ rule: rule.id, file: relative, index: match.index });
      }
    }
    const userSurface = relative.startsWith(`src${path.sep}ui${path.sep}`) || USER_SURFACE_FILES.has(relative);
    if (userSurface) {
      for (const match of text.matchAll(/GPAO-T(?!3)/g)) violations.push({ rule: "legacy_user_product_name", file: relative, index: match.index });
    }
  }
  return {
    schema: "gpao_t3.identity_audit.v1",
    status: violations.length ? "fail" : "pass",
    filesScanned: files.length,
    violations
  };
}
