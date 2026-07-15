import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { RuntimeError } from "../errors.js";
import { safeWebUrl } from "./web-access.js";

export class BrowserWorkspace {
  constructor({ executablePath = process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined, evidenceDir, allowLocal = false } = {}) {
    this.executablePath = executablePath; this.evidenceDir = evidenceDir; this.allowLocal = allowLocal; this.sessions = new Map();
  }

  async open(args = {}) {
    const browser = await chromium.launch({ executablePath: this.executablePath, headless: true, args: ["--disable-background-networking"] }).catch(() => { throw new RuntimeError("tool_dependency_missing", "브라우저 실행 엔진을 시작하지 못했습니다.", 503); });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/*", async route => {
      const request = route.request();
      if (!request.isNavigationRequest() || request.frame().parentFrame()) return route.continue();
      try { await safeWebUrl(request.url(), { allowLocal: this.allowLocal }); return route.continue(); }
      catch { return route.abort("blockedbyclient"); }
    });
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, { browser, context, page });
    return { sessionId, state: "ready" };
  }

  require(sessionId) { const session = this.sessions.get(String(sessionId)); if (!session) throw new RuntimeError("tool_target_not_found", "브라우저 세션을 찾을 수 없습니다.", 404); return session; }

  async navigate(args) {
    const url = await safeWebUrl(args.url, { allowLocal: this.allowLocal });
    const { page } = this.require(args.sessionId);
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: Number(args.timeoutMs || 15_000) }).catch(() => { throw new RuntimeError("tool_external_unavailable", "브라우저가 페이지를 열지 못했습니다.", 503); });
    return { sessionId: args.sessionId, url: page.url(), title: await page.title() };
  }

  async snapshot(args) {
    const { page } = this.require(args.sessionId);
    return { sessionId: args.sessionId, url: page.url(), title: await page.title(), text: (await page.locator("body").innerText()).slice(0, Number(args.maxChars || 100_000)) };
  }

  async act(action, args) {
    const { page } = this.require(args.sessionId);
    const locator = page.locator(String(args.selector || "")).first();
    if (action === "click") await locator.click({ timeout: Number(args.timeoutMs || 10_000) });
    else if (action === "fill") await locator.fill(String(args.value || ""), { timeout: Number(args.timeoutMs || 10_000) });
    else throw new RuntimeError("invalid_tool_input", "지원하지 않는 브라우저 작업입니다.", 400);
    return { sessionId: args.sessionId, action, url: page.url() };
  }

  async screenshot(args) {
    if (!this.evidenceDir) throw new RuntimeError("tool_dependency_missing", "브라우저 증거 저장소가 없습니다.", 503);
    const { page } = this.require(args.sessionId);
    await fs.mkdir(this.evidenceDir, { recursive: true, mode: 0o700 });
    const file = path.join(this.evidenceDir, `${crypto.randomUUID()}.png`);
    await page.screenshot({ path: file, fullPage: args.fullPage === true });
    return { sessionId: args.sessionId, evidenceId: path.basename(file), bytes: (await fs.stat(file)).size };
  }

  async close(args) {
    const session = this.require(args.sessionId);
    this.sessions.delete(args.sessionId);
    await session.browser.close();
    return { sessionId: args.sessionId, state: "closed" };
  }

  async stop() { const sessions = [...this.sessions.values()]; this.sessions.clear(); await Promise.allSettled(sessions.map(session => session.browser.close())); }
}
