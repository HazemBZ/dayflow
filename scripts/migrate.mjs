/**
 * Production migration script (ESM — no tsx needed).
 * Runs at container startup to apply any pending migrations.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = createClient({
  url: process.env.DATABASE_URL || "file:./data.db",
});

const db = drizzle(client);

async function main() {
  console.log("Running migrations...");
  const migrationsFolder = path.resolve(__dirname, "..", "drizzle");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
