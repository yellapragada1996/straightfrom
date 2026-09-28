import { defineConfig } from "drizzle-kit";

// `npm run db:generate` reads the schema and writes SQL migrations to drizzle/.
// Migrations are applied by src/server/db/migrate.ts (same code the tests use).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
