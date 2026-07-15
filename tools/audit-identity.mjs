import path from "node:path";
import { auditProductIdentity } from "../src/core/identity-audit.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const result = auditProductIdentity(root);
console.log(JSON.stringify(result, null, 2));
if (result.status !== "pass") process.exitCode = 1;
