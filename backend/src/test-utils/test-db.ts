import { PrismaService } from '@/database/prisma.service';
import { ensureTestDatabaseEnv, getGarageTestConnection, getUnitTestDatabaseUrl } from './test-db-env';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CreateBucketCommand, DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';

export async function startTestDatabase(): Promise<PrismaService> {
  ensureTestDatabaseEnv();

  const prisma = new PrismaService();
  await prisma.$connect();

  return prisma;
}

function getTestDatabase(): PrismaClient {
  const databaseUrl = getUnitTestDatabaseUrl();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl
    }),
    log: ['error', 'warn'],
  });
  return prisma;
}

export function getS3Client() {
  const connection = getGarageTestConnection();
  return new S3Client({
    endpoint: connection.endpoint,
    region: connection.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: connection.accessKey,
      secretAccessKey: connection.secretAccessKey,
    },
  });
}

export async function getTestApplication() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  return app;
}

export async function createBucket(prefix: string, s3Client: S3Client): Promise<string> {
  const bucketName = `${prefix}-${Date.now()}`;
  await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  return bucketName;
}

export async function deleteBucket(bucketName: string, s3Client: S3Client): Promise<void> {
  for (const object of await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }))
    .then(res => res.Contents ?? [])) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: object.Key! }));
  }
  await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

export async function beginTestTransaction(prismaInstance: PrismaClient): Promise<void> {
  await prismaInstance.$executeRawUnsafe('BEGIN');
}

export async function rollbackTestTransaction(prismaInstance: PrismaClient): Promise<void> {
  await prismaInstance.$executeRawUnsafe('ROLLBACK');
}

export async function runInTestTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  const testConnection = getTestDatabase();
  try {
    await testConnection.$transaction(async (tx) => {
      await fn(tx);
      throw new Error('Rollback successful');
    });
  } catch (err) {
    if (!(err instanceof Error && err.message === 'Rollback successful')) {
      throw err;
    }
  } finally {
    await testConnection.$disconnect();
  }
}
