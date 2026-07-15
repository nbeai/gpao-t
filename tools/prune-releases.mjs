import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releasesDir = path.join(root, ".gpao-t3", "releases");
const feedPath = path.join(releasesDir, "update-feed.json");
const keepReleaseId = process.argv.find(argument => argument.startsWith("--keep-release-id="))?.split("=")[1];
const apply = process.argv.includes("--apply");
if (!keepReleaseId) throw new Error("--keep-release-id is required");

const feed = JSON.parse(fs.readFileSync(feedPath, "utf8"));
const retained = feed.releases.find(release => release.releaseId === keepReleaseId);
if (!retained) throw new Error("retained release is missing from update feed");
const archivePath = path.join(releasesDir, retained.archive);
const archiveDigest = crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");
if (archiveDigest !== retained.sha256) throw new Error("retained archive checksum mismatch");

const base = `${retained.name}-${retained.sha256.slice(0, 12)}`;
const keep = new Set([retained.archive, `${base}.manifest.json`, `${base}-${retained.platform}`, "update-feed.json"]);
const entries = fs.readdirSync(releasesDir, { withFileTypes: true });
const candidates = entries.filter(entry => !keep.has(entry.name)).map(entry => entry.name).sort();
const bytes = candidates.reduce((sum, name) => {
  const target = path.join(releasesDir, name);
  return sum + (fs.statSync(target).isFile() ? fs.statSync(target).size : 0);
}, 0);

if (apply) {
  for (const name of candidates) fs.rmSync(path.join(releasesDir, name), { recursive: true, force: true });
  const compactFeed = { ...feed, releases: [retained], updatedAt: new Date().toISOString() };
  const temporary = `${feedPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(compactFeed, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, feedPath);
}

console.log(JSON.stringify({ schema: "gpao_t3.release_hygiene.v1", mode: apply ? "applied" : "dry_run", keepReleaseId, retainedArchive: retained.archive, retainedSha256: retained.sha256, candidateCount: candidates.length, candidateTopLevelFileBytes: bytes, candidates }, null, 2));
