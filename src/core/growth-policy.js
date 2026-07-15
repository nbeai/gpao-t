import { RuntimeError } from "./errors.js";

export const DEFAULT_GROWTH_ADMISSION_POLICY = Object.freeze({
  maxAnchors: 3,
  maxSupporting: 6,
  relevanceThreshold: 0.15,
  anchorThreshold: 0.15
});

const LIMITS = Object.freeze({
  maxAnchors: Object.freeze({ minimum: 1, maximum: 4, integer: true }),
  maxSupporting: Object.freeze({ minimum: 0, maximum: 8, integer: true }),
  relevanceThreshold: Object.freeze({ minimum: 0.05, maximum: 0.8, integer: false }),
  anchorThreshold: Object.freeze({ minimum: 0.05, maximum: 0.9, integer: false })
});

export function validateGrowthPolicyChange(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RuntimeError("growth_mutation_not_projectable", "허용된 admission 변경 값이 필요합니다.", 400);
  }
  const keys = Object.keys(input);
  if (!keys.length || keys.some(key => !Object.hasOwn(LIMITS, key))) {
    throw new RuntimeError("growth_mutation_not_projectable", "허용된 admission 변경 값만 사용할 수 있습니다.", 400);
  }
  const change = {};
  for (const key of keys) {
    const value = input[key];
    const limit = LIMITS[key];
    if (!Number.isFinite(value) || (limit.integer && !Number.isInteger(value)) || value < limit.minimum || value > limit.maximum) {
      throw new RuntimeError("growth_policy_value_invalid", "admission 변경 값이 안전한 제한 범위를 벗어났습니다.", 400);
    }
    change[key] = value;
  }
  const projected = { ...DEFAULT_GROWTH_ADMISSION_POLICY, ...change };
  if (projected.anchorThreshold < projected.relevanceThreshold && Object.hasOwn(change, "anchorThreshold")) {
    throw new RuntimeError("growth_policy_threshold_order_invalid", "answer anchor 기준은 검색 관련성 기준보다 낮을 수 없습니다.", 400);
  }
  return Object.freeze(change);
}

export function applyGrowthPolicyChange(policy = DEFAULT_GROWTH_ADMISSION_POLICY, input = {}) {
  const change = validateGrowthPolicyChange(input);
  const projected = { ...policy, ...change };
  if (projected.anchorThreshold < projected.relevanceThreshold) projected.anchorThreshold = projected.relevanceThreshold;
  return projected;
}

export const GROWTH_ADMISSION_POLICY_LIMITS = LIMITS;
