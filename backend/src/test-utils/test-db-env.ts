import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

export const testDatabaseStatePath = path.join(os.tmpdir(), 'shelter-backend-jest-db.json');

export type TestDatabaseState = {
  databaseUrl: string;
  garageEndpoint: string;
  garageAccessKeyId: string;
  garageSecretAccessKey: string;
  garageBucket: string;
  garageRegion: string;
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

export async function ensureTestDatabaseEnv(): Promise<void> {
  const state = readTestDatabaseState()

  process.env.DATABASE_URL ??= state.databaseUrl;
  process.env.S3_ENDPOINT ??= state.garageEndpoint;
  process.env.AWS_ACCESS_KEY_ID ??= state.garageAccessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY ??= state.garageSecretAccessKey;
  process.env.S3_BUCKET ??= state.garageBucket;
  process.env.AWS_REGION ??= state.garageRegion;
}
