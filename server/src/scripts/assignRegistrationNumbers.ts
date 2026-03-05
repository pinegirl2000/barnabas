import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignRegistrationNumbers() {
  const families = await prisma.family.findMany({
    where: { registrationNumber: null },
    orderBy: { registeredAt: 'asc' },
  });

  console.log(`Found ${families.length} families without registration numbers`);

  const year = 2026;
  for (let i = 0; i < families.length; i++) {
    const num = String(i + 1).padStart(3, '0');
    const regNumber = `${year}-${num}`;
    await prisma.family.update({
      where: { id: families[i].id },
      data: { registrationNumber: regNumber },
    });
    console.log(`Assigned ${regNumber} to family ${families[i].id}`);
  }

  console.log('Done!');
  await prisma.$disconnect();
}

assignRegistrationNumbers().catch(console.error);
