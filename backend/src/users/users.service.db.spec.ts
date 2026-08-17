import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateUserDto } from '@/auth/dto';
import {
  beginTestTransaction,
  rollbackTestTransaction,
  startTestDatabase,
} from '@/test-utils/test-db';
import { UsersService } from './users.service';

describe('UsersService (db)', () => {
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    prisma = await startTestDatabase();
    usersService = new UsersService(prisma);
  });

  beforeEach(async () => {
    await beginTestTransaction(prisma);
  });

  afterEach(async () => {
    await rollbackTestTransaction(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a user and normalizes email to lowercase', async () => {
    const created = await usersService.createUser({
      email: 'USER@EXAMPLE.COM',
      fullName: 'User One',
      role: 'staff',
      status: 'active',
      password: 'Password123!',
      isTest: false,
    });

    expect(created.email).toBe('user@example.com');
    expect(created.role).toBe('staff');
    expect(created.status).toBe('active');
    expect(created.isTest).toBe(false);

    const dbUser = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    expect(dbUser).toBeTruthy();
    expect(dbUser?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare('Password123!', dbUser!.passwordHash!)).toBe(true);
  });

  it('creates users with explicit test and non-test markers', async () => {
    const testUser = await usersService.createUser({
      email: 'test-marker@example.com',
      fullName: 'Test Marker',
      role: 'staff',
      status: 'active',
      password: 'Password123!',
      isTest: true,
    });
    const realUser = await usersService.createUser({
      email: 'real-marker@example.com',
      fullName: 'Real Marker',
      role: 'staff',
      status: 'active',
      password: 'Password123!',
      isTest: false,
    });

    expect(testUser.isTest).toBe(true);
    expect(realUser.isTest).toBe(false);

    const storedTestUser = await prisma.user.findUniqueOrThrow({ where: { email: 'test-marker@example.com' } });
    const storedRealUser = await prisma.user.findUniqueOrThrow({ where: { email: 'real-marker@example.com' } });
    expect(storedTestUser.isTest).toBe(true);
    expect(storedRealUser.isTest).toBe(false);
  });

  it('rejects missing, empty, and blank creation passwords without creating users', async () => {
    const baseUser = {
      fullName: 'Invalid Password',
      role: 'staff' as const,
      status: 'active' as const,
      isTest: false,
    };

    await expect(
      usersService.createUser({ ...baseUser, email: 'missing-password@example.com' } as unknown as CreateUserDto),
    ).rejects.toThrow(BadRequestException);
    await expect(
      usersService.createUser({ ...baseUser, email: 'empty-password@example.com', password: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      usersService.createUser({ ...baseUser, email: 'blank-password@example.com', password: '        ' }),
    ).rejects.toThrow(BadRequestException);

    await expect(prisma.user.findUnique({ where: { email: 'missing-password@example.com' } })).resolves.toBeNull();
    await expect(prisma.user.findUnique({ where: { email: 'empty-password@example.com' } })).resolves.toBeNull();
    await expect(prisma.user.findUnique({ where: { email: 'blank-password@example.com' } })).resolves.toBeNull();
  });

  it('rejects duplicate user registration without changing the existing test marker', async () => {
    await usersService.createUser({
      email: 'duplicate@example.com',
      fullName: 'Original User',
      role: 'staff',
      status: 'active',
      password: 'Password123!',
      isTest: true,
    });

    await expect(
      usersService.createUser({
        email: 'DUPLICATE@example.com',
        fullName: 'Duplicate User',
        role: 'staff',
        status: 'active',
        password: 'Password123!',
        isTest: false,
      }),
    ).rejects.toThrow(ConflictException);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'duplicate@example.com' } });
    expect(stored.fullName).toBe('Original User');
    expect(stored.isTest).toBe(true);
  });

  it('updates role, status and password hash', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'editor@example.com',
        role: 'STAFF',
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash('OldPassword1!', 10),
      },
    });

    const updated = await usersService.updateUser(user.id, {
      role: 'admin',
      status: 'inactive',
      password: 'NewPassword1!',
    });

    expect(updated.role).toBe('admin');
    expect(updated.status).toBe('inactive');

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare('NewPassword1!', dbUser.passwordHash!)).toBe(true);
  });
});
