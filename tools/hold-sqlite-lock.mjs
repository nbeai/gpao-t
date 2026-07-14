import { DatabaseSync } from "node:sqlite";

const databasePath = process.argv[2];
const holdMs = Number(process.argv[3] || 80);
if (!databasePath) process.exit(2);
const database = new DatabaseSync(databasePath);
database.exec("BEGIN IMMEDIATE");
process.stdout.write("locked\n");
setTimeout(() => {
  try { database.exec("ROLLBACK"); } catch {}
  try { database.close(); } catch {}
  process.exit(0);
}, Math.max(1, holdMs));
