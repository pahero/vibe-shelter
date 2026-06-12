import { PrismaService } from '@/database/prisma.service';
import { ensureTestDatabaseEnv } from './test-db-env';

export async function startTestDatabase(): Promise<PrismaService> {
  ensureTestDatabaseEnv();

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
