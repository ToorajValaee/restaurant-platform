import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidateDirs = [
  path.resolve(here, "migrations"),
  path.resolve(process.cwd(), "src/db/migrations")
];

let migrationsDir = "";
for (const dir of candidateDirs) {
  try {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      migrationsDir = dir;
      break;
    }
  } catch {}
}

if (!migrationsDir) throw new Error("Migrations directory not found");

await pool.query(`
  CREATE TABLE IF NOT EXISTS _app_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const files = (await fs.readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const name of files) {
  const done = await pool.query(
    "SELECT 1 FROM _app_migrations WHERE name = $1 LIMIT 1",
    [name]
  );
  if (done.rowCount) continue;

  const sql = await fs.readFile(path.join(migrationsDir, name), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _app_migrations(name) VALUES ($1)", [name]);
    await client.query("COMMIT");
    console.log(`Applied migration: ${name}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

console.log("Database migrations completed");
await pool.end();
