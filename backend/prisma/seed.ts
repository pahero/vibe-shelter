import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log('Starting database seed...');

  // Create initial admin user
  const adminEmail = 'admin@shelter.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
      isTest: false,
    },
    create: {
      email: adminEmail,
      fullName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
      isTest: false,
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
