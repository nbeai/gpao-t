import { resolveContextMesh } from "./memory-wiki.js";

export function buildContextRuntime({ input, sessionOverlay, inputSignal = { kind: "general_request" }, root } = {}) {
  const rememberedTarget = sessionOverlay.activeTargetId || "unknown";
  const mesh = resolveContextMesh({
    request: input.text,
    inputSignal,
    activeTargetId: rememberedTarget,
    root,
  });
  const retrievedCells = [
    buildCoreTCell({
      id: "tcell.active-target.release-file",
      pi: "When the user uses a short follow-up phrase, recover the active target before answering.",
      x: ["그럼 배포파일은?", "그건 어디 있어?", "아까 말한 거"],
      anchor: rememberedTarget,
      validFor: ["follow_up", "artifact_request"],
      sourceRef: "GPAO-T-RUNTIME-SKELETON-CONTRACT-v0.1-ko.md#18.1",
      confidence: 0.84,
    }),
    buildCoreTCell({
      id: "tcell.authority.local-preview-first",
      pi: "Distribution, deletion, secret, account, external send, automation, and public release actions are previewed before approval.",
      x: ["배포", "삭제", "토큰", "외부 전송", "자동화"],
      anchor: "authority-boundary",
      validFor: ["authority_request", "artifact_request", "follow_up"],
      sourceRef: "GPAO-T-RUNTIME-SKELETON-CONTRACT-v0.1-ko.md#4",
      confidence: 0.9,
      risk: 0.62,
    }),
    ...mesh.retrievedCandidates,
  ];

  return {
    schema: "gpao_t.context_runtime.v0_1",
    status: "ready",
    retrievedCells,
    memoryWiki: {
      mode: "candidate_store",
      meshStatus: mesh.status,
      retrievedCandidateCount: mesh.retrievedCandidates.length,
      rule: "structured candidate context only; retrieved candidates are not admitted until AdmissionPacket marks them admitted",
    },
    mesh,
    trace: [
      `input:${input.text}`,
      `flow:${sessionOverlay.flowKey}`,
      `activeTarget:${rememberedTarget}`,
    ],
  };
}

function buildCoreTCell({
  id,
  pi,
  x,
  anchor,
  validFor,
  sourceRef,
  confidence,
  risk = 0.2,
}) {
  return {
    id,
    pi,
    x,
    anchor,
    radius: {
      scope: "project",
      validFor,
      invalidFor: ["unrelated_topic"],
    },
    depth: {
      evidenceStrength: confidence,
      stability: 0.72,
      replayPassRate: 1,
    },
    source: {
      refs: [sourceRef],
      surface: "local_doc",
      evidenceLevel: "tool_verified",
    },
    relations: {
      supports: [],
      contradicts: [],
      supersedes: [],
      sameSphere: ["tsphere.active-target-recovery"],
    },
    weights: {
      relevance: 0.82,
      confidence,
      freshness: 0.92,
      risk,
      cost: 0.1,
    },
    lifecycle: "reviewed",
    authority: {
      allowedUse: ["retrieve", "admit", "explain", "draft"],
      blockedUse: ["external_action", "durable_mutation"],
    },
    trace: {
      createdFrom: sourceRef,
      lastReplay: "release-file-active-target",
    },
  };
}
