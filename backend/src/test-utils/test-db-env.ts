import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const testDatabaseStatePath = path.join(os.tmpdir(), 'shelter-backend-jest-db.json');

export type TestDatabaseState = {
  databaseUrl: string;
};

export function writeTestDatabaseState(state: TestDatabaseState): void {
  fs.writeFileSync(testDatabaseStatePath, JSON.stringify(state), 'utf8');
}

export function readTestDatabaseState(): TestDatabaseState {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  return JSON.parse(raw) as TestDatabaseState;
}

export function deleteTestDatabaseState(): void {
  if (fs.existsSync(testDatabaseStatePath)) {
    fs.unlinkSync(testDatabaseStatePath);
  }
}

export function ensureTestDatabaseEnv(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  process.env.DATABASE_URL = readTestDatabaseState().databaseUrl;
}
