import { execSync } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { writeTestDatabaseState } from './test-db-env';

declare global {
  // eslint-disable-next-line no-var
  var __SHELTER_TEST_DATABASE_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
    .withLabels({ 'suite': 'shelter-backend-unit-tests' })
    .start();

  globalThis.__SHELTER_TEST_DATABASE_CONTAINER__ = container;

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  writeTestDatabaseState({ databaseUrl });

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
