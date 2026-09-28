import { createDb } from "../src/server/db/client";

/** Integration tests only ever touch a local, throwaway database. Never the dev or prod project. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/straightfrom_test";

export function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Integration tests only run against a local database, not ${host}.`);
  }
}

export function testDb() {
  assertLocal(TEST_DATABASE_URL);
  return createDb(TEST_DATABASE_URL, { max: 2 });
}
