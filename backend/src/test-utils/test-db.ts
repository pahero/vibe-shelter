import { execSync } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from "testcontainers";
import { PrismaService } from '@/database/prisma.service';

let container: StartedPostgreSqlContainer | null = null;
let containerStartPromise: Promise<StartedPostgreSqlContainer> | null = null;
let migrationPromise: Promise<void> | null = null;
let started = false;

function withSingleConnection(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`;
}

export async function startTestDatabase(): Promise<PrismaService> {
  if (!container) {
    if (!containerStartPromise) {
      containerStartPromise = new PostgreSqlContainer('postgres:18-alpine')
        .withReuse()
        .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
        .withLabels({ 'reuse-id': 'vibe-shelter-test' })
        .start();
    }

    try {
      container = await containerStartPromise;
    } catch (error) {
      containerStartPromise = null;
      throw error;
    }
  }

  const dbUrl = withSingleConnection(container.getConnectionUri());
  process.env.DATABASE_URL = dbUrl;

  if (!started) {
    if (!migrationPromise) {
      migrationPromise = Promise.resolve().then(() => {
        const backendRoot = path.resolve(__dirname, '..', '..');
        execSync('npx prisma migrate deploy', {
          cwd: backendRoot,
          env: {
            ...process.env,
            DATABASE_URL: dbUrl,
          },
          stdio: 'inherit',
        });
        started = true;
      });
    }

    try {
      await migrationPromise;
    } catch (error) {
      migrationPromise = null;
      throw error;
    }
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  return prisma;
}

export async function beginTestTransaction(prismaInstance: PrismaService): Promise<void> {
  await prismaInstance.$executeRawUnsafe('BEGIN');
}

export async function rollbackTestTransaction(prismaInstance: PrismaService): Promise<void> {
  await prismaInstance.$executeRawUnsafe('ROLLBACK');
}