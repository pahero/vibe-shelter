import { execSync } from 'child_process';
import * as path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Wait } from "testcontainers";
import { PrismaService } from '@/database/prisma.service';

let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaService | null = null;
let started = false;

function withSingleConnection(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`;
}

export async function startTestDatabase(): Promise<PrismaService> {
  if (prisma) {
    return prisma;
  }

  if (!container) {
    let containerWaiter = new PostgreSqlContainer('postgres:18-alpine')
      .withReuse()
      .withWaitStrategy(Wait.forAll([Wait.forHealthCheck()]))
      .withLabels({ 'reuse-id': 'vibe-shelter-test' })
      .start();
    container = await containerWaiter;
  }

  const dbUrl = withSingleConnection(container.getConnectionUri());
  process.env.DATABASE_URL = dbUrl;

  if (!started) {
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
  }

  prisma = new PrismaService();
  await prisma.$connect();

  return prisma;
}

export async function beginTestTransaction(): Promise<void> {
  if (!prisma) {
    throw new Error('Test database is not started');
  }

  await prisma.$executeRawUnsafe('BEGIN');
}

export async function rollbackTestTransaction(): Promise<void> {
  if (!prisma) {
    throw new Error('Test database is not started');
  }

  await prisma.$executeRawUnsafe('ROLLBACK');
}