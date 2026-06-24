import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./data.db",
});

const db = drizzle(client);

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
