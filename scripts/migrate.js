/**
 * Production migration script (plain JS — no tsx needed).
 * Runs at container startup to apply any pending migrations.
 */
const { createClient } = require("@libsql/client");
const { drizzle } = require("drizzle-orm/libsql");
const { migrate } = require("drizzle-orm/libsql/migrator");
const path = require("path");

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
