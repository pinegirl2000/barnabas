import { prisma } from './utils/prisma';

/**
 * 일회성 데이터 마이그레이션들을 실행한다.
 * 각 마이그레이션은 멱등성(idempotent)을 보장하므로 중복 실행해도 안전하다.
 */
export async function runMigrations() {
  try {
    await migratePastorVisitOnSession1();
    await migratePastorVisitOnSession2();
  } catch (err) {
    console.error('[Migration] 오류:', err);
  }
}

/**
 * 기존 NEW 가족의 1주차 세션에 pastorVisit = true 설정 (부목사님 면담).
 */
async function migratePastorVisitOnSession1() {
  const result = await prisma.sessionRecord.updateMany({
    where: {
      sessionNumber: 1,
      type: 'EDUCATION',
      pastorVisit: false,
      family: { type: 'NEW' },
    },
    data: { pastorVisit: true },
  });

  if (result.count > 0) {
    console.log(`[Migration] NEW 가족 1주차 pastorVisit 보정: ${result.count}건 업데이트`);
  }
}

/**
 * 기존 NEW 가족의 2주차 세션에 pastorVisit = true 설정.
 * sessionService에서 pastorVisit 기본값 추가 이전에 등록된 가족들의 데이터를 보정한다.
 */
async function migratePastorVisitOnSession2() {
  const result = await prisma.sessionRecord.updateMany({
    where: {
      sessionNumber: 2,
      type: 'EDUCATION',
      pastorVisit: false,
      family: { type: 'NEW' },
    },
    data: { pastorVisit: true },
  });

  if (result.count > 0) {
    console.log(`[Migration] NEW 가족 2주차 pastorVisit 보정: ${result.count}건 업데이트`);
  }
}
