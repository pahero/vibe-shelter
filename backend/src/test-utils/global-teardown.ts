import { deleteTestDatabaseState } from './test-db-env';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __SHELTER_TEST_DATABASE_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  try {
    await globalThis.__SHELTER_TEST_DATABASE_CONTAINER__?.stop();
  } finally {
    deleteTestDatabaseState();
  }
}
