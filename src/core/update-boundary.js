import { GPAO_T_RELEASE_CONTRACT } from "./release-contract.js";

export const GPAO_T_RELEASE_VERSION = GPAO_T_RELEASE_CONTRACT.version;
export const GPAO_T_UPDATE_FEED_SCHEMA = "gpao_t.github_update_feed.v1";
export const GPAO_T_UPDATE_BOUNDARY_SCHEMA = "gpao_t.update_boundary.v1";
export const GPAO_T_DEFAULT_GITHUB_UPDATE_FEED_URL =
  "https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json";

function normalizedUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseDateVersion(version) {
  const match = String(version || "").match(/^(\d{4})\.(\d{2})\.(\d{2})-r(\d+)$/u);
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

export function compareGpaoTDateVersions(left, right) {
  const a = parseDateVersion(left);
  const b = parseDateVersion(right);
  if (!a || !b) throw new Error(`Unsupported GPAO-T date version comparison: ${left} vs ${right}`);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function normalizedAsset(asset) {
  if (!asset || typeof asset !== "object") return null;
  const url = normalizedUrl(asset.url);
  const sha256 = typeof asset.sha256 === "string" && /^[a-f0-9]{64}$/u.test(asset.sha256.trim())
    ? asset.sha256.trim()
    : null;
  const name = typeof asset.name === "string" && asset.name.trim() ? asset.name.trim() : null;
  const kind = typeof asset.kind === "string" && asset.kind.trim() ? asset.kind.trim() : null;
  if (!url || !sha256 || !name || !kind) return null;
  return {
    kind,
    name,
    url,
    sha256,
    bytes: Number.isSafeInteger(asset.bytes) && asset.bytes >= 0 ? asset.bytes : null,
    platform: typeof asset.platform === "string" && asset.platform.trim() ? asset.platform.trim() : null,
  };
}

export function verifyGpaoTUpdateFeed(feed) {
  const findings = [];
  if (!feed || typeof feed !== "object") findings.push("feed_not_object");
  if (feed?.schema !== GPAO_T_UPDATE_FEED_SCHEMA) findings.push("schema_mismatch");
  if (feed?.productId !== GPAO_T_RELEASE_CONTRACT.productId) findings.push("product_id_mismatch");
  if (!parseDateVersion(feed?.version)) findings.push("version_not_date_release");
  const assets = Array.isArray(feed?.assets) ? feed.assets.map(normalizedAsset).filter(Boolean) : [];
  if (assets.length === 0) findings.push("missing_assets");
  if (!assets.some((asset) => asset.kind === "macos_installer")) findings.push("missing_macos_installer_asset");
  if (!assets.some((asset) => asset.kind === "production_distribution")) findings.push("missing_distribution_asset");
  return {
    schema: `${GPAO_T_UPDATE_FEED_SCHEMA}.verification`,
    ok: findings.length === 0,
    findings,
    assets,
  };
}

export function selectGpaoTUpdateCandidate(feed, currentVersion = GPAO_T_RELEASE_VERSION) {
  const verification = verifyGpaoTUpdateFeed(feed);
  if (!verification.ok) {
    return {
      status: "invalid_feed",
      updateAvailable: false,
      reason: verification.findings[0] || "invalid_update_feed",
      verification,
    };
  }
  const comparison = compareGpaoTDateVersions(feed.version, currentVersion);
  if (comparison <= 0) {
    return {
      status: "current",
      updateAvailable: false,
      currentVersion,
      latestVersion: feed.version,
      verification,
    };
  }
  return {
    status: "update_available",
    updateAvailable: true,
    currentVersion,
    latestVersion: feed.version,
    releasePageUrl: normalizedUrl(feed.releasePageUrl),
    assets: verification.assets,
    verification,
  };
}

export function buildGpaoTUpdateFeed({
  version = GPAO_T_RELEASE_VERSION,
  generatedAt = new Date().toISOString(),
  releasePageUrl = null,
  assets = [],
} = {}) {
  return {
    schema: GPAO_T_UPDATE_FEED_SCHEMA,
    productId: GPAO_T_RELEASE_CONTRACT.productId,
    product: GPAO_T_RELEASE_CONTRACT.productName,
    channel: "github-releases",
    version,
    generatedAt,
    releasePageUrl: releasePageUrl ? normalizedUrl(releasePageUrl) : null,
    minimumInstalledVersion: "2026.07.15-r1",
    installStrategy: {
      mode: "staged_verified_local_install",
      preservesStateHome: true,
      snapshotBeforeApply: true,
      rollbackAvailable: true,
      requiresSha256Verification: true,
    },
    assets: assets.map(normalizedAsset).filter(Boolean),
  };
}

export function resolveGpaoTUpdateBoundary(env = process.env) {
  const feedUrl = normalizedUrl(env.GPAO_T_UPDATE_FEED_URL || env.GPAO_T_GITHUB_UPDATE_FEED_URL);
  return {
    schema: GPAO_T_UPDATE_BOUNDARY_SCHEMA,
    product: "GPAO-T",
    currentVersion: GPAO_T_RELEASE_VERSION,
    mode: "gpao_t_managed",
    enabled: Boolean(feedUrl),
    feedUrl,
    compatibilityUpdaterAllowed: false,
    reason: feedUrl
      ? "gpao_t_github_update_feed_configured"
      : "gpao_t_update_feed_not_configured",
  };
}

export function gpaoTUpdateStatus(env = process.env, { feed = null } = {}) {
  const boundary = resolveGpaoTUpdateBoundary(env);
  const candidate = feed ? selectGpaoTUpdateCandidate(feed, boundary.currentVersion) : null;
  return {
    ...boundary,
    status: candidate?.status || (boundary.enabled ? "configured_ready" : "disabled"),
    updateAvailable: candidate ? candidate.updateAvailable : null,
    latestVersion: candidate?.latestVersion || null,
    assets: candidate?.assets || [],
    reason: candidate?.reason || boundary.reason,
  };
}

export function assertCompatibilityUpdaterDisabled(env = process.env) {
  if (resolveGpaoTUpdateBoundary(env).compatibilityUpdaterAllowed) {
    throw new Error("GPAO-T compatibility updater must remain disabled");
  }
  return true;
}
