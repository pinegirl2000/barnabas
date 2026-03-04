import { prisma } from '../utils/prisma';
import { FamilyType, SessionType } from '@prisma/client';

/**
 * 가장 최근 지난 주일(일요일) 날짜를 구한다.
 * 오늘이 일요일이면 오늘을 반환.
 */
function getMostRecentSunday(): Date {
  const today = new Date();
  const day = today.getDay(); // 0=일, 1=월 ...
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  // UTC 정오로 저장하여 어떤 타임존에서도 같은 날짜로 표시
  sunday.setUTCHours(12, 0, 0, 0);
  return sunday;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 새가족 등록 시 세션 레코드를 자동 생성
 * - 신규(NEW): 8회 (교육 6회 + 연락심방 2회)
 *   1~6주: 주간 간격 (최근 주일부터)
 *   7~8주: 월간 간격
 * - 재등록(RE_REGISTER): 4회 (목사면담 2회 + 연락심방 2회)
 *   1~2주: 주간 간격 (최근 주일, 다음 주일)
 *   3~4주: 월간 간격
 */
export async function createSessionsForFamily(familyId: string, type: FamilyType) {
  const sessions: any[] = [];
  const baseSunday = getMostRecentSunday();

  if (type === 'NEW') {
    // 신규: 교육 6회 + 연락심방 2회 = 8회
    // 1~6주: 주간 간격
    for (let i = 1; i <= 6; i++) {
      sessions.push({
        familyId,
        sessionNumber: i,
        type: 'EDUCATION' as SessionType,
        date: addWeeks(baseSunday, i - 1),
        ...((i === 1 || i === 2) && { pastorVisit: true }),
      });
    }
    // 7~8주: 월간 간격 (6주차 기준으로 +1개월, +2개월)
    const week6Date = addWeeks(baseSunday, 5);
    sessions.push({
      familyId,
      sessionNumber: 7,
      type: 'PHONE_VISIT' as SessionType,
      date: addMonths(week6Date, 1),
    });
    sessions.push({
      familyId,
      sessionNumber: 8,
      type: 'PHONE_VISIT' as SessionType,
      date: addMonths(week6Date, 2),
    });
  } else {
    // 재등록: 목사면담 2회 + 연락심방 2회 = 4회
    // 1주: 최근 주일 (부목사 면담)
    sessions.push({
      familyId,
      sessionNumber: 1,
      type: 'PASTOR_VISIT' as SessionType,
      date: baseSunday,
    });
    // 2주: 다음 주일 (담임목사 면담)
    const week2Date = addWeeks(baseSunday, 1);
    sessions.push({
      familyId,
      sessionNumber: 2,
      type: 'PASTOR_VISIT' as SessionType,
      date: week2Date,
    });
    // 3~4주: 월간 간격
    sessions.push({
      familyId,
      sessionNumber: 3,
      type: 'PHONE_VISIT' as SessionType,
      date: addMonths(week2Date, 1),
    });
    sessions.push({
      familyId,
      sessionNumber: 4,
      type: 'PHONE_VISIT' as SessionType,
      date: addMonths(week2Date, 2),
    });
  }

  await prisma.sessionRecord.createMany({ data: sessions });
}

/**
 * 수료 여부 확인 (6번째 세션 완료 기준)
 */
export async function checkGraduation(familyId: string): Promise<boolean> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { sessions: true },
  });

  if (!family) return false;

  if (family.type === 'NEW') {
    // 신규: 6번째 교육 세션 완료 시 수료
    const session6 = family.sessions.find(s => s.sessionNumber === 6);
    return session6?.completed || false;
  } else {
    // 재등록: 2번째 세션 완료 시 수료
    const session2 = family.sessions.find(s => s.sessionNumber === 2);
    return session2?.completed || false;
  }
}
