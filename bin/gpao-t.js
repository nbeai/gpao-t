#!/usr/bin/env node

const [, , command, subcommand, ...args] = process.argv;

if (command === "memory") {
  await handleMemoryCommand(subcommand, args);
} else {
  await import("./gpao-t-full.js");
}

async function handleMemoryCommand(subcommand, args) {
  const [
    { captureMemoryEntry, readMemoryWiki },
    { buildMemorySearchIndex, getMemorySearchStatus, readMemorySearchIndex, searchMemory },
    { buildMemoryContextHeart, verifyMemoryContextHeart },
  ] = await Promise.all([
    import("../src/core/memory-wiki.js"),
    import("../src/core/memory-search.js"),
    import("../src/core/memory-context-heart.js"),
  ]);

  if (subcommand === "capture") {
    const [title, ...bodyParts] = args;
    if (!title || !bodyParts.length) {
      throw new Error("memory capture requires title and body");
    }
    printJson(captureMemoryEntry({ title, body: bodyParts.join(" ") }));
    return;
  }
  if (subcommand === "list") {
    printJson(readMemoryWiki());
    return;
  }
  if (subcommand === "status") {
    printJson(getMemorySearchStatus());
    return;
  }
  if (subcommand === "index") {
    const index = buildMemorySearchIndex();
    printJson({
      schema: "gpao_t.memory_search_index_summary.v0_1",
      status: index.status,
      generatedAt: index.generatedAt,
      runtimeRoot: index.runtimeRoot,
      documents: index.counts.documents,
      sources: index.counts.sources,
      engine: index.engine,
      nextAction: "run gpao-t memory search <text>",
    });
    return;
  }
  if (subcommand === "index-info") {
    printJson(readMemorySearchIndex());
    return;
  }
  if (subcommand === "search") {
    const query = args.join(" ").trim();
    if (!query) {
      throw new Error("memory search requires query text");
    }
    printJson(searchMemory({ query }));
    return;
  }
  if (subcommand === "heart") {
    printJson(buildMemoryContextHeart());
    return;
  }
  if (subcommand === "heart-check") {
    const heart = buildMemoryContextHeart();
    printJson(verifyMemoryContextHeart({ heart }));
    return;
  }

  throw new Error("memory command requires capture, list, status, index, index-info, search, heart, or heart-check");
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
