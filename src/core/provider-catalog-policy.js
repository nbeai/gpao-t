const CATALOG_SCHEMA = "gpao_t3.provider_catalog.v1";
const CATALOG_SCHEMA_VERSION = 1;
const CATALOG_VERSION = 1;
const SECRET_FIELD = /(?:api[_-]?key|token|secret|password|credential|authorization)/i;
const OFFICIAL_PROVIDER_HOSTS = Object.freeze({
  openai: Object.freeze(["api.openai.com"]),
  anthropic: Object.freeze(["api.anthropic.com"]),
  "google-gemini": Object.freeze(["generativelanguage.googleapis.com"])
});

export const TRUSTED_PROVIDER_CATALOG = Object.freeze({
  schema: CATALOG_SCHEMA,
  schemaVersion: CATALOG_SCHEMA_VERSION,
  catalogVersion: CATALOG_VERSION,
  migration: Object.freeze({ fromCatalogVersions: Object.freeze([CATALOG_VERSION]) }),
  providers: Object.freeze([
    Object.freeze({ id: "openai", adapter: "openai-responses", adapterVersion: "0.1", baseUrl: "https://api.openai.com/v1" }),
    Object.freeze({ id: "anthropic", adapter: "anthropic-messages", adapterVersion: "0.1", baseUrl: "https://api.anthropic.com" }),
    Object.freeze({ id: "google-gemini", adapter: "gemini-generate-content", adapterVersion: "0.1", baseUrl: "https://generativelanguage.googleapis.com/v1beta" }),
    Object.freeze({ id: "codex-oauth", adapter: "codex-oauth", adapterVersion: "0.1", baseUrl: null }),
    Object.freeze({ id: "local-ollama", adapter: "ollama-local", adapterVersion: "0.1", baseUrl: null }),
    Object.freeze({ id: "local-model", adapter: "native-deterministic-emulator", adapterVersion: "0.1", baseUrl: null }),
    Object.freeze({ id: "gpao-t-emulator", adapter: "native-deterministic-emulator", adapterVersion: "0.1", baseUrl: null })
  ])
});

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertNoSecretFields(value, path = "catalog") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretFields(item, `${path}[${index}]`));
    return;
  }
  if (!plainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_FIELD.test(key)) throw new Error(`Trusted provider catalog must not contain secret field: ${path}.${key}`);
    assertNoSecretFields(nested, `${path}.${key}`);
  }
}

function officialHttpsUrl(value, providerId) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Trusted provider catalog has an invalid endpoint for ${providerId}`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) {
    throw new Error(`Trusted provider catalog requires a clean HTTPS endpoint for ${providerId}`);
  }
  if (!OFFICIAL_PROVIDER_HOSTS[providerId]?.includes(url.hostname)) {
    throw new Error(`Trusted provider catalog rejects a non-official endpoint for ${providerId}`);
  }
  return url;
}

function canonicalBaseUrl(url) {
  const pathname = url.pathname.replace(/\/$/, "");
  return `${url.origin}${pathname}`;
}

/**
 * Validates the versioned, package-local catalog before it can configure an
 * external provider. It deliberately accepts no runtime endpoint overrides.
 */
export function validateTrustedProviderCatalog(catalog, { adapterVersions } = {}) {
  if (!plainObject(catalog)) throw new Error("Trusted provider catalog must be an object");
  assertNoSecretFields(catalog);
  if (catalog.schema !== CATALOG_SCHEMA || catalog.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    throw new Error("Unsupported trusted provider catalog schema");
  }
  if (catalog.catalogVersion !== CATALOG_VERSION) {
    throw new Error("Unsupported trusted provider catalog version");
  }
  if (!plainObject(catalog.migration) || !Array.isArray(catalog.migration.fromCatalogVersions)
    || !catalog.migration.fromCatalogVersions.every(Number.isInteger)
    || !catalog.migration.fromCatalogVersions.includes(CATALOG_VERSION)) {
    throw new Error("Trusted provider catalog has an invalid migration contract");
  }
  if (!Array.isArray(catalog.providers) || catalog.providers.length === 0) {
    throw new Error("Trusted provider catalog requires providers");
  }

  const providerIds = new Set();
  return catalog.providers.map(provider => {
    if (!plainObject(provider) || typeof provider.id !== "string" || !provider.id
      || typeof provider.adapter !== "string" || !provider.adapter
      || typeof provider.adapterVersion !== "string" || !provider.adapterVersion) {
      throw new Error("Trusted provider catalog has an invalid provider entry");
    }
    if (providerIds.has(provider.id)) throw new Error(`Trusted provider catalog duplicates provider: ${provider.id}`);
    providerIds.add(provider.id);
    if (adapterVersions?.[provider.adapter] !== provider.adapterVersion) {
      throw new Error(`Trusted provider catalog adapter version mismatch: ${provider.adapter}`);
    }
    if (provider.baseUrl === null) return Object.freeze({ ...provider, baseUrl: null });
    if (typeof provider.baseUrl !== "string") throw new Error(`Trusted provider catalog requires a baseUrl for ${provider.id}`);
    const endpoint = officialHttpsUrl(provider.baseUrl, provider.id);
    return Object.freeze({ ...provider, baseUrl: canonicalBaseUrl(endpoint), host: endpoint.hostname });
  });
}

export function createTrustedProviderCatalog({ catalog = TRUSTED_PROVIDER_CATALOG, adapterVersions } = {}) {
  return Object.freeze({
    schema: catalog.schema,
    schemaVersion: catalog.schemaVersion,
    catalogVersion: catalog.catalogVersion,
    migration: Object.freeze({ fromCatalogVersions: [...catalog.migration.fromCatalogVersions] }),
    providers: Object.freeze(validateTrustedProviderCatalog(catalog, { adapterVersions }))
  });
}
