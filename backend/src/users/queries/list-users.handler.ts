import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toUserResponse } from '../user-response.mapper';

@Injectable()
export class ListUsersHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(filters: { status?: string; role?: string; isTest?: boolean }): Promise<ReturnType<typeof toUserResponse>[]> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filters.isTest !== undefined) where.isTest = filters.isTest;
    if (filters.status) {
      const status = filters.status.toUpperCase();
      if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new BadRequestException('Invalid user status');
      where.status = status as UserStatus;
    }
    if (filters.role) {
      const role = filters.role.toUpperCase();
      if (role !== 'ADMIN' && role !== 'STAFF') throw new BadRequestException('Invalid user role');
      where.role = role as UserRole;
    }
    const users = await this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
    return users.map(toUserResponse);
  }
}
