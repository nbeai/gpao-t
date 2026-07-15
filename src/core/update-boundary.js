import { GPAO_T_RELEASE_CONTRACT } from "./release-contract.js";

export const GPAO_T_RELEASE_VERSION = GPAO_T_RELEASE_CONTRACT.version;

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

export function resolveGpaoTUpdateBoundary(env = process.env) {
  const feedUrl = normalizedUrl(env.GPAO_T_UPDATE_FEED_URL);
  return {
    schema: "gpao_t.update_boundary.v1",
    product: "GPAO-T",
    currentVersion: GPAO_T_RELEASE_VERSION,
    mode: "gpao_t_managed",
    enabled: Boolean(feedUrl),
    feedUrl,
    compatibilityUpdaterAllowed: false,
    reason: feedUrl
      ? "gpao_t_update_service_not_activated"
      : "gpao_t_update_feed_not_configured",
  };
}

export function gpaoTUpdateStatus(env = process.env) {
  const boundary = resolveGpaoTUpdateBoundary(env);
  return {
    ...boundary,
    status: boundary.enabled ? "configured_inactive" : "disabled",
    updateAvailable: null,
  };
}

export function assertCompatibilityUpdaterDisabled(env = process.env) {
  if (resolveGpaoTUpdateBoundary(env).compatibilityUpdaterAllowed) {
    throw new Error("GPAO-T compatibility updater must remain disabled");
  }
  return true;
}
