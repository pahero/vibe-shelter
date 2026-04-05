import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create initial admin user
  const adminEmail = 'admin@shelter.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    await prisma.user.delete({ where: { email: adminEmail } });
  }

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);
  console.log('✅ Admin password configured (SEED_ADMIN_PASSWORD or default)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
