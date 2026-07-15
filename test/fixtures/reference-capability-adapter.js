import { createFoundationCapabilityManifests } from "../../src/core/foundation-capabilities.js";
export const manifest = { ...createFoundationCapabilityManifests()[0], inputSchema: { type: "object", additionalProperties: false, required: ["value"], properties: { value: { type: "string" } } }, outputSchema: { type: "object", additionalProperties: false, required: ["adapter", "echo"], properties: { adapter: { type: "string" }, echo: { type: "string" } } } };
export async function invoke(input) { return { adapter: "reference", echo: input.value }; }
