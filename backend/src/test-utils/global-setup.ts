import { exec } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { writeTestDatabaseState } from './test-db-env';
import { startGarageTestContainer } from './test-garage';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup(): Promise<void> {
  const containerPromise = new PostgreSqlContainer('postgres:18-alpine')
    .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
    .withLabels({ 'suite': 'shelter-backend-unit-tests' })
    .withReuse()
    .start();
  const garagePromise = startGarageTestContainer();

  const container = await containerPromise;
  const garage = await garagePromise;
  const unitTestsDatabaseUrl = container.getConnectionUri();
  const integrationTestsDatabaseUrl = unitTestsDatabaseUrl.replace(/\/([^\/]+)$/, '/integration-tests');
  process.env.DATABASE_URL = unitTestsDatabaseUrl;
  process.env.AWS_ENDPOINT_URL_S3 = garage.endpoint;
  process.env.AWS_ACCESS_KEY_ID = garage.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = garage.secretAccessKey;
  process.env.S3_BUCKET = garage.bucket;
  process.env.AWS_REGION = garage.region;
  writeTestDatabaseState({
    unitTestsDatabaseUrl,
    integrationTestsDatabaseUrl: integrationTestsDatabaseUrl,
    garageEndpoint: garage.endpoint,
    garageAccessKeyId: garage.accessKeyId,
    garageSecretAccessKey: garage.secretAccessKey,
    garageBucket: garage.bucket,
    garageRegion: garage.region,
  });

  const backendRoot = path.resolve(__dirname, '..', '..');
  const promiseA = execAsync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: unitTestsDatabaseUrl,
    },
  });
  const promiseB = execAsync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: integrationTestsDatabaseUrl,
    },
  });
  await Promise.all([promiseA, promiseB]);
}
