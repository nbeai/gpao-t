import fs from "node:fs/promises";
import sharp from "sharp";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseFile } from "music-metadata";
import { RuntimeError } from "../errors.js";

export class MediaInspector {
  constructor({ files } = {}) { this.files = files; }
  async target(args) { if (!this.files) throw new RuntimeError("tool_dependency_missing", "미디어 작업공간이 없습니다.", 503); return this.files.resolve(args.rootId, args.path); }
  async image(args) { const metadata = await sharp(await this.target(args)).metadata(); return { format: metadata.format || null, width: metadata.width || null, height: metadata.height || null, pages: metadata.pages || 1, space: metadata.space || null }; }
  async pdf(args) {
    const data = new Uint8Array(await fs.readFile(await this.target(args)));
    const document = await getDocument({ data, isEvalSupported: false, useWorkerFetch: false }).promise;
    const pageCount = document.numPages;
    const pages = [];
    for (let index = 1; index <= Math.min(pageCount, Number(args.maxPages || 20)); index += 1) {
      const page = await document.getPage(index); const content = await page.getTextContent();
      pages.push({ page: index, text: content.items.map(item => item.str || "").join(" ").slice(0, 50_000) });
    }
    await document.destroy();
    return { pageCount, pages };
  }
  async audio(args) { const metadata = await parseFile(await this.target(args), { duration: true }); return { format: metadata.format.container || null, codec: metadata.format.codec || null, duration: metadata.format.duration || null, bitrate: metadata.format.bitrate || null, sampleRate: metadata.format.sampleRate || null, title: metadata.common.title || null, artist: metadata.common.artist || null }; }
}
