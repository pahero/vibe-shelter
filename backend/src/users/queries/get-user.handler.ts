import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toUserResponse } from '../user-response.mapper';

@Injectable()
export class GetUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    return toUserResponse(user);
  }
}
