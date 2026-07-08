import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import {
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellHtml,
  buildBrowserLocalAppShellState,
  verifyBrowserLocalAppShell,
} from "./browser-local-app-shell.js";
import { renderControlCenterHtml } from "./control-center-renderer.js";
import { buildControlCenterSnapshot, buildControlCenterSummary } from "./control-center.js";
import {
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  validateControlCenterUiSnapshot,
} from "./control-center-ui-contract.js";
import { buildLocalControlCenterDesignContract } from "./design-contract.js";
import { runDoctor } from "./doctor.js";
import {
  buildTauriPackagedDesktopGate,
  verifyTauriPackagedDesktopGate,
} from "./tauri-packaged-desktop-gate.js";

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
      { path: "/app-shell", content: "browser_local_app_shell_html" },
      { path: "/app-shell.html", content: "browser_local_app_shell_html" },
      { path: "/app-shell/contract", content: "browser_local_app_shell_contract" },
      { path: "/app-shell/state", content: "browser_local_app_shell_state" },
      { path: "/app-shell/verify", content: "browser_local_app_shell_verification" },
      { path: "/app-shell/tauri-gate", content: "tauri_packaged_desktop_gate" },
      { path: "/app-shell/tauri-gate/verify", content: "tauri_packaged_desktop_gate_verification" },
      { path: "/control-center/summary", content: "local_json_control_center_summary" },
      { path: "/control-center/design", content: "local_json_control_center_design" },
      { path: "/control-center/ui-contract", content: "local_json_control_center_ui_contract" },
      { path: "/control-center/ui-snapshot", content: "local_json_control_center_ui_snapshot" },
      { path: "/control-center/ui-validate", content: "local_json_control_center_ui_validation" },
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
    if (request.method !== "GET") {
      respondJson(response, 405, {
        schema: "gpao_t.browser_local_app_shell_blocked_route.v0_1",
        status: "blocked",
        method: request.method,
        path: url.pathname,
        reason: "browser_local_app_shell_first_slice_is_get_only",
        blockedActions: buildBrowserLocalAppShellContract().blockedActions,
        nextSafeAction: "Use GET-only app-shell and control-center read routes.",
      });
      return;
    }

    if (url.pathname === "/health") {
      respondJson(response, 200, {
        schema: "gpao_t.control_center_serving_health.v0_1",
        status: "ready",
        servingMode: contract.servingMode,
        authorityBoundary: contract.authorityBoundary,
      });
      return;
    }

    if (url.pathname === "/control-center/summary") {
      respondJson(response, 200, buildControlCenterSummary({ root }));
      return;
    }

    if (url.pathname === "/control-center/design") {
      respondJson(response, 200, buildLocalControlCenterDesignContract());
      return;
    }

    if (url.pathname === "/control-center/ui-contract") {
      respondJson(response, 200, buildControlCenterUiContract());
      return;
    }

    if (url.pathname === "/control-center/ui-snapshot") {
      const snapshot = buildControlCenterSnapshot({ root });
      respondJson(response, 200, buildControlCenterUiSnapshot({
        snapshot,
        designContract: buildLocalControlCenterDesignContract(),
      }));
      return;
    }

    if (url.pathname === "/control-center/ui-validate") {
      const snapshot = buildControlCenterSnapshot({ root });
      const uiSnapshot = buildControlCenterUiSnapshot({
        snapshot,
        designContract: buildLocalControlCenterDesignContract(),
      });
      respondJson(response, 200, validateControlCenterUiSnapshot({ uiSnapshot }));
      return;
    }

    if (url.pathname === "/app-shell/contract") {
      respondJson(response, 200, buildBrowserLocalAppShellContract());
      return;
    }

    if (url.pathname === "/app-shell/state") {
      respondJson(response, 200, buildBrowserLocalAppShellState({ root, now }));
      return;
    }

    if (url.pathname === "/app-shell/verify") {
      respondJson(response, 200, verifyBrowserLocalAppShell({
        state: buildBrowserLocalAppShellState({ root, now }),
      }));
      return;
    }

    if (url.pathname === "/app-shell/tauri-gate") {
      respondJson(response, 200, buildTauriPackagedDesktopGate());
      return;
    }

    if (url.pathname === "/app-shell/tauri-gate/verify") {
      respondJson(response, 200, verifyTauriPackagedDesktopGate({
        appShellVerification: verifyBrowserLocalAppShell({
          state: buildBrowserLocalAppShellState({ root, now }),
        }),
      }));
      return;
    }

    if (["/app-shell", "/app-shell.html"].includes(url.pathname)) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gpao-t-surface": "browser-local-app-shell",
      });
      response.end(buildBrowserLocalAppShellHtml({
        state: buildBrowserLocalAppShellState({ root, now }),
      }));
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
    const appShell = await fetchText(`http://${host}:${preview.port}/app-shell`);
    const appShellState = await fetchJson(`http://${host}:${preview.port}/app-shell/state`);
    const tauriGate = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-gate`);
    const tauriGateVerify = await fetchJson(`http://${host}:${preview.port}/app-shell/tauri-gate/verify`);
    const blockedPost = await fetchJson(`http://${host}:${preview.port}/app-shell`, { method: "POST" });
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
    if (appShell.status !== 200) {
      findings.push("app_shell_route_not_200");
    }
    if (!appShell.body.includes("GPAO-T Browser-Local App Shell")) {
      findings.push("app_shell_missing_title");
    }
    if (/<script/i.test(appShell.body)) {
      findings.push("app_shell_script_tag_present");
    }
    if (appShellState.status !== 200 || appShellState.body.schema !== "gpao_t.browser_local_app_shell_state.v0_1") {
      findings.push("app_shell_state_not_ready");
    }
    if (tauriGate.status !== 200 || tauriGate.body.schema !== "gpao_t.tauri_packaged_desktop_gate.v0_1") {
      findings.push("tauri_gate_not_ready");
    }
    if (tauriGateVerify.status !== 200 || tauriGateVerify.body.status !== "ready") {
      findings.push("tauri_gate_verify_not_ready");
    }
    if (blockedPost.status !== 405 || blockedPost.body.status !== "blocked") {
      findings.push("app_shell_post_not_blocked");
    }

    return {
      schema: "gpao_t.control_center_serving_verification.v0_1",
      status: findings.length ? "blocked" : "ready",
      url: preview.url,
      appShellUrl: `http://${host}:${preview.port}/app-shell`,
      tauriGateUrl: `http://${host}:${preview.port}/app-shell/tauri-gate`,
      healthStatus: health.status,
      pageStatus: page.status,
      appShellStatus: appShell.status,
      tauriGateStatus: tauriGate.status,
      blockedPostStatus: blockedPost.status,
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

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}
