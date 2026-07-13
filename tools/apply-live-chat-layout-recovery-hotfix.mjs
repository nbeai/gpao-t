#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const liveRoot =
  "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui";
const indexPath = path.join(liveRoot, "index.html");
const marker = "gpao_t_chat_layout_recovery_v0_1";
const evidenceDir = path.join(
  process.cwd(),
  "docs/03-verification/evidence/live-chat-layout-recovery-hotfix",
);

const css = `
    <style data-gpao-t="${marker}">
      /*
       * GPAO-T live visual recovery.
       * The chat route can collapse to the intrinsic composer height when the
       * custom-element chain is treated as inline/block content. Keep the user
       * chat surface stretched to the app viewport so the composer stays at the
       * bottom and messages are not clipped at the top.
       */
      html,
      body,
      openclaw-app,
      openclaw-app-shell {
        height: 100% !important;
        min-height: 100% !important;
      }

      openclaw-app,
      openclaw-app-shell {
        display: block !important;
        width: 100% !important;
      }

      .shell.shell--chat,
      .content.content--chat {
        min-height: 0 !important;
        height: 100% !important;
      }

      .content.content--chat {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        overflow: hidden !important;
      }

      .content.content--chat > openclaw-router-outlet,
      openclaw-router-outlet,
      openclaw-chat-page,
      openclaw-chat-pane {
        display: flex !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      openclaw-chat-pane > .card.chat,
      openclaw-chat-pane .chat,
      openclaw-chat-pane .chat-workbench,
      openclaw-chat-pane .chat-workbench__main,
      openclaw-chat-pane .chat-split-container {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      openclaw-chat-pane .chat-workbench__main,
      openclaw-chat-pane .chat-split-container {
        overflow: hidden !important;
      }
    </style>`;

function writeEvidence(payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const evidencePath = path.join(evidenceDir, `${stamp}.json`);
  fs.writeFileSync(evidencePath, `${JSON.stringify(payload, null, 2)}\n`);
  return evidencePath;
}

const html = fs.readFileSync(indexPath, "utf8");
fs.mkdirSync(evidenceDir, { recursive: true });
const backupPath = path.join(evidenceDir, `index.before.${Date.now()}.html`);
fs.writeFileSync(backupPath, html);

let next = html;
if (next.includes(`data-gpao-t="${marker}"`)) {
  next = next.replace(
    new RegExp(`\\n?\\s*<style data-gpao-t="${marker}">[\\s\\S]*?<\\/style>`),
    css,
  );
} else if (next.includes("</head>")) {
  next = next.replace("</head>", `${css}\n  </head>`);
} else {
  throw new Error("Could not locate </head> in live GPAO-T index.html");
}

if (next === html) {
  throw new Error("GPAO-T chat layout recovery hotfix produced no change");
}

fs.writeFileSync(indexPath, next);

const evidencePath = writeEvidence({
  schema: "gpao_t.live_chat_layout_recovery_hotfix.v1",
  generatedAt: new Date().toISOString(),
  status: "applied",
  liveRoot,
  indexPath,
  backupPath,
  marker,
  scope: ["live control-ui index.html style injection"],
  reason:
    "Safari visual recovery showed the chat route collapsed to 152px inside an 833px viewport, floating the composer near the top and clipping the main chat surface.",
  expectedVisualContract: {
    routeHeight: "openclaw-router-outlet/openclaw-chat-page/openclaw-chat-pane fill the chat content height",
    composerPosition: "message composer remains in the lower portion of the viewport",
    clipping: "top messages and route header are not hidden by collapsed parent height",
  },
});

console.log(
  JSON.stringify(
    {
      status: "applied",
      indexPath,
      backupPath,
      evidencePath,
      marker,
    },
    null,
    2,
  ),
);
