import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ValidatePasswordCredentialsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), deletedAt: null } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('User account is inactive');
    if (!user.passwordHash) throw new UnauthorizedException('Password login is not enabled for this account');
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return user;
  }
}
