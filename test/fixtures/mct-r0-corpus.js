export const MCT_R0_CORPUS_SEED = "gpao-t3-mct-r0-2026-07-16";
export const MCT_R0_CORPUS_GENERATOR = "deterministic-mixed-memory-v1";

const languageBands = Object.freeze([
  [5500, "korean"],
  [7500, "english"],
  [9000, "code"],
  [10000, "mixed"]
]);

function languageFor(index) {
  return languageBands.find(([limit]) => index < limit)[1];
}

function splitFor(index) {
  if (index < 6000) return "development";
  if (index < 8000) return "evaluation";
  return "holdout";
}

function contentFor(index, language, ordinal) {
  const prefix = [MCT_R0_CORPUS_SEED, language, `record-${ordinal}`, `topic-${String(index % 257).padStart(3, "0")}`];
  const words = Array.from({ length: 176 }, (_, offset) => {
    const value = String((index * 181 + offset) % 4093).padStart(4, "0");
    if (language === "korean") return `기억${value}`;
    if (language === "code") return `symbol_${value}`;
    if (language === "mixed") return offset % 2 === 0 ? `맥락${value}` : `context_${value}`;
    return `context_${value}`;
  });
  return [...prefix, ...words].join(" ");
}

export function createMctR0Corpus() {
  return Array.from({ length: 10000 }, (_, index) => {
    const ordinal = String(index + 1).padStart(5, "0");
    const language = languageFor(index);
    return {
      id: `mct-r0-${ordinal}`,
      split: splitFor(index),
      language,
      scope: ["turn", "session", "project", "user_global"][index % 4],
      kind: ["fact", "preference", "constraint", "correction", "principle"][index % 5],
      contradictionGroup: index % 17 === 0 ? `conflict-${String(index % 101).padStart(3, "0")}` : null,
      content: contentFor(index, language, ordinal)
    };
  });
}
