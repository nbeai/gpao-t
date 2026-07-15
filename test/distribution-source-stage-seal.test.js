import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  patchDistributionIndexHtmlSource,
  prepareFreshRuntimeStage,
} from "../tools/build-gpao-t-production-distribution.mjs";
import {
  RUNTIME_SOURCE_TOP_LEVEL,
  verifyFreshRuntimeStage,
} from "../tools/gpao-t-production-distribution-seal.mjs";

async function createMinimalSource(root) {
  const directories = new Set(["dist", "docs", "patches", "scripts", "skills", "src", "node_modules"]);
  for (const entry of RUNTIME_SOURCE_TOP_LEVEL) {
    const path = join(root, entry);
    if (directories.has(entry)) {
      await mkdir(path, { recursive: true });
      await writeFile(join(path, ".keep"), `${entry}\n`);
    } else {
      await writeFile(path, entry === "package.json" ? '{"name":"runtime"}\n' : `${entry}\n`);
    }
  }
  await mkdir(join(root, "node_modules"), { recursive: true });
  await writeFile(join(root, "node_modules", ".keep"), "dependencies\n");
}

test("fresh runtime stage is an exact source copy before dependency overlay is ignored", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-source-stage-"));
  const sourceBuild = join(root, "source");
  const runtimeStage = join(root, "stage");
  await mkdir(sourceBuild, { recursive: true });
  await createMinimalSource(sourceBuild);

  await prepareFreshRuntimeStage({ sourceBuild, runtimeStage });
  const report = await verifyFreshRuntimeStage({ sourceBuild, runtimeStage });

  assert.equal(report.sourceBuildTreeSha256, report.runtimeStageTreeSha256);
  assert.equal(report.sourceBuildMarkers.length, 0);
  assert.equal(await readFile(join(runtimeStage, "README.md"), "utf8"), "README.md\n");
});

test("runtime stage seal rejects source drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-source-stage-drift-"));
  const sourceBuild = join(root, "source");
  const runtimeStage = join(root, "stage");
  await mkdir(sourceBuild, { recursive: true });
  await createMinimalSource(sourceBuild);
  await prepareFreshRuntimeStage({ sourceBuild, runtimeStage });
  await writeFile(join(runtimeStage, "README.md"), "changed\n");

  await assert.rejects(
    verifyFreshRuntimeStage({ sourceBuild, runtimeStage }),
    /runtime stage does not match the current source build/,
  );
});

test("distribution index composition is idempotent around injected translation scripts", () => {
  const source = [
    "<!doctype html><html><head>",
    '<link rel="stylesheet" crossorigin href="./assets/index-example.css">',
    "</head><body>",
    '    <script data-gpao-t="gpao_t_telegram_direct_communication_rail_v0_19">',
    '      const sample = value.replace(/Model & Thinking/g, "모델과 사고");',
    "    </script>",
    '<script type="module" src="./assets/index-example.js"></script>',
    "  </body>",
    "</html>",
  ].join("\n");

  const once = patchDistributionIndexHtmlSource(source);
  const twice = patchDistributionIndexHtmlSource(once);

  assert.equal(twice, once);
  assert.match(once, /replace\(\/Model & Thinking\/g, "모델과 사고"\)/);
  assert.doesNotMatch(once, /replace\(\/모델과 사고\/g, "모델과 사고"\)/);
});
