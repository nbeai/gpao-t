import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { classifyContextCandidateUse, classifyRequestTarget } from "./context-admission-policy.js";
import { runtimePaths } from "./storage.js";

const WIKI_FILE = "memory/wiki.json";
const TCELL_CANDIDATE_FILE = "memory/tcell-candidates.jsonl";

export function memoryWikiPaths({ root } = {}) {
  const paths = runtimePaths({ root });
  return {
    runtimeRoot: paths.runtimeRoot,
    wikiFile: resolve(paths.runtimeRoot, WIKI_FILE),
    tcellCandidateFile: resolve(paths.runtimeRoot, TCELL_CANDIDATE_FILE),
  };
}

export function initializeMemoryWiki({ root, now = new Date().toISOString() } = {}) {
  const paths = memoryWikiPaths({ root });
  mkdirSync(dirname(paths.wikiFile), { recursive: true });
  if (!existsSync(paths.wikiFile)) {
    writeMemoryWiki({
      schema: "gpao_t.memory_wiki.v0_1",
      status: "local_candidate_store",
      createdAt: now,
      updatedAt: now,
      entries: [],
      rule: "Memory Wiki stores source-linked entries; Context Mesh admission decides current-turn use.",
    }, { root });
  }
  mkdirSync(dirname(paths.tcellCandidateFile), { recursive: true });
  if (!existsSync(paths.tcellCandidateFile)) {
    writeFileSync(paths.tcellCandidateFile, "");
  }
  return readMemoryWiki({ root });
}

export function readMemoryWiki({ root } = {}) {
  const paths = memoryWikiPaths({ root });
  if (!existsSync(paths.wikiFile)) {
    return initializeMemoryWiki({ root });
  }
  return JSON.parse(readFileSync(paths.wikiFile, "utf8"));
}

export function writeMemoryWiki(wiki, { root } = {}) {
  const paths = memoryWikiPaths({ root });
  mkdirSync(dirname(paths.wikiFile), { recursive: true });
  writeFileSync(paths.wikiFile, `${JSON.stringify(wiki, null, 2)}\n`);
  return wiki;
}

export function captureMemoryEntry({
  title,
  body,
  tags = [],
  source = "user",
  root,
  now = new Date().toISOString(),
} = {}) {
  if (!title || !body) {
    throw new Error("captureMemoryEntry requires title and body");
  }

  const wiki = initializeMemoryWiki({ root, now });
  const entry = {
    schema: "gpao_t.memory_entry.v0_1",
    id: `mem.${slug(title)}.${Date.parse(now) || 0}`,
    title,
    body,
    tags,
    source,
    status: "candidate",
    createdAt: now,
    updatedAt: now,
  };
  const nextWiki = {
    ...wiki,
    updatedAt: now,
    entries: [...wiki.entries, entry],
  };
  writeMemoryWiki(nextWiki, { root });

  const candidate = buildTCellCandidateFromMemory(entry);
  appendTCellCandidate(candidate, { root });

  return {
    schema: "gpao_t.memory_capture_result.v0_1",
    status: "captured_as_candidate",
    entry,
    tcellCandidate: candidate,
    boundary: "candidate capture only; no durable promotion or live behavior mutation",
  };
}

export function appendTCellCandidate(candidate, { root } = {}) {
  const paths = memoryWikiPaths({ root });
  mkdirSync(dirname(paths.tcellCandidateFile), { recursive: true });
  writeFileSync(paths.tcellCandidateFile, `${JSON.stringify(candidate)}\n`, { flag: "a" });
  return candidate;
}

export function readTCellCandidates({ root, limit = 100 } = {}) {
  const paths = memoryWikiPaths({ root });
  if (!existsSync(paths.tcellCandidateFile)) {
    initializeMemoryWiki({ root });
    return [];
  }
  return readFileSync(paths.tcellCandidateFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function resolveContextMesh({
  request = "",
  inputSignal = { kind: "general_request" },
  activeTargetId,
  priorFlow,
  root,
} = {}) {
  const candidates = readTCellCandidates({ root });
  const requestPolicy = classifyRequestTarget({
    text: request,
    inputSignal,
    priorFlow: priorFlow || (activeTargetId ? { activeTargetId } : null),
  });
  const effectiveTargetId = requestPolicy.activeTargetId || activeTargetId;
  const scored = candidates
    .map((candidate) => {
      const candidateUse = classifyContextCandidateUse({
        candidate,
        requestPolicy: { ...requestPolicy, activeTargetId: effectiveTargetId },
        inputSignal,
      });
      return {
        ...candidate,
        targetMatch: candidateUse.targetMatch,
        admissionRole: candidateUse.admissionRole,
        answerAnchorEligible: candidateUse.answerAnchorEligible,
        downgradeReason: candidateUse.downgradeReason,
        meshScore: scoreCandidate({
          candidate,
          request,
          inputSignal,
          activeTargetId: effectiveTargetId,
          candidateUse,
        }),
      };
    })
    .filter((candidate) => candidate.meshScore > 0)
    .sort((a, b) => b.meshScore - a.meshScore);

  return {
    schema: "gpao_t.context_mesh_resolve.v0_1",
    status: scored.length ? "ready" : "empty",
    request,
    inputSignal,
    activeTargetId: effectiveTargetId,
    requestPolicy,
    retrievedCandidates: scored,
    boundary: "retrieved candidates are not admitted context until AdmissionPacket marks them admitted; stale/supporting candidates cannot become answer anchors",
  };
}

function buildTCellCandidateFromMemory(entry) {
  const anchor = inferAnchor(entry);
  return {
    id: `tcell.candidate.${entry.id}`,
    pi: inferOperatingPrinciple(entry),
    x: [entry.title, entry.body],
    anchor,
    radius: {
      scope: "project",
      validFor: ["follow_up", "artifact_request", "general_request"],
      invalidFor: ["unrelated_topic"],
    },
    depth: {
      evidenceStrength: 0.58,
      stability: 0.44,
      replayPassRate: 0,
    },
    source: {
      refs: [entry.id],
      surface: entry.source === "user" ? "user" : "local_doc",
      evidenceLevel: entry.source === "user" ? "user_said" : "unverified",
    },
    relations: {
      supports: [],
      contradicts: [],
      supersedes: [],
      sameSphere: ["tsphere.memory-wiki-candidates"],
    },
    weights: {
      relevance: 0.5,
      confidence: 0.58,
      freshness: 0.9,
      risk: 0.25,
      cost: 0.1,
    },
    lifecycle: "candidate",
    authority: {
      allowedUse: ["retrieve", "review", "admit_for_current_turn", "explain"],
      blockedUse: ["durable_promotion", "external_action", "live_rule_mutation"],
    },
    trace: {
      createdFrom: entry.id,
      memoryEntryTitle: entry.title,
    },
  };
}

function inferOperatingPrinciple(entry) {
  if (/배포파일|GPAO-T Operating Package|GPAO Operating Package/i.test(`${entry.title} ${entry.body}`)) {
    return "When the user says 배포파일 in a GPAO-T packaging flow, prefer GPAO-T Operating Package over older BEAI archive meanings.";
  }
  return `Use memory entry '${entry.title}' as a candidate operating principle only after Context Mesh admission.`;
}

function inferAnchor(entry) {
  const text = `${entry.title} ${entry.body}`;
  if (/배포파일|GPAO-T Operating Package|GPAO Operating Package/i.test(text)) {
    return "release-file";
  }
  return slug(entry.title);
}

function scoreCandidate({ candidate, request, inputSignal, activeTargetId, candidateUse }) {
  const haystack = [candidate.pi, candidate.anchor, ...(candidate.x || [])].join(" ");
  let score = 0;
  for (const token of tokens(request)) {
    if (token && haystack.includes(token)) {
      score += 2;
    }
  }
  if (candidate.anchor === activeTargetId && candidateUse?.answerAnchorEligible !== false) {
    score += 4;
  }
  if (candidateUse?.admissionRole === "stale_supporting") {
    score -= 1;
  }
  if (candidate.radius?.validFor?.includes(inputSignal.kind)) {
    score += 1;
  }
  if (candidate.lifecycle === "candidate") {
    score += 0.5;
  }
  return score;
}

function tokens(text) {
  return String(text)
    .split(/[\s,.;:!?()[\]{}"'`]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "entry";
}
