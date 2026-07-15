import { spawn } from "node:child_process";
import { RuntimeError } from "./errors.js";

const LABELS = Object.freeze({
  openai: "OpenAI API key",
  anthropic: "Anthropic API key",
  "google-gemini": "Google Gemini API key",
  "telegram-bot": "Telegram Bot token"
});

function acquireWithAppleScript({ label, providerId }) {
  const title = providerId === "telegram-bot" ? "GPAO-T3 Telegram 연결" : "GPAO-T3 모델 연결";
  const script = `display dialog ${JSON.stringify(`${label}를 입력하세요. 값은 macOS Keychain에만 저장됩니다.`)} default answer "" with hidden answer buttons {"취소", "연결"} default button "연결" cancel button "취소" with title ${JSON.stringify(title)}\ntext returned of result`;
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", ["-e", script], { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    child.stdout.on("data", chunk => {
      output += String(chunk);
      if (output.length > 16_384) child.kill("SIGKILL");
    });
    child.once("error", () => reject(new RuntimeError("credential_acquisition_unavailable", "The secure credential prompt could not open", 503)));
    child.once("exit", code => {
      if (code !== 0) return reject(new RuntimeError("credential_acquisition_cancelled", "Model connection was cancelled", 409));
      const secret = output.replace(/\r?\n$/, "");
      output = "";
      if (secret.length < 8 || /[\r\n]/.test(secret)) return reject(new RuntimeError("invalid_credential", "The provider credential is not valid", 400));
      resolve(secret);
    });
  });
}

export class MacOSSecretAcquirer {
  constructor({ runner = acquireWithAppleScript } = {}) { this.runner = runner; }
  async acquire({ providerId }) {
    const label = LABELS[providerId];
    if (!label) throw new RuntimeError("secure_connection_method_unavailable", "This provider does not use API key entry", 400);
    return this.runner({ providerId, label });
  }
}
