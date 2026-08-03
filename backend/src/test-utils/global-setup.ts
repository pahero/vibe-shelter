import { exec } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { writeTestDatabaseState } from './test-db-env';
import { startGarageTestContainer } from './test-garage';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
    .withLabels({ 'suite': 'shelter-backend-unit-tests' })
    .withReuse()
    .start();
  const garage = await startGarageTestContainer();

  const databaseAUrl = container.getConnectionUri();
  // Ends with /{databaseName}, we need to replace it with /integration_tests for the second database
  const databaseBUrl = databaseAUrl.replace(/\/[^\/]+$/, '/integration_tests'); 
  process.env.DATABASE_URL = databaseAUrl;
  process.env.AWS_ENDPOINT_URL_S3 = garage.endpoint;
  process.env.AWS_ACCESS_KEY_ID = garage.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = garage.secretAccessKey;
  process.env.S3_BUCKET = garage.bucket;
  process.env.AWS_REGION = garage.region;
  writeTestDatabaseState({
    databaseUrl: databaseAUrl,
    garageEndpoint: garage.endpoint,
    garageAccessKeyId: garage.accessKeyId,
    garageSecretAccessKey: garage.secretAccessKey,
    garageBucket: garage.bucket,
    garageRegion: garage.region,
  });

  const backendRoot = path.resolve(__dirname, '..', '..');
  const procA = execAsync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseAUrl,
    }
  });
  const procB = execAsync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseBUrl,
    }
  });
  await Promise.all([procA, procB]);
}
