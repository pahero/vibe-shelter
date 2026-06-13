import { execSync } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { writeTestDatabaseState } from './test-db-env';
import { StartedGarageTestContainer, startGarageTestContainer } from './test-garage';

declare global {
  // eslint-disable-next-line no-var
  var __SHELTER_TEST_DATABASE_CONTAINER__: StartedPostgreSqlContainer | undefined;
  // eslint-disable-next-line no-var
  var __SHELTER_TEST_GARAGE_CONTAINER__: StartedGarageTestContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
    .withLabels({ 'suite': 'shelter-backend-unit-tests' })
    .withReuse()
    .start();

  globalThis.__SHELTER_TEST_DATABASE_CONTAINER__ = container;
  const garage = await startGarageTestContainer();
  globalThis.__SHELTER_TEST_GARAGE_CONTAINER__ = garage;

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.AWS_ENDPOINT_URL_S3 = garage.endpoint;
  process.env.AWS_ACCESS_KEY_ID = garage.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = garage.secretAccessKey;
  process.env.S3_BUCKET = garage.bucket;
  process.env.AWS_REGION = garage.region;
  writeTestDatabaseState({
    databaseUrl,
    garageEndpoint: garage.endpoint,
    garageAccessKeyId: garage.accessKeyId,
    garageSecretAccessKey: garage.secretAccessKey,
    garageBucket: garage.bucket,
    garageRegion: garage.region,
  });

  const backendRoot = path.resolve(__dirname, '..', '..');
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });
}
