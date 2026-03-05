import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// 디버그: 1주차 세션 날짜 확인용
dashboardRouter.get('/debug-sessions', async (_req: Request, res: Response) => {
  const lastSunday = getLastSunday();
  const lastSundayStr = toLocaleDateStr(lastSunday);

  const allFirst = await prisma.sessionRecord.findMany({
    where: { sessionNumber: 1 },
    include: { family: { include: { members: true } } },
    orderBy: { date: 'desc' },
  });

  res.json({
    serverNow: new Date().toISOString(),
    serverLocalNow: toLocaleDateStr(new Date()),
    lastSundayISO: lastSunday.toISOString(),
    lastSundayStr,
    sessions: allFirst.map(s => ({
      familyId: s.familyId,
      familyName: s.family.members?.map((m: any) => m.name).join(', '),
      dateISO: s.date?.toISOString() ?? null,
      dateLocal: s.date ? toLocaleDateStr(new Date(s.date)) : null,
      matches: s.date ? toLocaleDateStr(new Date(s.date)) === lastSundayStr : false,
      completed: s.completed,
    })),
  });
});

dashboardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // 전체 활동중 가족 수
    const activeFamilies = await prisma.family.count({
      where: { status: 'ACTIVE' },
    });

    // 보류 가족 수
    const onHoldFamilies = await prisma.family.count({
      where: { status: 'ON_HOLD' },
    });

    // 수료 가족 수 (이번 달)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedThisMonth = await prisma.family.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: startOfMonth },
      },
    });

    // 이번 주 배정 현황
    const monday = getMonday(new Date());
    const weeklyAssignments = await prisma.assignment.count({
      where: { weekStart: monday },
    });

    // 바나바 변경 필요 가족 (변경요청 또는 미배정)
    const needsNewVolunteer = await prisma.sessionRecord.findMany({
      where: {
        family: { status: 'ACTIVE' },
        OR: [
          { needsNewVolunteer: true },
          { volunteerId: null },
        ],
      },
      include: {
        family: { include: { members: true } },
        volunteer: true,
      },
      orderBy: [{ family: { registeredAt: 'desc' } }, { sessionNumber: 'asc' }],
    });

    // 이번주 바나바 일정 — 이번주 일요일에 예정된 다음 활성 세션
    const thisSunday = getNextSunday();
    const thisSundayStr = toLocaleDateStr(thisSunday);

    const activeFamiliesWithSessions = await prisma.family.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: true,
        sessions: {
          orderBy: { sessionNumber: 'asc' },
          include: { volunteer: true },
        },
      },
    });

    const weeklyVolunteerSchedule = activeFamiliesWithSessions
      .map(family => {
        const sessions = family.sessions;
        const nextIdx = sessions.findIndex(s => {
          if (s.completed) return false;
          if (s.sessionNumber === 1) return true;
          const prev = sessions.find(p => p.sessionNumber === s.sessionNumber - 1);
          return prev?.completed;
        });
        if (nextIdx === -1) return null;
        const nextSession = sessions[nextIdx];

        // 예정날짜 계산
        let projectedDate: string;
        if (nextSession.date) {
          projectedDate = toLocaleDateStr(new Date(nextSession.date));
        } else {
          let baseDate: Date | null = null;
          let weeksToAdd = 0;
          for (let i = nextIdx - 1; i >= 0; i--) {
            if (sessions[i].date) {
              baseDate = new Date(sessions[i].date!);
              for (let j = i + 1; j <= nextIdx; j++) {
                const is4Week = family.type === 'RE_REGISTER'
                  ? sessions[j].sessionNumber >= 3
                  : sessions[j].sessionNumber >= 7;
                weeksToAdd += is4Week ? 4 : 1;
              }
              break;
            }
          }
          if (!baseDate) {
            baseDate = new Date(family.registeredAt);
            const day = baseDate.getDay();
            if (day !== 0) baseDate.setDate(baseDate.getDate() + (7 - day));
            for (let j = 1; j <= nextIdx; j++) {
              const is4Week = family.type === 'RE_REGISTER'
                ? sessions[j].sessionNumber >= 3
                : sessions[j].sessionNumber >= 7;
              weeksToAdd += is4Week ? 4 : 1;
            }
          }
          const projected = new Date(baseDate!.getTime() + weeksToAdd * 7 * 24 * 60 * 60 * 1000);
          projectedDate = toLocaleDateStr(projected);
        }

        // 이번주 일요일 또는 그 이전(밀린 일정)인 세션 포함
        if (projectedDate > thisSundayStr) return null;

        const totalSessions = sessions.length;
        const completedCount = sessions.filter(s => s.completed).length;

        // 담임목사님 면담 완료 여부 확인 (sessionNumber >= 2에서 pastorVisit=true 완료된 세션)
        const pastorVisitDone = sessions.some(s =>
          s.completed && (s as any).pastorVisit && s.sessionNumber >= 2
        );
        // 아직 면담 안 됐고, 다음 세션이 2주차 이상이면 면담 필요
        const needsPastorVisit = !pastorVisitDone && nextSession.sessionNumber >= 2;

        // 수료예정: NEW는 6주차, RE_REGISTER는 2주차가 다음 세션일 때
        const gradSession = family.type === 'NEW' ? 6 : 2;
        const isGraduating = nextSession.sessionNumber === gradSession;

        const { sessions: _, ...familyInfo } = family;
        return {
          sessionId: nextSession.id,
          sessionNumber: nextSession.sessionNumber,
          sessionType: nextSession.type,
          pastorVisit: (nextSession as any).pastorVisit,
          needsPastorVisit,
          isGraduating,
          volunteer: nextSession.volunteer,
          volunteerId: nextSession.volunteerId,
          projectedDate,
          totalSessions,
          completedCount,
          family: familyInfo,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.sessionNumber || 0) - (b.sessionNumber || 0));

    // 지난주 등록: 1주차 완료일이 최근 7일 이내인 가족
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentFirstSessions = await prisma.sessionRecord.findMany({
      where: {
        sessionNumber: 1,
        date: { gte: sevenDaysAgo },
      },
      include: {
        family: { include: { members: true } },
      },
      orderBy: { date: 'desc' },
    });

    const recentFamilies = recentFirstSessions.map(s => ({
      ...s.family,
      firstSessionDate: s.date,
    }));

    res.json({
      stats: {
        activeFamilies,
        onHoldFamilies,
        completedThisMonth,
        weeklyAssignments,
      },
      graduationCandidates: (weeklyVolunteerSchedule as any[]).filter((s: any) => s.isGraduating).map((s: any) => ({
        ...s.family,
        projectedDate: s.projectedDate,
      })),
      needsNewVolunteer,
      weeklyVolunteerSchedule,
      thisSundayStr,
      recentFamilies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '대시보드 데이터 조회 실패' });
  }
});

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 로컬 날짜를 YYYY-MM-DD 문자열로 변환 */
function toLocaleDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 오늘을 제외한 가장 최근 일요일 (오늘이 일요일이면 지난주 일요일) */
function getLastSunday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysBack = day === 0 ? 7 : day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - daysBack);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/** 다가올 일요일 (오늘이 일요일이면 오늘) */
function getNextSunday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}
