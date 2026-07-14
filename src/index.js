import { defaultStateDir } from "./core/paths.js";
import { NativeRuntime } from "./core/runtime.js";
import { createHttpServer } from "./core/http.js";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const command = process.argv[2] || "start";
const stateDir = arg("--state-dir", defaultStateDir());
const port = Number(arg("--port", "18899"));

if (command === "doctor") {
  const runtime = new NativeRuntime({ stateDir }).start();
  console.log(JSON.stringify(runtime.doctor(), null, 2));
  await runtime.stop();
} else if (command === "start") {
  const runtime = new NativeRuntime({ stateDir }).start();
  const { server } = createHttpServer(runtime, { port });
  server.listen(port, "127.0.0.1", () => console.log(`GPAO-T Native Runtime listening on http://127.0.0.1:${port}`));
  const shutdown = async () => { server.close(); await runtime.stop(); process.exit(0); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 2;
}
