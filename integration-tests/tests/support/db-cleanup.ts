import { Pool } from "pg";
import { ADMIN_TEST_ACCOUNT, STAFF_TEST_ACCOUNT } from "./env";

export const TEST_DATA_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://shelter_user:shelter_password@localhost:5435/shelter";

export async function cleanupTestData(): Promise<void> {
  const pool = new Pool({
    connectionString: TEST_DATA_DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await pool.query('DELETE FROM "Cat" WHERE "isTest" = true;');
    await pool.query('DELETE FROM "Location" WHERE "isTest" = true;');
    // Keep the persistent fixed test-user fixtures; purge the rest (users
    // registered ad hoc by UI specs and leftovers of old runs) so lists stay
    // small and first-page assertions stay deterministic.
    await pool.query('DELETE FROM "User" WHERE "isTest" = true AND email NOT IN ($1, $2);', [
      STAFF_TEST_ACCOUNT.email,
      ADMIN_TEST_ACCOUNT.email,
    ]);
    console.log(
      "Test data cleanup: removed isTest cats, locations and e2e test users",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Test data cleanup skipped (${message}). Is the database reachable?`);
  } finally {
    await pool.end();
  }
}