import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { NativeRuntime } from "../src/core/runtime.js";
import { createHttpServer } from "../src/core/http.js";

const evidenceDir = path.resolve(process.argv[2] || "../engineering/evidence/wp8r-product-surface-2026-07-16");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const markdown = `# 긴 한국어 응답

이 문장은 **강조**, [안전한 링크](https://example.com), [차단 링크](javascript:alert(1))를 확인합니다.

## 목록

- 첫 번째 항목
- 두 번째 항목

\`\`\`javascript
const answer = "GPAO-T3";
console.log(answer);
\`\`\`

| 항목 | 상태 | 설명 |
|---|---|---|
| Markdown | 정상 | 제목과 목록이 구조적으로 표시됩니다. |
| 모바일 | 정상 | 긴 표는 내부에서 스크롤됩니다. |

<img src=x onerror="window.__xss = true">
<script>window.__xss = true</script>`;

const adapter = {
  async invoke(plan) { return { status:"succeeded", runId:plan.runId, providerId:plan.providerId, modelId:plan.modelId, result:{ text:markdown }, receipt:{ schema:"gpao_t3.provider_receipt.v1", runId:plan.runId, generation:plan.generation, terminal:true } }; },
  async *stream(plan) {
    const split = Math.floor(markdown.length / 2);
    yield { runId:plan.runId, generation:plan.generation, seq:1, type:"delta", text:markdown.slice(0, split), terminal:false };
    await new Promise(resolve => setTimeout(resolve, 250));
    yield { runId:plan.runId, generation:plan.generation, seq:2, type:"delta", text:markdown.slice(split), terminal:false };
    await new Promise(resolve => setTimeout(resolve, 50));
    yield { runId:plan.runId, generation:plan.generation, seq:3, type:"terminal", text:markdown, terminal:true, receipt:{ schema:"gpao_t3.provider_receipt.v1", runId:plan.runId, generation:plan.generation, terminal:true } };
  }
};

const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-wp8r-visual-"));
const runtime = await new NativeRuntime({ stateDir, providerAdapter:adapter }).start();
const { server } = createHttpServer(runtime, { port:0 });
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
await fs.mkdir(evidenceDir, { recursive:true });
const browser = await chromium.launch({ executablePath:chrome, headless:true, args:["--disable-background-networking"] });
const consoleErrors = [];

async function exercise(page, name) {
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(`${name}:${message.text()}`); });
  page.on("pageerror", error => consoleErrors.push(`${name}:${error.message}`));
  await page.goto(base, { waitUntil:"networkidle" });
  await page.locator("#message").fill("긴 한국어 답변을 Markdown, 코드, 표와 함께 보여줘");
  await page.locator("#send").click();
  await page.locator(".message.streaming .response-prose").waitFor({ timeout:15_000 });
  assert.ok((await page.locator(".message.streaming .response-prose").innerText()).length > 20);
  await page.screenshot({ path:path.join(evidenceDir, `${name}-streaming.png`), fullPage:false });
  await page.locator(".response-prose table").waitFor({ timeout:15_000 });
  await page.locator(".message.streaming").waitFor({ state:"detached", timeout:15_000 });
  assert.equal(await page.evaluate(() => globalThis.__xss === true), false);
  assert.equal(await page.locator(".response-prose script").count(), 0);
  assert.equal(await page.locator('.response-prose a[href^="javascript:"]').count(), 0);
  assert.ok(await page.locator(".response-prose pre code").count() >= 1);
  assert.ok(await page.locator(".response-prose table").count() >= 1);
  assert.ok(await page.locator("svg.lucide").count() >= 4);
  const conversationLayout = await page.evaluate(() => ({
    width:innerWidth, scrollWidth:document.documentElement.scrollWidth, scrollX,
    conversation:document.querySelector(".conversation").getBoundingClientRect().toJSON(),
    messages:document.querySelector(".messages").getBoundingClientRect().toJSON(),
    composer:document.querySelector(".composer-wrap").getBoundingClientRect().toJSON()
  }));
  assert.ok(conversationLayout.scrollWidth <= conversationLayout.width, JSON.stringify(conversationLayout));
  assert.equal(conversationLayout.scrollX, 0, JSON.stringify(conversationLayout));
  assert.ok(conversationLayout.conversation.left >= 0 && conversationLayout.composer.left >= 0, JSON.stringify(conversationLayout));
  await page.screenshot({ path:path.join(evidenceDir, `${name}-conversation.png`), fullPage:true });
  await page.locator("#panel-toggle").click();
  await page.locator("#activity-event-list li").first().waitFor();
  const eventText = await page.locator("#activity-event-list").innerText();
  assert.match(eventText, /요청 확인/);
  assert.match(eventText, /답변 정리/);
  await page.screenshot({ path:path.join(evidenceDir, `${name}.png`), fullPage:true });
}

try {
  const desktop = await browser.newPage({ viewport:{ width:1440, height:1000 } });
  await exercise(desktop, "desktop-long-markdown-panel");
  const desktopBoxes = await desktop.evaluate(() => {
    const conversation = document.querySelector(".conversation").getBoundingClientRect();
    const panel = document.querySelector(".assistant-panel").getBoundingClientRect();
    return { conversationRight:conversation.right, panelLeft:panel.left, scrollWidth:document.documentElement.scrollWidth, width:innerWidth };
  });
  assert.ok(desktopBoxes.conversationRight <= desktopBoxes.panelLeft + 1);
  assert.ok(desktopBoxes.scrollWidth <= desktopBoxes.width);

  const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  await exercise(mobile, "mobile-390-long-markdown");
  await mobile.locator("#panel-close").click();
  await mobile.locator("#assistant-panel").waitFor({ state:"hidden" });
  assert.equal(await mobile.locator("#assistant-panel").getAttribute("aria-hidden"), "true");
  await mobile.locator("#message").focus();
  await mobile.setViewportSize({ width:390, height:520 });
  await mobile.evaluate(() => window.dispatchEvent(new Event("resize")));
  const mobileBoxes = await mobile.evaluate(() => {
    const composer = document.querySelector(".composer-wrap").getBoundingClientRect();
    const table = document.querySelector(".response-prose table").getBoundingClientRect();
    const message = document.querySelector(".message.assistant").getBoundingClientRect();
    return { composerBottom:composer.bottom, viewport:innerHeight, tableWidth:table.width, messageWidth:message.width, scrollWidth:document.documentElement.scrollWidth, width:innerWidth };
  });
  assert.ok(mobileBoxes.composerBottom <= mobileBoxes.viewport + 1);
  assert.ok(mobileBoxes.tableWidth <= mobileBoxes.messageWidth + 1);
  assert.ok(mobileBoxes.scrollWidth <= mobileBoxes.width);
  await mobile.screenshot({ path:path.join(evidenceDir, "mobile-390-keyboard-constrained.png"), fullPage:false });
  assert.deepEqual(consoleErrors, []);
  const receipt = { schema:"gpao_t3.wp8r_product_surface_qualification.v1", verdict:"pass", markdown:true, xssBlocked:true, surfaceEvents:true, icons:true, desktop:true, mobile:true, keyboardConstrained:true, consoleErrors, evidenceDir };
  await fs.writeFile(path.join(evidenceDir, "qualification.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await runtime.stop();
}
