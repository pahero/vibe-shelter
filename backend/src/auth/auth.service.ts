import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '@/users/users.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async validateGoogleProfile(profile: any) {
    const email = profile.emails?.[0]?.value;
    const allowedDomain = this.configService.get<string>('allowedGoogleDomain');

    if (!email) {
      throw new BadRequestException('No email from Google profile');
    }

    // Optional: check if email is from allowed domain
    if (allowedDomain) {
      const emailDomain = email.split('@')[1];
      if (emailDomain !== allowedDomain) {
        throw new UnauthorizedException('Email domain not allowed');
      }
    }

    // Find user by email
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found. Please contact administrator to create account.');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  async validatePasswordCredentials(email: string, password: string) {
    const user = (await this.usersService.findByEmail(email)) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password login is not enabled for this account');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async createSession(userId: string, userAgent?: string, ipAddress?: string) {
    const sessionTokenHash = this.hashSessionToken(crypto.randomBytes(32).toString('hex'));
    const ttlMs = this.configService.get<number>('sessionTtlMs', 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        sessionTokenHash,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    // Update last login
    await this.usersService.updateLastLogin(userId);

    return session;
  }

  async validateSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive');
    }

    return session;
  }

  async revokeSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result;
  }

  private hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
