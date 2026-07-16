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
    await new Promise(resolve => setTimeout(resolve, 700));
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
  if (name.startsWith("mobile")) {
    assert.equal(await page.locator(".rail").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator(".rail").getAttribute("inert"), "");
    await page.locator("#session-menu").click();
    await page.waitForTimeout(220);
    assert.equal(await page.locator(".rail").getAttribute("aria-hidden"), "false");
    assert.equal(await page.locator(".workbench").getAttribute("inert"), "");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "new-chat");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(20);
    assert.equal(await page.locator(".rail").getAttribute("aria-hidden"), "true");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "session-menu");
  }
  await page.locator("#composer-settings").click();
  await page.locator("#settings-dialog").waitFor({ state:"visible" });
  assert.ok(await page.locator("[data-settings-target]").count() >= 5);
  await page.screenshot({ path:path.join(evidenceDir, `${name}-settings.png`), fullPage:false });
  await page.locator('[data-settings-target="tools"]').click();
  await page.locator("#connection-dialog").waitFor({ state:"visible" });
  await page.waitForTimeout(150);
  const toolRoute = await page.evaluate(() => {
    const dialog = document.querySelector("#connection-dialog").getBoundingClientRect();
    const section = document.querySelector(".tool-connections").getBoundingClientRect();
    return { dialogTop:dialog.top, dialogBottom:dialog.bottom, sectionTop:section.top };
  });
  assert.ok(toolRoute.sectionTop >= toolRoute.dialogTop && toolRoute.sectionTop < toolRoute.dialogBottom, JSON.stringify(toolRoute));
  await page.locator("#close-connections").click();
  await page.locator("#composer-settings").click();
  await page.locator('[data-settings-target="authority"]').click();
  await page.waitForTimeout(220);
  assert.equal(await page.locator('[data-panel-view="authority"]').getAttribute("aria-current"), "true");
  assert.match(await page.locator("#authority-state").innerText(), /권한 내 자동 실행/);
  await page.locator("#panel-close").click();
  if (name.startsWith("mobile")) assert.equal(await page.locator(".app-shell").evaluate(node => node.classList.contains("rail-collapsed")), false);
  if (name.startsWith("desktop")) {
    const firstSession = page.locator(".session-row").first();
    await firstSession.hover();
    await page.waitForTimeout(180);
    const hoverState = await firstSession.evaluate(node => ({ hovered:node.matches(":hover"), actionsOpacity:getComputedStyle(node.querySelector(".session-actions")).opacity }));
    assert.ok(hoverState.hovered && Number(hoverState.actionsOpacity) > 0, JSON.stringify(hoverState));
    await firstSession.locator("[data-session-menu]").click();
    await firstSession.locator(".session-context-menu").waitFor({ state:"visible" });
    const menuBox = await firstSession.locator(".session-context-menu").boundingBox();
    assert.ok(menuBox && menuBox.width >= 200 && menuBox.x + menuBox.width <= 1440, JSON.stringify(menuBox));
    assert.match(await firstSession.locator(".session-context-menu").innerText(), /대화 열기/);
    assert.match(await firstSession.locator(".session-context-menu").innerText(), /이름 바꾸기/);
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ""), /대화 열기/);
    await page.keyboard.press("ArrowDown");
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ""), /대화 고정|고정 해제/);
    await page.screenshot({ path:path.join(evidenceDir, `${name}-session-menu.png`), fullPage:false });
    await page.keyboard.press("Escape");
    await firstSession.locator(".session-context-menu").waitFor({ state:"hidden" });
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("data-session-menu")), true);
    await firstSession.locator("[data-session-menu]").click();
    await page.locator("#session-search-toggle").click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "session-search");
    await page.locator("#session-search-close").click();
    const expandedWidth = await page.locator(".rail").evaluate(node => node.getBoundingClientRect().width);
    await page.locator("#rail-collapse").click();
    await page.waitForTimeout(220);
    const collapsedWidth = await page.locator(".rail").evaluate(node => node.getBoundingClientRect().width);
    assert.ok(collapsedWidth < expandedWidth, JSON.stringify({ expandedWidth, collapsedWidth }));
    await page.locator("#rail-collapse").click();
    await page.waitForTimeout(220);
  }
  await page.locator("#message").fill("긴 한국어 답변을 Markdown, 코드, 표와 함께 보여줘");
  const sourceSessionId = await page.locator('.session-row[aria-current="true"] > [data-session-open]').getAttribute("data-session-open");
  await page.locator("#send").click();
  await page.locator(".message.streaming .response-prose").waitFor({ timeout:15_000 });
  assert.ok((await page.locator(".message.streaming .response-prose").innerText()).length > 20);
  if (name.startsWith("desktop")) {
    await page.locator("#session-search-toggle").click();
    await page.locator("#session-search").fill("일치하지 않는 검색어");
    assert.equal(await page.locator(".message.streaming").count(), 1);
    await page.locator("#session-search-close").click();
    assert.equal(await page.locator(".message.streaming").count(), 1);
    await page.locator("#top-new-chat").click();
    await page.waitForFunction(sourceId => document.querySelector('.session-row[aria-current="true"] > [data-session-open]')?.dataset.sessionOpen !== sourceId, sourceSessionId);
    assert.equal(await page.locator(".message.streaming").count(), 0);
    assert.equal(await page.locator("#activity-event-list li").count(), 0);
    assert.match(await page.locator("#panel-activity-title").textContent(), /대화를 시작할 준비/);
    const alternateSessionId = await page.locator('.session-row[aria-current="true"] > [data-session-open]').getAttribute("data-session-open");
    await page.locator(`.session-row > [data-session-open="${sourceSessionId}"]`).click();
    await page.locator(".message.streaming .response-prose").waitFor();
    assert.ok((await page.locator(".message.streaming .response-prose").innerText()).length > 20);
    await page.locator(`.session-row > [data-session-open="${alternateSessionId}"]`).click();
    await page.waitForFunction(() => !document.querySelector("#send").disabled, null, { timeout:15_000 });
    assert.equal(await page.locator('.session-row[aria-current="true"] > [data-session-open]').getAttribute("data-session-open"), alternateSessionId);
    assert.equal(await page.locator("#activity-event-list li").count(), 0);
    await page.locator(`.session-row > [data-session-open="${sourceSessionId}"]`).click();
    await page.locator("#activity-event-list li").first().waitFor({ state:"attached" });
  }
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
  if (await page.evaluate(() => innerWidth <= 980)) {
    await page.waitForTimeout(220);
    assert.equal(await page.locator("#assistant-panel").getAttribute("role"), "dialog");
    assert.equal(await page.locator("#assistant-panel").getAttribute("aria-modal"), "true");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "panel-close");
  }
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
  assert.ok(desktopBoxes.conversationRight <= desktopBoxes.panelLeft + 1, JSON.stringify(desktopBoxes));
  assert.ok(desktopBoxes.scrollWidth <= desktopBoxes.width, JSON.stringify(desktopBoxes));

  const intermediate = await browser.newPage({ viewport:{ width:900, height:800 } });
  intermediate.on("console", message => { if (message.type() === "error") consoleErrors.push(`intermediate-900:${message.text()}`); });
  intermediate.on("pageerror", error => consoleErrors.push(`intermediate-900:${error.message}`));
  await intermediate.goto(base, { waitUntil:"networkidle" });
  await intermediate.locator("#panel-toggle").click();
  await intermediate.waitForTimeout(260);
  assert.equal(await intermediate.locator("#assistant-panel").getAttribute("aria-hidden"), "false");
  assert.equal(await intermediate.locator("#assistant-panel").getAttribute("aria-modal"), "true");
  const intermediateBoxes = await intermediate.evaluate(() => {
    const conversation = document.querySelector(".conversation").getBoundingClientRect();
    const panel = document.querySelector(".assistant-panel").getBoundingClientRect();
    return { conversationWidth:conversation.width, panelLeft:panel.left, panelRight:panel.right, width:innerWidth, scrollWidth:document.documentElement.scrollWidth };
  });
  assert.ok(intermediateBoxes.conversationWidth >= 600, JSON.stringify(intermediateBoxes));
  assert.ok(intermediateBoxes.panelLeft < intermediateBoxes.width && intermediateBoxes.panelRight <= intermediateBoxes.width + 2, JSON.stringify(intermediateBoxes));
  assert.ok(intermediateBoxes.scrollWidth <= intermediateBoxes.width, JSON.stringify(intermediateBoxes));
  await intermediate.screenshot({ path:path.join(evidenceDir, "intermediate-900-panel-overlay.png"), fullPage:false });

  const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  await mobile.addInitScript(() => localStorage.setItem("gpao-t3:rail-collapsed", "true"));
  await exercise(mobile, "mobile-390-long-markdown");
  await mobile.reload({ waitUntil:"networkidle" });
  await mobile.waitForTimeout(240);
  assert.equal(await mobile.locator("#assistant-panel").getAttribute("aria-modal"), "true");
  assert.equal(await mobile.evaluate(() => document.activeElement?.id), "panel-close");
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
  const receipt = { schema:"gpao_t3.wp8r_product_surface_qualification.v1", verdict:"pass", markdown:true, xssBlocked:true, surfaceEvents:true, icons:true, desktop:true, intermediateOverlay:true, mobile:true, mobileRailPreference:true, mobileDrawerModal:true, keyboardNavigation:true, outsideClickFocus:true, streamingPreserved:true, sessionSwitchIsolation:true, panelSessionIsolation:true, authoritySurface:true, modalFocus:true, restoredModalFocus:true, keyboardConstrained:true, consoleErrors, evidenceDir };
  await fs.writeFile(path.join(evidenceDir, "qualification.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await runtime.stop();
}
