import dns from "node:dns/promises";
import net from "node:net";
import { load } from "cheerio";
import { RuntimeError } from "../errors.js";

const MAX_BYTES = 2_000_000;

function privateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export async function safeWebUrl(value, { allowLocal = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new RuntimeError("invalid_tool_input", "A valid web address is required", 400); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new RuntimeError("tool_permission_denied", "Only clean HTTP or HTTPS addresses are allowed", 403);
  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => { throw new RuntimeError("tool_external_unavailable", "The web address could not be resolved", 503); });
  if (!allowLocal && addresses.some(entry => privateAddress(entry.address))) throw new RuntimeError("tool_permission_denied", "Private network addresses are blocked", 403);
  return url;
}

export class WebAccess {
  constructor({ fetchImpl = fetch, allowLocal = false } = {}) { this.fetchImpl = fetchImpl; this.allowLocal = allowLocal; }

  async request(args, { signal } = {}) {
    let url = await safeWebUrl(args.url, { allowLocal: this.allowLocal });
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      let response;
      try { response = await this.fetchImpl(url, { signal, redirect: "manual", headers: { "user-agent": "GPAO-T3/0.2" } }); }
      catch { throw new RuntimeError("tool_external_unavailable", "웹 페이지에 연결하지 못했습니다.", 503); }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) throw new RuntimeError("tool_external_unavailable", "웹 이동 경로를 안전하게 확인하지 못했습니다.", 502);
        url = await safeWebUrl(new URL(location, url).href, { allowLocal: this.allowLocal });
        continue;
      }
      if (!response.ok) throw new RuntimeError(response.status === 429 ? "tool_rate_limited" : "tool_external_unavailable", "웹 페이지를 가져오지 못했습니다.", response.status === 429 ? 429 : 502);
      const declared = Number(response.headers.get("content-length") || 0);
      if (declared > MAX_BYTES) throw new RuntimeError("invalid_tool_input", "웹 페이지가 허용 크기를 초과합니다.", 413);
      const rawText = await response.text();
      if (Buffer.byteLength(rawText) > MAX_BYTES) throw new RuntimeError("invalid_tool_input", "웹 페이지가 허용 크기를 초과합니다.", 413);
      const contentType = response.headers.get("content-type") || "";
      return { url: url.href, contentType, rawText };
    }
    throw new RuntimeError("tool_external_unavailable", "웹 페이지를 가져오지 못했습니다.", 502);
  }

  async fetch(args, context = {}) {
    const { url, contentType, rawText } = await this.request(args, context);
    if (!contentType.includes("html")) return { url, contentType, text: rawText.slice(0, Number(args.maxChars || 100_000)), truncated: rawText.length > Number(args.maxChars || 100_000) };
      const $ = load(rawText);
      $("script,style,noscript,svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    const maxChars = Number(args.maxChars || 100_000);
    return { url, contentType, title: $("title").first().text().trim(), text: text.slice(0, maxChars), truncated: text.length > maxChars };
  }

  async search(args, context = {}) {
    const query = String(args.query || "").trim();
    if (!query) throw new RuntimeError("invalid_tool_input", "검색어가 필요합니다.", 400);
    const page = await this.request({ url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` }, context);
    const $ = load(page.rawText);
    const results = [];
    $(".result").each((_, element) => {
      if (results.length >= Number(args.limit || 10)) return;
      const anchor = $(element).find(".result__a").first();
      const href = anchor.attr("href");
      if (href) results.push({ title: anchor.text().trim(), url: href, snippet: $(element).find(".result__snippet").text().trim() });
    });
    return { query, results };
  }
}
