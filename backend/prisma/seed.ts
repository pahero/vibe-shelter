import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create initial admin user
  const adminEmail = 'admin@shelter.local';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
