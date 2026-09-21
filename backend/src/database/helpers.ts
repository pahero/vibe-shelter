import { Prisma, PrismaClient } from '@prisma/client';

export function runInNewTransaction<T>(
    prisma: PrismaClient | Prisma.TransactionClient,
    callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if (prisma instanceof PrismaClient) {
        return prisma.$transaction(callback);
    } else {
        return callback(prisma);
    }
}