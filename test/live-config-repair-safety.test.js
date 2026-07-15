import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

import {
  BASIC_TOOLS_APPLY_TOKEN,
  patchConfig as patchBasicToolsConfig,
  runBasicToolsRepair,
} from "../tools/repair-live-gpao-t-basic-tools.mjs";
import {
  DOCTOR_WARNINGS_APPLY_TOKEN,
  patchConfig as patchDoctorWarningsConfig,
  runDoctorWarningsRepair,
} from "../tools/repair-live-gpao-t-doctor-warnings.mjs";

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function fixture(t, config = {}) {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), "gpao-t-live-repair-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const liveRoot = join(root, ".gpao-t");
  const configPath = join(liveRoot, "gpao-t.json");
  const evidenceBoundary = join(root, "evidence");
  mkdirSync(liveRoot, { mode: 0o700 });
  mkdirSync(evidenceBoundary, { mode: 0o700 });
  writeJson(configPath, config);
  return { root, liveRoot, configPath, evidenceBoundary };
}

function repairOptions(fx, evidenceName, extra = {}) {
  return {
    config: fx.configPath,
    stateHome: fx.liveRoot,
    evidenceRoot: join(fx.evidenceBoundary, evidenceName),
    ...extra,
  };
}

function safetyOptions(fx, evidenceName, extra = {}) {
  return {
    canonicalLiveRoot: fx.liveRoot,
    canonicalEvidenceRoot: join(fx.evidenceBoundary, evidenceName),
    evidenceBoundary: fx.evidenceBoundary,
    ...extra,
  };
}

test("repair config transforms are idempotent and fail closed on incompatible anchors", () => {
  const basicFirst = patchBasicToolsConfig({});
  assert.ok(basicFirst.changes.length > 0);
  assert.deepEqual(patchBasicToolsConfig(basicFirst.config).changes, []);
  assert.throws(
    () => patchBasicToolsConfig({ tools: "unsafe" }),
    /Config anchor tools must be an object/,
  );

  const doctorInput = {
    agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    plugins: { allow: ["openai"], entries: { codex: { enabled: false } } },
  };
  const doctorFirst = patchDoctorWarningsConfig(doctorInput, { codexPluginInstalled: true });
  assert.ok(doctorFirst.changes.length > 0);
  assert.deepEqual(
    patchDoctorWarningsConfig(doctorFirst.config, { codexPluginInstalled: true }).changes,
    [],
  );
  assert.throws(
    () => patchDoctorWarningsConfig({ agents: [] }),
    /Config anchor agents must be an object/,
  );
});

test("basic-tools repair is dry-run by default and requires the exact apply token", (t) => {
  const fx = fixture(t);
  const before = readFileSync(fx.configPath, "utf8");
  const dryRun = runBasicToolsRepair(
    repairOptions(fx, "basic"),
    safetyOptions(fx, "basic", { now: new Date("2026-07-14T01:00:00.000Z") }),
  );
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.writesPerformed, false);
  assert.equal(readFileSync(fx.configPath, "utf8"), before);
  assert.equal(existsSync(join(fx.liveRoot, "backups")), false);

  const evidenceCount = readdirSync(join(fx.evidenceBoundary, "basic")).length;
  assert.throws(
    () => runBasicToolsRepair(
      repairOptions(fx, "basic", { apply: true, approvalToken: "wrong" }),
      safetyOptions(fx, "basic", { now: new Date("2026-07-14T01:01:00.000Z") }),
    ),
    /Refusing live apply without --approval-token/,
  );
  assert.equal(readdirSync(join(fx.evidenceBoundary, "basic")).length, evidenceCount);
  assert.equal(readFileSync(fx.configPath, "utf8"), before);
});

test("repairs create a verified backup receipt before temp-root mutation and settle idempotently", (t) => {
  const fx = fixture(t);
  const evidenceName = "basic";
  const now = new Date("2026-07-14T02:00:00.000Z");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const original = readFileSync(fx.configPath, "utf8");
  let preMutationObserved = false;
  const applied = runBasicToolsRepair(
    repairOptions(fx, evidenceName, {
      apply: true,
      approvalToken: BASIC_TOOLS_APPLY_TOKEN,
    }),
    safetyOptions(fx, evidenceName, {
      now,
      beforeMutation: ({ backupPath, evidenceDir }) => {
        const receipt = JSON.parse(readFileSync(join(evidenceDir, "backup-receipt.json"), "utf8"));
        assert.equal(receipt.phase, "backup_complete_before_mutation");
        assert.equal(receipt.targetMutationStarted, false);
        assert.equal(readFileSync(backupPath, "utf8"), original);
        assert.equal(readFileSync(fx.configPath, "utf8"), original);
        preMutationObserved = true;
      },
    }),
  );
  assert.equal(preMutationObserved, true);
  assert.equal(applied.status, "applied");
  assert.equal(applied.applied, true);
  assert.equal(existsSync(join(applied.evidenceDir, "apply-receipt.json")), true);
  assert.equal(applied.evidenceDir.endsWith(stamp), true);

  const second = runBasicToolsRepair(
    repairOptions(fx, evidenceName, {
      apply: true,
      approvalToken: BASIC_TOOLS_APPLY_TOKEN,
    }),
    safetyOptions(fx, evidenceName, { now: new Date("2026-07-14T02:01:00.000Z") }),
  );
  assert.equal(second.status, "already_compliant");
  assert.equal(second.writesPerformed, false);
});

test("canonical target, config symlink, and backup symlink escapes are rejected", (t) => {
  const escaped = fixture(t);
  const outsideConfig = join(escaped.root, "outside.json");
  writeJson(outsideConfig, {});
  assert.throws(
    () => runBasicToolsRepair(
      { ...repairOptions(escaped, "basic"), config: outsideConfig },
      safetyOptions(escaped, "basic"),
    ),
    /Config path must equal canonical live config/,
  );

  const linkedConfig = fixture(t);
  const outsideLinkedConfig = join(linkedConfig.root, "outside.json");
  writeJson(outsideLinkedConfig, {});
  unlinkSync(linkedConfig.configPath);
  symlinkSync(outsideLinkedConfig, linkedConfig.configPath);
  assert.throws(
    () => runBasicToolsRepair(
      repairOptions(linkedConfig, "basic"),
      safetyOptions(linkedConfig, "basic"),
    ),
    /contains a symlink/,
  );

  const linkedBackup = fixture(t);
  const outsideBackup = join(linkedBackup.root, "outside-backups");
  mkdirSync(outsideBackup);
  symlinkSync(outsideBackup, join(linkedBackup.liveRoot, "backups"));
  assert.throws(
    () => runBasicToolsRepair(
      repairOptions(linkedBackup, "basic", {
        apply: true,
        approvalToken: BASIC_TOOLS_APPLY_TOKEN,
      }),
      safetyOptions(linkedBackup, "basic"),
    ),
    /Backup path contains a symlink/,
  );
});

test("doctor repair recognizes the canonical GPAO-T Codex plugin", (t) => {
  const fx = fixture(t, {
    agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    plugins: { allow: ["openai"], entries: { codex: { enabled: false } } },
  });
  writeJson(
    join(fx.liveRoot, "npm", "projects", "fixture", "node_modules", "@gpao-t", "codex", "package.json"),
    { name: "@gpao-t/codex" },
  );
  const applied = runDoctorWarningsRepair(
    repairOptions(fx, "doctor", {
      apply: true,
      approvalToken: DOCTOR_WARNINGS_APPLY_TOKEN,
    }),
    safetyOptions(fx, "doctor", { now: new Date("2026-07-14T03:00:00.000Z") }),
  );
  assert.equal(applied.status, "applied");
  const config = JSON.parse(readFileSync(fx.configPath, "utf8"));
  assert.equal(config.plugins.entries.codex.enabled, true);
  assert.ok(config.plugins.allow.includes("codex"));
  assert.equal(existsSync(applied.backupReceiptPath), true);
  assert.equal(existsSync(applied.applyReceiptPath), true);
});
