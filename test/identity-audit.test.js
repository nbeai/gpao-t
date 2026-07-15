import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { auditProductIdentity } from "../src/core/identity-audit.js";
import { PRODUCT_IDENTITY } from "../src/core/product-identity.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);

test("GPAO-T3 active product identity is sealed across source, UI, package, and lifecycle tools", () => {
  const audit = auditProductIdentity(root);
  assert.equal(audit.schema, "gpao_t3.identity_audit.v1");
  assert.equal(audit.status, "pass", JSON.stringify(audit.violations));
  assert.ok(audit.filesScanned >= 40);
  assert.equal(PRODUCT_IDENTITY.productId, "gpao-t3");
  assert.equal(PRODUCT_IDENTITY.databaseFile, "gpao-t3.sqlite");
  assert.equal(PRODUCT_IDENTITY.serviceName, "ai.nbeai.gpao-t3.runtime");
  assert.equal(PRODUCT_IDENTITY.processTitle, "gpao-t3-runtime");
});
