import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * A Drizzle client for a connection URL.
 * `prepare: false` is required for Supabase's transaction pooler (DATABASE_URL, port 6543).
 */
export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { prepare: false, max: options.max ?? 5, onnotice: () => {} });
  return { db: drizzle(sql, { schema, casing: "snake_case" }), sql };
}

export type Db = ReturnType<typeof createDb>["db"];
