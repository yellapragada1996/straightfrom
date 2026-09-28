import postgres from "postgres";
import { runMigrations } from "../src/server/db/migrate";
import { assertLocal, TEST_DATABASE_URL } from "./db";

/** Rebuilds the local test database from the migrations before the integration tests run. */
export default async function setup() {
  assertLocal(TEST_DATABASE_URL);
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = "/postgres";
  const sql = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(`drop database if exists "${name}" with (force)`);
    await sql.unsafe(`create database "${name}"`);
  } finally {
    await sql.end();
  }
  await runMigrations(TEST_DATABASE_URL);
}
