export const MCT_R3_NOW = 1_784_160_000_000;

export const REPEATED_CORRECTIONS = Object.freeze([
  { id: "correction-1", kind: "user_correction", correctionClass: "current_request_priority", traceRef: "turn-101", occurredAt: MCT_R3_NOW - 2_000 },
  { id: "correction-2", kind: "user_correction", correctionClass: "current_request_priority", traceRef: "turn-102", occurredAt: MCT_R3_NOW - 1_000 }
]);

export const PASSING_REPLAY_CASES = Object.freeze([
  {
    id: "sealed-current-request-conflict", fixed: true,
    baseline: { quality: 0.62, safe: true, latencyMs: 40, wrongAnchorRate: 0.2, sameFailureCount: 2 },
    candidate: { quality: 0.84, safe: true, latencyMs: 58, wrongAnchorRate: 0, sameFailureCount: 0 }
  },
  {
    id: "sealed-unrelated-project", fixed: true,
    baseline: { quality: 0.7, safe: true, latencyMs: 38, wrongAnchorRate: 0.1, sameFailureCount: 1 },
    candidate: { quality: 0.78, safe: true, latencyMs: 52, wrongAnchorRate: 0, sameFailureCount: 0 }
  }
]);

export function proposalInput(overrides = {}) {
  return {
    ownerId: "owner:a", scope: { level: "project", projectId: "project-t3" },
    observations: REPEATED_CORRECTIONS, observedOutcome: "현재 요청보다 과거 기억을 우선함",
    diagnosis: "충돌하는 과거 기억의 admission 우선순위가 너무 높음",
    target: "admission.current_request_priority", mutationType: "update_admission_rule",
    proposedChange: { maxAnchors: 2, relevanceThreshold: 0.2 }, now: MCT_R3_NOW,
    ...overrides
  };
}
