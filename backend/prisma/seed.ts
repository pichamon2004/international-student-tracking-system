import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ist.local' },
    update: {},
    create: {
      email: 'admin@ist.local',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  const staffPassword = await bcrypt.hash('staff1234', 10);
  await prisma.user.upsert({
    where: { email: 'staff@ist.local' },
    update: {},
    create: {
      email: 'staff@ist.local',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
    },
  });

  console.log('Seed completed. Default accounts:');
  console.log('  Admin: admin@ist.local / admin1234');
  console.log('  Staff: staff@ist.local / staff1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
