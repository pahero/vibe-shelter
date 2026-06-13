import * as fs from 'fs';
import { ensureTestDatabaseEnv, testDatabaseStatePath } from './test-db-env';

describe('test environment state', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads database and garage environment variables', () => {
    ensureTestDatabaseEnv();

    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.S3_ENDPOINT).toBeDefined();
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
    expect(process.env.S3_BUCKET).toBeDefined();
    expect(process.env.AWS_REGION).toBe('garage');
    expect(fs.existsSync(testDatabaseStatePath)).toBe(true);
  });
});
