import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type TestS3Connection = {
  endpoint: string;
  region: string;
  accessKey: string;
  secretAccessKey: string;
}

export const testDatabaseStatePath = path.join(os.tmpdir(), 'shelter-backend-jest-db.json');

export type TestDatabaseState = {
  unitTestsDatabaseUrl: string;
  integrationTestsDatabaseUrl: string;
  garageEndpoint: string;
  garageAccessKeyId: string;
  garageSecretAccessKey: string;
  garageBucket: string;
  garageRegion: string;
};

export function writeTestDatabaseState(state: TestDatabaseState): void {
  fs.writeFileSync(testDatabaseStatePath, JSON.stringify(state), 'utf8');
}

export function ensureTestDatabaseEnv(): void {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  const state = JSON.parse(raw) as TestDatabaseState;

  process.env.DATABASE_URL ??= state.unitTestsDatabaseUrl;
  process.env.AWS_ENDPOINT_URL_S3 ??= state.garageEndpoint;
  process.env.AWS_ACCESS_KEY_ID ??= state.garageAccessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY ??= state.garageSecretAccessKey;
  process.env.S3_BUCKET ??= state.garageBucket;
  process.env.AWS_REGION ??= state.garageRegion;
  process.env.S3_FORCE_PATH_STYLE = 'true';
}

export function getUnitTestDatabaseUrl() {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  const state = JSON.parse(raw) as TestDatabaseState;
  return state.unitTestsDatabaseUrl;
}

export function getIntegrationTestDatabaseUrl() {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  const state = JSON.parse(raw) as TestDatabaseState;
  return state.integrationTestsDatabaseUrl;
}

export function getIntegrationTestS3Bucket() {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  const state = JSON.parse(raw) as TestDatabaseState;
  return state.garageBucket;
}

export function getGarageTestConnection(): TestS3Connection {
  const raw = fs.readFileSync(testDatabaseStatePath, 'utf8');
  const state = JSON.parse(raw) as TestDatabaseState;
  return {
    endpoint: state.garageEndpoint,
    region: state.garageRegion,
    accessKey: state.garageAccessKeyId,
    secretAccessKey: state.garageSecretAccessKey,
  };
}