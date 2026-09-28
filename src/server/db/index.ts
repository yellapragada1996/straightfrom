import "server-only";
import { createDb, type Db } from "./client";

// The app's database client (server code only). Created on first use so builds
// and pages that don't touch the database never need DATABASE_URL.

let instance: Db | null = null;

export function getDb(): Db {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  instance = createDb(url).db;
  return instance;
}
