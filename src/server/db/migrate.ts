import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";

/** Applies every migration in drizzle/ that hasn't run yet. Used by `npm run db:migrate` and the test setup. */
export async function runMigrations(url: string) {
  const { db, sql } = createDb(url, { max: 1 });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await sql.end();
  }
}

// CLI: npm run db:migrate (uses the direct/session connection, as migrations should)
if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    console.error("DATABASE_URL_DIRECT is not set.");
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log("Migrations applied."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
