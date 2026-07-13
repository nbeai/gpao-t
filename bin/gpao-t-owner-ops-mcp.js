#!/usr/bin/env node
import { createInterface } from "node:readline";
import { handleOwnerOpsMcpMessage } from "../src/core/owner-ops-mcp-server.js";

const root = process.env.GPAO_T_ROOT || process.cwd();
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  const text = line.trim();
  if (!text) return;
  try {
    const message = JSON.parse(text);
    const response = handleOwnerOpsMcpMessage(message, { root });
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: error.message,
      },
    })}\n`);
  }
});

rl.on("close", () => {
  process.stdout.write("", () => {
    process.exit(0);
  });
});
