import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/database/prisma.service';
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
    await beginTestTransaction();
  });

  afterEach(async () => {
    await rollbackTestTransaction();
  });

  it('creates a user and normalizes email to lowercase', async () => {
    const created = await usersService.createUser({
      email: 'USER@EXAMPLE.COM',
      fullName: 'User One',
      role: 'staff',
      status: 'active',
      password: 'Password123!',
    });

    expect(created.email).toBe('user@example.com');
    expect(created.role).toBe('staff');
    expect(created.status).toBe('active');

    const dbUser = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    expect(dbUser).toBeTruthy();
    expect(dbUser?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare('Password123!', dbUser!.passwordHash!)).toBe(true);
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