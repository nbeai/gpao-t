import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const DEFAULT_WORKSPACE = process.env.GPAO_T_RUNTIME_WORKSPACE || join(homedir(), ".gpao-t", "workspace");
const APPLY_TOKEN = "apply-gpao-t-welcome-settings";
const PRODUCT_IDENTITY = "nBeAI. GPAO-T is an independent, local-first Growth Personal AI Operating System.";

export function buildRuntimeWorkspaceWelcome({
  workspaceRoot = DEFAULT_WORKSPACE,
  now = new Date().toISOString(),
} = {}) {
  const files = expectedWorkspaceFiles({ workspaceRoot });
  const missingFiles = files.filter((entry) => !entry.exists).map((entry) => entry.file);
  return {
    schema: "gpao_t.runtime_workspace_welcome.v0_1",
    status: missingFiles.length ? "blocked" : "ready",
    generatedAt: now,
    product: "nBeAI. GPAO-T",
    productIdentity: PRODUCT_IDENTITY,
    workspaceRoot,
    requiredFiles: files,
    missingFiles,
    welcomeMessage:
      "안녕하세요. 저는 독립적인 로컬 우선 Growth Personal AI Operating System, nBeAI. GPAO-T입니다. 지금은 당신과 함께 사용할 개인 AI 운영체제의 첫 설정을 하는 중입니다. 먼저 이름, 말투, 기억 방식, 자동화 경계를 정해볼게요.",
    requiredQuestions: [
      { id: "userName", prompt: "What should I call you?", targetFile: "USER.md" },
      { id: "userAddress", prompt: "How should GPAO-T address you?", targetFile: "USER.md" },
      { id: "companionName", prompt: "What companion persona name should GPAO-T use?", targetFile: "IDENTITY.md" },
      { id: "tone", prompt: "What tone should GPAO-T use?", targetFile: "SOUL.md" },
      { id: "rememberAutomatically", prompt: "What may GPAO-T remember automatically?", targetFile: "MEMORY.md" },
      { id: "neverRemember", prompt: "What must GPAO-T never remember unless explicitly asked?", targetFile: "MEMORY.md" },
      { id: "approvalActions", prompt: "Which actions require approval?", targetFile: "AGENTS.md" },
      { id: "heartbeatEnabled", prompt: "Should heartbeat/self-check be enabled?", targetFile: "HEARTBEAT.md" },
    ],
    authorityBoundary: {
      draftAllowed: true,
      applyRequiresToken: APPLY_TOKEN,
      durableMemoryPromotion: "blocked_unless_durableMemoryApproved_true",
      heartbeatActivation: "blocked_unless_heartbeatEnabled_true",
      externalActions: "blocked",
      secrets: "blocked",
    },
  };
}

export function buildRuntimeWorkspaceWelcomeDraft({
  workspaceRoot = DEFAULT_WORKSPACE,
  answers = {},
  now = new Date().toISOString(),
} = {}) {
  const normalized = normalizeAnswers(answers);
  const writes = [
    { file: "IDENTITY.md", content: renderIdentity(normalized) },
    { file: "USER.md", content: renderUser(normalized) },
    { file: "SOUL.md", content: renderSoul(normalized) },
    { file: "WELCOME-STATE.json", content: `${JSON.stringify(renderWelcomeState(normalized, now), null, 2)}\n` },
  ];

  if (normalized.durableMemoryApproved) {
    writes.push({ file: "MEMORY.md", content: renderMemory(normalized) });
  }

  if (normalized.heartbeatEnabled) {
    writes.push({ file: "HEARTBEAT.md", content: renderHeartbeat(normalized) });
  }

  const findings = [];
  if (!normalized.userName) findings.push("user_name_missing");
  if (!normalized.userAddress) findings.push("user_address_missing");
  if (!normalized.companionName) findings.push("companion_name_missing");
  if (!normalized.tone) findings.push("tone_missing");
  if (normalized.rememberAutomatically.length && !normalized.durableMemoryApproved) {
    findings.push("memory_answers_staged_not_promoted");
  }
  if (normalized.heartbeatEnabled && !normalized.heartbeatApproved) {
    findings.push("heartbeat_enabled_without_explicit_approval");
  }

  return {
    schema: "gpao_t.runtime_workspace_welcome_draft.v0_1",
    status: findings.filter((finding) => finding !== "memory_answers_staged_not_promoted").length
      ? "blocked"
      : "ready",
    generatedAt: now,
    workspaceRoot,
    answers: normalized,
    writes: writes.map((write) => ({
      file: write.file,
      bytes: Buffer.byteLength(write.content),
      operation: existsSync(join(workspaceRoot, write.file)) ? "replace" : "create",
    })),
    findings,
    preview: {
      identity: {
        product: "nBeAI. GPAO-T",
        productIdentity: PRODUCT_IDENTITY,
        companionName: normalized.companionName || null,
        userAddress: normalized.userAddress || null,
      },
      memory: normalized.durableMemoryApproved ? "durable_initial_memory" : "not_promoted",
      heartbeat: normalized.heartbeatEnabled && normalized.heartbeatApproved ? "enabled" : "inactive",
    },
    authorityBoundary: {
      applyRequiresToken: APPLY_TOKEN,
      externalActions: "blocked",
      secrets: "blocked",
      durableMemoryPromotion: normalized.durableMemoryApproved ? "explicitly_allowed" : "blocked",
      heartbeatActivation: normalized.heartbeatEnabled && normalized.heartbeatApproved ? "explicitly_allowed" : "blocked",
    },
  };
}

export function applyRuntimeWorkspaceWelcomeSettings({
  workspaceRoot = DEFAULT_WORKSPACE,
  answers = {},
  approvalToken = "",
  now = new Date().toISOString(),
} = {}) {
  if (approvalToken !== APPLY_TOKEN) {
    throw new Error(`welcome_apply_token_required:${APPLY_TOKEN}`);
  }
  const draft = buildRuntimeWorkspaceWelcomeDraft({ workspaceRoot, answers, now });
  if (draft.status !== "ready") {
    return {
      ...draft,
      status: "blocked",
      applied: false,
    };
  }

  const normalized = normalizeAnswers(answers);
  const writes = [
    { file: "IDENTITY.md", content: renderIdentity(normalized) },
    { file: "USER.md", content: renderUser(normalized) },
    { file: "SOUL.md", content: renderSoul(normalized) },
    { file: "WELCOME-STATE.json", content: `${JSON.stringify(renderWelcomeState(normalized, now), null, 2)}\n` },
  ];
  if (normalized.durableMemoryApproved) {
    writes.push({ file: "MEMORY.md", content: renderMemory(normalized) });
  }
  if (normalized.heartbeatEnabled && normalized.heartbeatApproved) {
    writes.push({ file: "HEARTBEAT.md", content: renderHeartbeat(normalized) });
  }

  const appliedFiles = [];
  for (const write of writes) {
    const target = resolve(workspaceRoot, write.file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, write.content);
    appliedFiles.push(write.file);
  }

  return {
    ...draft,
    status: "applied",
    applied: true,
    appliedAt: now,
    appliedFiles,
  };
}

export function verifyRuntimeWorkspaceWelcome({
  workspaceRoot = DEFAULT_WORKSPACE,
} = {}) {
  const welcome = buildRuntimeWorkspaceWelcome({ workspaceRoot });
  const findings = [...welcome.missingFiles.map((file) => `missing:${file}`)];
  const identity = readOptional(join(workspaceRoot, "IDENTITY.md"));
  const user = readOptional(join(workspaceRoot, "USER.md"));
  const soul = readOptional(join(workspaceRoot, "SOUL.md"));
  const welcomeMd = readOptional(join(workspaceRoot, "WELCOME.md"));

  if (!identity.includes("nBeAI. GPAO-T")) findings.push("identity_product_missing");
  if (!/independent, local-first Growth Personal AI Operating System/i.test(identity)) {
    findings.push("identity_independent_product_contract_missing");
  }
  if (!(user.includes("User Name") || (user.includes("**Name:**") && user.includes("**Preferred Address:**")))) {
    findings.push("user_contract_missing");
  }
  if (!soul.includes("nBeAI. GPAO-T")) findings.push("soul_product_missing");
  if (!welcomeMd.includes("Required Setup Questions")) findings.push("welcome_questions_missing");

  return {
    schema: "gpao_t.runtime_workspace_welcome_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    workspaceRoot,
    findings,
    welcomeStatus: welcome.status,
  };
}

function expectedWorkspaceFiles({ workspaceRoot }) {
  return [
    "AGENTS.md",
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "TOOLS.md",
    "HEARTBEAT.md",
    "MEMORY.md",
    "WELCOME.md",
    "RUNTIME-MANIFEST.json",
  ].map((file) => ({
    file,
    exists: existsSync(join(workspaceRoot, file)),
  }));
}

function normalizeAnswers(answers) {
  return {
    userName: stringValue(answers.userName),
    userAddress: stringValue(answers.userAddress || answers.userName),
    companionName: stringValue(answers.companionName),
    tone: stringValue(answers.tone || "calm, precise, warm, and direct Korean honorific speech"),
    rememberAutomatically: listValue(answers.rememberAutomatically),
    neverRemember: listValue(answers.neverRemember),
    approvalActions: listValue(answers.approvalActions || [
      "external send",
      "money or purchase",
      "file deletion",
      "rule change",
      "public post",
      "durable memory promotion",
      "automation activation",
    ]),
    durableMemoryApproved: answers.durableMemoryApproved === true,
    heartbeatEnabled: answers.heartbeatEnabled === true,
    heartbeatApproved: answers.heartbeatApproved === true,
  };
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function listValue(value) {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function bulletList(items, fallback) {
  const list = items.length ? items : [fallback];
  return list.map((item) => `- ${item}`).join("\n");
}

function renderIdentity(answers) {
  return `# IDENTITY.md - GPAO-T Runtime Identity

- **Product Name:**
  nBeAI. GPAO-T
- **Runtime Role:**
  Independent, local-first Growth Personal AI Operating System
- **Runtime Infrastructure:**
  GPAO-T-owned local gateway, channel, session, tool, and workspace capabilities
- **Companion Persona Name:**
  ${answers.companionName || "Unset until first-install personalization"}
- **Default User Address:**
  ${answers.userAddress || "Unset until first-install personalization"}
- **Default Language:**
  Korean, polished honorific speech unless changed by the user
- **Vibe:**
  ${answers.tone}
- **Avatar:**
  gpao-logo.jpeg

## Identity Rule

When there is a conflict between a third-party compatibility default and GPAO-T identity, use GPAO-T identity for user-facing language.

Use third-party source names only inside explicit comparison, compatibility, migration, legal attribution, technical provenance, or engineering audit contexts.
`;
}

function renderUser(answers) {
  return `# USER.md - GPAO-T User Contract

- **User Name:**
  ${answers.userName}
- **User Address:**
  ${answers.userAddress}
- **Timezone:**
  Asia/Seoul unless the user changes it
- **Preferred Tone:**
  ${answers.tone}

## Approval Boundaries

The following actions require explicit approval:

${bulletList(answers.approvalActions, "external send, money, deletion, rule change, public post, durable memory, and automation")}
`;
}

function renderSoul(answers) {
  return `# SOUL.md - GPAO-T Voice And Stance

You are **nBeAI. GPAO-T**, expressed through the companion persona chosen during first-install personalization.

Use this tone:

${answers.tone}

Your role is not to act like a generic chatbot. You help the user operate an independent, local-first Growth Personal AI Operating System with clarity, pacing, evidence, memory discipline, and approval boundaries.

Never hide uncertainty, memory mutation, automation, or external action behind a friendly tone.
`;
}

function renderMemory(answers) {
  return `# MEMORY.md - GPAO-T Curated Memory

This file contains durable memory explicitly approved during welcome setup.

${PRODUCT_IDENTITY}

## User-Approved Initial Memory

${bulletList(answers.rememberAutomatically, "No automatic durable memory approved.")}

## Never Remember Without Explicit Approval

${bulletList(answers.neverRemember, "No extra restriction provided.")}
`;
}

function renderHeartbeat(answers) {
  return `# HEARTBEAT.md - GPAO-T Self-check Loop

Heartbeat/self-check is enabled because the user explicitly approved it during welcome setup.

Rules:

- No external sends.
- No connector writes.
- No durable memory promotion.
- No live OS rule mutation.
- Report only material local health issues.

Tone:

${answers.tone}
`;
}

function renderWelcomeState(answers, now) {
  return {
    schema: "gpao_t.welcome_state.v0_1",
    completedAt: now,
    product: "nBeAI. GPAO-T",
    productIdentity: PRODUCT_IDENTITY,
    companionName: answers.companionName,
    userName: answers.userName,
    userAddress: answers.userAddress,
    durableMemoryApproved: answers.durableMemoryApproved,
    heartbeatEnabled: answers.heartbeatEnabled && answers.heartbeatApproved,
    approvalActions: answers.approvalActions,
  };
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}
