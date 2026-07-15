export const GPAO_T_RELEASE_CONTRACT = Object.freeze({
  schema: "gpao_t.release_contract.v1",
  productId: "gpao-t",
  productName: "nBeAI. GPAO-T",
  version: "2026.07.15-r3",
  distributionChannel: "public-source-prep",
  intendedAudience: "public",
  sourceVisibilityTarget: "public",
  publicRelease: false,
  externalDistributionExecuted: false,
});

export function assertGpaoTReleaseIdentity(value, label = "release identity") {
  const contract = GPAO_T_RELEASE_CONTRACT;
  for (const key of [
    "productId",
    "version",
    "distributionChannel",
    "intendedAudience",
    "publicRelease",
    "externalDistributionExecuted",
  ]) {
    if (value?.[key] !== contract[key]) {
      throw new Error(`${label} ${key} mismatch: expected ${JSON.stringify(contract[key])}, found ${JSON.stringify(value?.[key])}`);
    }
  }
  if (!/^\d{4}\.\d{2}\.\d{2}-r\d+$/u.test(value.version)) {
    throw new Error(`${label} version must be date-based release id`);
  }
  return true;
}
