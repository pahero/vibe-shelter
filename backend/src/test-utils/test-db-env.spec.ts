import * as fs from 'fs';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
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
    expect(process.env.AWS_ENDPOINT_URL_S3).toBeDefined();
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
    expect(process.env.S3_BUCKET).toBeDefined();
    expect(process.env.AWS_REGION).toBe('garage');
    expect(fs.existsSync(testDatabaseStatePath)).toBe(true);
  });

  it('connects to garage S3 with loaded environment variables', async () => {
    ensureTestDatabaseEnv();

    const client = new S3Client({});

    const result = await client.send(new ListBucketsCommand({}));

    expect(result.Buckets?.some((bucket) => bucket.Name === process.env.S3_BUCKET)).toBe(true);
  });
});
