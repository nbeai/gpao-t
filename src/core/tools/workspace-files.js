import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RuntimeError } from "../errors.js";

const MAX_READ_BYTES = 1_048_576;
const MAX_SEARCH_FILES = 10_000;

function cleanRelative(value) {
  const relative = String(value || ".");
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..") || relative.includes("\0")) {
    throw new RuntimeError("tool_permission_denied", "File access must stay inside the selected workspace", 403);
  }
  return relative;
}

export class WorkspaceFiles {
  constructor({ roots = {}, backupDir } = {}) {
    this.roots = new Map(Object.entries(roots).map(([id, root]) => [id, path.resolve(root)]));
    this.backupDir = backupDir ? path.resolve(backupDir) : null;
  }

  async resolve(rootId, relativePath, { write = false } = {}) {
    const root = this.roots.get(String(rootId));
    if (!root) throw new RuntimeError("tool_dependency_missing", "Select a workspace before using file tools", 409);
    const rootReal = await fs.realpath(root).catch(() => null);
    if (!rootReal) throw new RuntimeError("tool_target_not_found", "The selected workspace is unavailable", 404);
    const candidate = path.resolve(rootReal, cleanRelative(relativePath));
    const boundary = `${rootReal}${path.sep}`;
    if (candidate !== rootReal && !candidate.startsWith(boundary)) throw new RuntimeError("tool_permission_denied", "File access left the selected workspace", 403);
    const checked = write ? await fs.realpath(path.dirname(candidate)).catch(() => null) : await fs.realpath(candidate).catch(() => null);
    if (!checked) throw new RuntimeError("tool_target_not_found", "The requested file or folder does not exist", 404);
    if (checked !== rootReal && !checked.startsWith(boundary)) throw new RuntimeError("tool_permission_denied", "A symbolic link left the selected workspace", 403);
    return candidate;
  }

  async stat(args) {
    const target = await this.resolve(args.rootId, args.path);
    const info = await fs.stat(target);
    return { path: cleanRelative(args.path), type: info.isDirectory() ? "directory" : info.isFile() ? "file" : "other", bytes: info.size, modifiedAt: info.mtime.toISOString() };
  }

  async list(args) {
    const target = await this.resolve(args.rootId, args.path || ".");
    const entries = await fs.readdir(target, { withFileTypes: true });
    return { path: cleanRelative(args.path || "."), entries: entries.slice(0, 1_000).map(entry => ({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" })) };
  }

  async read(args) {
    const target = await this.resolve(args.rootId, args.path);
    const info = await fs.stat(target);
    if (!info.isFile()) throw new RuntimeError("invalid_tool_input", "The selected path is not a file", 400);
    if (info.size > Number(args.maxBytes || MAX_READ_BYTES)) throw new RuntimeError("invalid_tool_input", "The file is too large for one read", 413);
    return { path: cleanRelative(args.path), text: await fs.readFile(target, "utf8"), bytes: info.size };
  }

  async search(args) {
    const root = await this.resolve(args.rootId, args.path || ".");
    const query = String(args.query || "");
    if (!query) throw new RuntimeError("invalid_tool_input", "A search query is required", 400);
    const results = [];
    const queue = [root];
    let visited = 0;
    while (queue.length && visited < MAX_SEARCH_FILES && results.length < Number(args.limit || 100)) {
      const current = queue.shift();
      for (const entry of await fs.readdir(current, { withFileTypes: true }).catch(() => [])) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) queue.push(absolute);
        else if (entry.isFile()) {
          visited += 1;
          if (entry.name.toLowerCase().includes(query.toLowerCase())) results.push(path.relative(root, absolute));
        }
      }
    }
    return { query, results, visited, truncated: queue.length > 0 };
  }

  async backup(target) {
    if (!this.backupDir) throw new RuntimeError("tool_dependency_missing", "File rollback storage is unavailable", 503);
    await fs.mkdir(this.backupDir, { recursive: true, mode: 0o700 });
    const rollbackId = crypto.randomUUID();
    let content = null;
    try { content = await fs.readFile(target); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const record = { target, existed: content !== null, content: content?.toString("base64") || null };
    await fs.writeFile(path.join(this.backupDir, `${rollbackId}.json`), JSON.stringify(record), { mode: 0o600 });
    return rollbackId;
  }

  async write(args) {
    const target = await this.resolve(args.rootId, args.path, { write: true });
    const rollbackId = await this.backup(target);
    const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, String(args.text ?? ""), { mode: 0o600, flag: args.createOnly ? "wx" : "w" });
    await fs.rename(temporary, target);
    return { path: cleanRelative(args.path), bytes: Buffer.byteLength(String(args.text ?? "")), rollbackId };
  }

  async edit(args) {
    const target = await this.resolve(args.rootId, args.path, { write: true });
    const before = await fs.readFile(target, "utf8");
    const oldText = String(args.oldText ?? "");
    if (!oldText) throw new RuntimeError("invalid_tool_input", "oldText is required", 400);
    const first = before.indexOf(oldText);
    if (first < 0) throw new RuntimeError("tool_conflict", "The expected file text is no longer present", 409);
    if (before.indexOf(oldText, first + oldText.length) >= 0) throw new RuntimeError("tool_conflict", "The edit target is ambiguous", 409);
    const rollbackId = await this.backup(target);
    const after = `${before.slice(0, first)}${String(args.newText ?? "")}${before.slice(first + oldText.length)}`;
    const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, after, { mode: 0o600 });
    await fs.rename(temporary, target);
    return { path: cleanRelative(args.path), changed: true, rollbackId };
  }

  async rollback(args) {
    if (!this.backupDir || !/^[0-9a-f-]{36}$/i.test(String(args.rollbackId || ""))) throw new RuntimeError("invalid_tool_input", "A valid rollback receipt is required", 400);
    const recordPath = path.join(this.backupDir, `${args.rollbackId}.json`);
    const record = JSON.parse(await fs.readFile(recordPath, "utf8").catch(() => { throw new RuntimeError("tool_target_not_found", "Rollback receipt was not found", 404); }));
    const targetParentReal = await fs.realpath(path.dirname(record.target)).catch(() => null);
    const rootReals = await Promise.all([...this.roots.values()].map(root => fs.realpath(root).catch(() => null)));
    const insideRoot = targetParentReal && rootReals.some(root => root && (record.target === root || targetParentReal === root || targetParentReal.startsWith(`${root}${path.sep}`)));
    if (!insideRoot) throw new RuntimeError("tool_permission_denied", "Rollback target left the selected workspace", 403);
    if (record.existed) await fs.writeFile(record.target, Buffer.from(record.content, "base64"), { mode: 0o600 });
    else await fs.unlink(record.target).catch(() => {});
    await fs.unlink(recordPath);
    return { rollbackId: args.rollbackId, restored: true };
  }
}
