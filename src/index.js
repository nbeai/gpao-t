import { defaultStateDir } from "./core/paths.js";
import { NativeRuntime } from "./core/runtime.js";
import { createHttpServer } from "./core/http.js";
import { migrateState, restoreState, snapshotState } from "./core/release-state.js";
import { SecureConnectionProcessClient } from "./core/secure-connection-process-client.js";
import { PRODUCT_IDENTITY } from "./core/product-identity.js";
import { TelegramChannelProcessClient } from "./core/telegram-channel-process-client.js";
import { createTelegramMessengerAdapter } from "./core/telegram-messenger-adapter.js";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const command = process.argv[2] || "start";
const stateDir = arg("--state-dir", defaultStateDir());
const port = Number(arg("--port", "18899"));

function createRuntime() {
  // The lab exposes a real account connection only through the protected
  // agent. Unsupported operating systems remain fail-closed.
  const secureConnectionAgent = process.platform === "darwin"
    ? new SecureConnectionProcessClient()
    : null;
  const telegram = process.platform === "darwin"
    ? createTelegramMessengerAdapter({ client: new TelegramChannelProcessClient() })
    : null;
  return new NativeRuntime({ stateDir, secureConnectionAgent, channelAdapters: telegram ? { telegram } : {} });
}

if (command === "doctor") {
  const runtime = await createRuntime().start();
  console.log(JSON.stringify(await runtime.doctor(), null, 2));
  await runtime.stop();
} else if (command === "start") {
  const runtime = await createRuntime().start();
  const { server } = createHttpServer(runtime, { port });
  server.listen(port, "127.0.0.1", () => console.log(`${PRODUCT_IDENTITY.runtimeName} listening on http://127.0.0.1:${port}`));
  const shutdown = async () => { server.close(); await runtime.stop(); process.exit(0); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} else if (command === "snapshot") {
  console.log(JSON.stringify(snapshotState({ stateDir, label: arg("--label", "manual") }), null, 2));
} else if (command === "restore") {
  const snapshot = arg("--snapshot", null);
  if (!snapshot) throw new Error("--snapshot is required for restore");
  console.log(JSON.stringify(restoreState({ stateDir, snapshot }), null, 2));
} else if (command === "migrate") {
  console.log(JSON.stringify(migrateState({ stateDir }), null, 2));
} else if (command === "verify-turn") {
  const runtime = await createRuntime().start();
  try {
    const principalId = "owner:distribution-verifier";
    const accepted = await runtime.submitTurn({ principalId, requestId: `verify-${Date.now()}`, payload: { input: "GPAO-T3 distribution verification" } });
    const startedAt = Date.now();
    let turn = null;
    while (!turn?.receipt) {
      if (Date.now() - startedAt > 5_000) throw new Error("Distribution verification turn timed out");
      await new Promise(resolve => setTimeout(resolve, 20));
      turn = await runtime.getTurn(principalId, accepted.commandId);
    }
    console.log(JSON.stringify({ schema: "gpao_t3.distribution_turn_verification.v1", status: turn.status, commandId: turn.id, receipt: turn.receipt }, null, 2));
  } finally {
    await runtime.stop();
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 2;
}
