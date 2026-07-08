import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { renderControlCenterHtml } from "./control-center-renderer.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 0;

export function buildControlCenterServingContract({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  route = "/",
} = {}) {
  return {
    schema: "gpao_t.control_center_serving_contract.v0_1",
    status: "ready",
    servingMode: "browser_safe_loopback_preview",
    host,
    port,
    routes: [
      { path: "/", content: "static_control_center_html" },
      { path: "/control-center", content: "static_control_center_html" },
      { path: "/control-center.html", content: "static_control_center_html" },
      { path: "/health", content: "local_json_health" },
    ],
    defaultRoute: route,
    renderBeforeServe: true,
    previewLifecycle: {
      serveCheck: "ephemeral_start_verify_stop",
      serve: "explicit_manual_preview_until_signal",
      persistentDaemon: false,
      installOrUpdateHook: false,
    },
    screenshotVerification: {
      status: "required_before_richer_behavior",
      requiredViewports: [
        { label: "desktop", width: 1440, height: 960 },
        { label: "mobile", width: 390, height: 844 },
      ],
      requiredVisibleText: [
        "GPAO-T Local Control Center",
        "다음 안전 행동",
        "권한 경계",
        "디자인 게이트",
      ],
      requiredSelectors: [
        ".topbar",
        ".focus-strip",
        ".decision-strip",
        ".mobile-next-action",
        "[data-panel=\"memory\"]",
        "[data-group=\"Authority\"]",
      ],
      requiredInteractionSignals: [
        "nonblank_viewport",
        "panel_anchor_navigation",
        "panel_inspector_expansion",
        "no_horizontal_overflow",
        "next_safe_action_visible",
        "authority_boundary_visible",
        "mobile_sticky_topbar_or_decision_strip_visible",
      ],
      blockedSignals: [
        "blank_page",
        "script_tag",
        "external_network_request",
        "daemon_required",
        "account_connection_prompt",
        "deployment_prompt",
      ],
    },
    authorityBoundary: {
      loopbackOnly: true,
      startsPersistentDaemon: false,
      opensExternalNetwork: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      deploysOrPublishes: false,
    },
    nextSafeAction:
      "Start the loopback preview, capture desktop and mobile screenshots, and keep interactivity blocked until screenshots pass visible-state checks.",
  };
}

export async function startControlCenterPreviewServer({
  root,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  html,
  now,
} = {}) {
  const render = renderControlCenterHtml({
    root,
    outputPath: ".gpao-t/control-center/index.html",
    now,
  });
  const pageHtml = html || readFileSync(render.outputPath, "utf8");
  const contract = buildControlCenterServingContract({ host, port });

  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", `http://${host}`);
    if (url.pathname === "/health") {
      respondJson(response, 200, {
        schema: "gpao_t.control_center_serving_health.v0_1",
        status: "ready",
        servingMode: contract.servingMode,
        authorityBoundary: contract.authorityBoundary,
      });
      return;
    }

    if (["/", "/control-center", "/control-center.html"].includes(url.pathname)) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "local-control-center-preview",
      });
      response.end(pageHtml);
      return;
    }

    respondJson(response, 404, {
      error: "not_found",
      nextSafeAction: "Use /, /control-center, /control-center.html, or /health.",
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}/control-center`;

  return {
    schema: "gpao_t.control_center_preview_server.v0_1",
    status: "serving",
    server,
    url,
    host,
    port: actualPort,
    render,
    contract: buildControlCenterServingContract({ host, port: actualPort }),
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

export async function verifyControlCenterPreviewServing({
  root,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  now,
} = {}) {
  const preview = await startControlCenterPreviewServer({ root, host, port, now });
  try {
    const health = await fetchJson(`http://${host}:${preview.port}/health`);
    const page = await fetchText(preview.url);
    const findings = [];

    if (health.status !== 200 || health.body.status !== "ready") {
      findings.push("health_route_not_ready");
    }
    if (page.status !== 200) {
      findings.push("control_center_route_not_200");
    }
    for (const text of preview.contract.screenshotVerification.requiredVisibleText) {
      if (!page.body.includes(text)) {
        findings.push(`missing_text:${text}`);
      }
    }
    if (/<script/i.test(page.body)) {
      findings.push("script_tag_present");
    }
    if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(page.body)) {
      findings.push("external_url_present");
    }

    return {
      schema: "gpao_t.control_center_serving_verification.v0_1",
      status: findings.length ? "blocked" : "ready",
      url: preview.url,
      healthStatus: health.status,
      pageStatus: page.status,
      contentLength: page.body.length,
      requiredVisibleText: preview.contract.screenshotVerification.requiredVisibleText,
      findings,
      authorityBoundary: preview.contract.authorityBoundary,
      screenshotNextAction:
        "Use the browser to capture desktop and mobile screenshots at this loopback URL before interactive UI work.",
    };
  } finally {
    await preview.close();
  }
}

function respondJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value, null, 2));
}

async function fetchText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}
