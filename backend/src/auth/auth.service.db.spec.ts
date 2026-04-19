import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/database/prisma.service';
import {
  beginTestTransaction,
  rollbackTestTransaction,
  startTestDatabase
} from '@/test-utils/test-db';
import { UsersService } from '@/users/users.service';
import { AuthService } from './auth.service';

class TestConfigService {
  get<T>(key: string, defaultValue?: T): T {
    if (key === 'sessionTtlMs') {
      return 60_000 as T;
    }
    return defaultValue as T;
  }
}

describe('AuthService (db)', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let authService: AuthService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    usersService = new UsersService(prisma);
    authService = new AuthService(prisma, usersService, new TestConfigService() as unknown as ConfigService);
  });

  beforeEach(async () => {
    await beginTestTransaction();
  });

  afterEach(async () => {
    await rollbackTestTransaction();
  });

  it('validates password credentials for active users', async () => {
    const password = 'Password123!';
    await prisma.user.create({
      data: {
        email: 'staff@example.com',
        role: 'STAFF',
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    const user = await authService.validatePasswordCredentials('staff@example.com', password);
    expect(user.email).toBe('staff@example.com');
  });

  it('rejects password login for inactive users', async () => {
    const password = 'Password123!';
    await prisma.user.create({
      data: {
        email: 'inactive@example.com',
        role: 'STAFF',
        status: 'INACTIVE',
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    await expect(authService.validatePasswordCredentials('inactive@example.com', password)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('creates a session and updates last login timestamp', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'session@example.com',
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    const session = await authService.createSession(user.id, 'jest-agent', '127.0.0.1');

    expect(session.id).toBeTruthy();
    expect(session.userAgent).toBe('jest-agent');
    expect(session.ipAddress).toBe('127.0.0.1');

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.lastLoginAt).toBeTruthy();
  });
});