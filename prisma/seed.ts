import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 테이블 설정
  const tableConfigs = [
    { tableNumber: 1, capacity: 4 },
    { tableNumber: 2, capacity: 4 },
    { tableNumber: 3, capacity: 6 },
    { tableNumber: 4, capacity: 6 },
    { tableNumber: 5, capacity: 6 },
    { tableNumber: 6, capacity: 6 },
    { tableNumber: 7, capacity: 10 },
    { tableNumber: 8, capacity: 10 },
  ];

  for (const config of tableConfigs) {
    await prisma.tableConfig.upsert({
      where: { tableNumber: config.tableNumber },
      update: { capacity: config.capacity },
      create: config,
    });
  }
  console.log('테이블 설정 완료 (8개)');

  // 목사 데이터
  const pastors = [
    { name: '담임목사', role: 'SENIOR' as const },
    { name: '부목사', role: 'ASSOCIATE' as const },
  ];

  for (const pastor of pastors) {
    await prisma.pastor.upsert({
      where: { id: pastor.role.toLowerCase() },
      update: { name: pastor.name },
      create: { id: pastor.role.toLowerCase(), ...pastor },
    });
  }
  console.log('목사 데이터 완료');

  // 교구 & 구역 샘플
  const district1 = await prisma.district.upsert({
    where: { id: 'district-1' },
    update: {},
    create: { id: 'district-1', name: '1교구' },
  });

  const district2 = await prisma.district.upsert({
    where: { id: 'district-2' },
    update: {},
    create: { id: 'district-2', name: '2교구' },
  });

  // 1교구 지역 (1-1 ~ 1-5)
  for (let i = 1; i <= 5; i++) {
    await prisma.region.upsert({
      where: { id: `region-1-${i}` },
      update: { name: `1-${i}` },
      create: { id: `region-1-${i}`, districtId: district1.id, name: `1-${i}` },
    });
  }

  // 2교구 지역 (2-1 ~ 2-5)
  for (let i = 1; i <= 5; i++) {
    await prisma.region.upsert({
      where: { id: `region-2-${i}` },
      update: { name: `2-${i}` },
      create: { id: `region-2-${i}`, districtId: district2.id, name: `2-${i}` },
    });
  }
  console.log('교구/지역 샘플 완료');

  // 바나바 샘플
  const volunteers = [
    { name: '바나바1', isInternal: true, availability: 'FIRST' as const, phone: '010-0000-0001' },
    { name: '바나바2', isInternal: true, availability: 'SECOND' as const, phone: '010-0000-0002' },
    { name: '바나바3', isInternal: true, availability: 'BOTH' as const, phone: '010-0000-0003' },
    { name: '바나바4', isInternal: false, availability: 'FIRST' as const, phone: '010-0000-0004' },
  ];

  for (let i = 0; i < volunteers.length; i++) {
    await prisma.volunteer.upsert({
      where: { id: `vol-${i + 1}` },
      update: {},
      create: { id: `vol-${i + 1}`, ...volunteers[i] },
    });
  }
  console.log('바나바 샘플 완료');

  console.log('시드 데이터 완료!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
