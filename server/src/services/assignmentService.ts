import { prisma } from '../utils/prisma';

interface AutoAssignResult {
  assignments: any[];
  warnings: string[];
}

/** 로컬 날짜를 YYYY-MM-DD 문자열로 변환 */
function toLocaleDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 가족의 다음 활성 세션과 예정일 계산 */
function getNextSessionInfo(family: any) {
  const sessions = family.sessions || [];
  const nextIdx = sessions.findIndex((s: any) => {
    if (s.completed) return false;
    if (s.sessionNumber === 1) return true;
    const prev = sessions.find((p: any) => p.sessionNumber === s.sessionNumber - 1);
    return prev?.completed;
  });
  if (nextIdx === -1) return null;

  const nextSession = sessions[nextIdx];

  // 교육 범위 체크: 신규 1-6주차, 재등록 1-2주차
  const maxSession = family.type === 'RE_REGISTER' ? 2 : 6;
  if (nextSession.sessionNumber > maxSession) return null;

  // 예정일 계산 (대시보드 로직과 동일)
  let projectedDate: string;
  if (nextSession.date) {
    projectedDate = toLocaleDateStr(new Date(nextSession.date));
  } else {
    let baseDate: Date | null = null;
    let weeksToAdd = 0;
    for (let i = nextIdx - 1; i >= 0; i--) {
      if (sessions[i].date) {
        baseDate = new Date(sessions[i].date);
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

  return { nextSession, projectedDate };
}

/** 새가족 참석 인원수 */
function getFamilyAttendeeCount(family: any): number {
  return (family.members || []).filter((m: any) => m.attending).length;
}

/**
 * 테이블 수용 인원 계산:
 * - 새가족 참석수 + 바나바 1명
 * - 1주차: + 부목사님 1명
 * - 담임목사님 면담 예정: + 담임목사님 1명
 */
function getTotalSeatCount(family: any, category: 'pastor_visit' | 'first_week' | 'normal'): number {
  const familyCount = getFamilyAttendeeCount(family);
  const barnaba = 1; // 바나바
  const extra = category === 'first_week' ? 1     // 부목사님
              : category === 'pastor_visit' ? 1    // 담임목사님
              : 0;
  return familyCount + barnaba + extra;
}

/**
 * 테이블 배정 규칙:
 * - 1부/2부 분리 배정
 * - 담임목사님 면담 → 테이블3 우선, 그다음 테이블2 (인원수 고려)
 * - 1주차 → 새가족실 안쪽(테이블1,2,3) 우선 배정 (인원수 고려)
 * - 일반 → 인원수 고려하여 여유있는 테이블에 배정
 * - 테이블 1,2: 용량 5명 / 테이블 3~8: 용량 7명
 */
export async function autoAssign(weekStart: Date): Promise<AutoAssignResult> {
  const warnings: string[] = [];
  const targetSunday = toLocaleDateStr(weekStart);

  // Range query to handle timezone differences
  const rangeStart = new Date(weekStart.getTime() - 18 * 60 * 60 * 1000);
  const rangeEnd = new Date(weekStart.getTime() + 18 * 60 * 60 * 1000);
  const weekRange = { gte: rangeStart, lt: rangeEnd };

  // 기존 배정 중 해당 주에 맞지 않는 가족 정리
  const existingAssignments = await prisma.assignment.findMany({
    where: { weekStart: weekRange },
    include: { family: { include: { sessions: { orderBy: { sessionNumber: 'asc' } } } } },
  });
  const toDelete: string[] = [];
  for (const a of existingAssignments) {
    if (!a.family) continue;
    const info = getNextSessionInfo(a.family);
    if (!info || info.projectedDate > targetSunday) {
      toDelete.push(a.id);
    }
  }
  if (toDelete.length > 0) {
    await prisma.assignment.deleteMany({ where: { id: { in: toDelete } } });
  }

  // 테이블 설정 조회
  const tables = await prisma.tableConfig.findMany({
    orderBy: { tableNumber: 'asc' },
    include: {
      assignments: {
        where: { weekStart: weekRange },
        include: { family: { include: { members: true, sessions: { orderBy: { sessionNumber: 'asc' } } } } },
      },
    },
  });

  // ACTIVE 가족 중 이번 주 미배정 목록
  const assignedFamilyIds = tables.flatMap(t =>
    t.assignments.map(a => a.familyId)
  );

  const allUnassigned = await prisma.family.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: assignedFamilyIds.length > 0 ? assignedFamilyIds : ['__none__'] },
    },
    include: { members: true, sessions: { orderBy: { sessionNumber: 'asc' }, include: { volunteer: true } } },
  });

  // 해당 주 일요일에 예정된 교육 대상만 필터
  const unassignedFamilies = allUnassigned.filter(family => {
    const info = getNextSessionInfo(family);
    if (!info) return false;
    return info.projectedDate <= targetSunday;
  });

  // 활성 바나바 조회
  const volunteers = await prisma.volunteer.findMany({
    where: { isActive: true },
  });

  const newAssignments: any[] = [];

  // 각 테이블의 현재 수용 인원 추적 (기존 배정 기반)
  const tableOccupancy: Record<string, number> = {};
  for (const table of tables) {
    let occ = 0;
    for (const a of table.assignments) {
      if (!a.family) continue;
      const nextS = a.family.sessions?.find((s: any) => !s.completed);
      const cat = nextS?.type === 'PASTOR_VISIT' ? 'pastor_visit'
                : nextS?.sessionNumber === 1 ? 'first_week' : 'normal';
      occ += getTotalSeatCount(a.family, cat as any);
    }
    tableOccupancy[table.id] = occ;
  }

  // 테이블에 가족 배정하는 헬퍼
  function assignToTable(tableId: string, familyId: string, volunteerId: string | null) {
    newAssignments.push({ tableId, familyId, volunteerId, pastorId: null, weekStart });
  }

  // 테이블을 번호로 찾기
  function getTable(num: number) {
    return tables.find(t => t.tableNumber === num);
  }

  // 우선순위 테이블 목록에서 가장 적합한 테이블 찾기
  function findBestTable(preferredNums: number[], seatCount: number): any | null {
    for (const num of preferredNums) {
      const table = getTable(num);
      if (!table) continue;
      const occupied = newAssignments.filter(a => a.tableId === table.id).length
        + table.assignments.length;
      if (occupied >= 1) continue; // 1테이블 1가족 원칙
      const currentOcc = tableOccupancy[table.id] || 0;
      if (currentOcc + seatCount <= table.capacity) {
        return table;
      }
    }
    return null;
  }

  // 가족을 분류: 담임목사님 면담 / 1주차 / 일반
  const pastorVisitFamilies: any[] = [];
  const firstWeekFamilies: any[] = [];
  const normalFamilies: any[] = [];

  for (const family of unassignedFamilies) {
    const nextSession = family.sessions.find((s: any) => !s.completed);
    if (!nextSession) continue;

    const needsPastorVisit = nextSession.type === 'PASTOR_VISIT' ||
      ((nextSession as any).pastorVisit && nextSession.sessionNumber >= 2);

    if (needsPastorVisit) {
      pastorVisitFamilies.push(family);
    } else if (nextSession.sessionNumber === 1) {
      firstWeekFamilies.push(family);
    } else {
      normalFamilies.push(family);
    }
  }

  // 인원수 내림차순 정렬 (큰 가족부터 배정)
  const sortByAttendees = (a: any, b: any) => getFamilyAttendeeCount(b) - getFamilyAttendeeCount(a);
  pastorVisitFamilies.sort(sortByAttendees);
  firstWeekFamilies.sort(sortByAttendees);
  normalFamilies.sort(sortByAttendees);

  // 담임목사 면담 카운트
  let seniorPastorCount = 0;
  const existingPastorAssignments = await prisma.assignment.findMany({
    where: { weekStart: weekRange },
    include: { pastor: true },
  });
  seniorPastorCount = existingPastorAssignments.filter(
    a => a.pastor?.role === 'SENIOR'
  ).length;

  // 세션에 배정된 바나바 우선, 없으면 가용 바나바 탐색
  function getVolunteerForFamily(family: any): string | null {
    const nextSession = family.sessions?.find((s: any) => !s.completed);
    if (nextSession?.volunteerId) return nextSession.volunteerId;
    const v = volunteers.find(v =>
      v.availability === 'BOTH' || v.availability === family.serviceTime
    );
    return v?.id || null;
  }

  // 1단계: 담임목사님 면담 가족 → 테이블3 우선, 그다음 테이블2
  for (const family of pastorVisitFamilies) {
    const seatCount = getTotalSeatCount(family, 'pastor_visit');
    const volunteerId = getVolunteerForFamily(family);

    const table = findBestTable([3, 2, 1, 4, 5, 6, 7, 8], seatCount);
    if (table) {
      assignToTable(table.id, family.id, volunteerId);
      tableOccupancy[table.id] = (tableOccupancy[table.id] || 0) + seatCount;
      seniorPastorCount++;
      if (seniorPastorCount > 2) {
        warnings.push(`경고: 담임목사 면담 가정이 ${seniorPastorCount}팀입니다 (최대 2팀 권장)`);
      }
    } else {
      warnings.push(`경고: 배정 가능한 테이블이 없습니다. ${family.members[0]?.name || '가족'} 배정 불가`);
    }
  }

  // 2단계: 1주차 가족 → 새가족실 안쪽(1,2,3) 우선
  for (const family of firstWeekFamilies) {
    const seatCount = getTotalSeatCount(family, 'first_week');
    const volunteerId = getVolunteerForFamily(family);

    const table = findBestTable([1, 2, 3, 4, 5, 6, 7, 8], seatCount);
    if (table) {
      assignToTable(table.id, family.id, volunteerId);
      tableOccupancy[table.id] = (tableOccupancy[table.id] || 0) + seatCount;
    } else {
      warnings.push(`경고: 배정 가능한 테이블이 없습니다. ${family.members[0]?.name || '가족'} 배정 불가`);
    }
  }

  // 3단계: 일반 가족 → 인원수 고려하여 배정
  for (const family of normalFamilies) {
    const seatCount = getTotalSeatCount(family, 'normal');
    const volunteerId = getVolunteerForFamily(family);

    const table = findBestTable([1, 2, 3, 4, 5, 6, 7, 8], seatCount);
    if (table) {
      assignToTable(table.id, family.id, volunteerId);
      tableOccupancy[table.id] = (tableOccupancy[table.id] || 0) + seatCount;
    } else {
      warnings.push(`경고: 배정 가능한 테이블이 없습니다. ${family.members[0]?.name || '가족'} 배정 불가`);
    }
  }

  // DB에 배정 저장
  const created = [];
  for (const assignment of newAssignments) {
    const result = await prisma.assignment.create({
      data: assignment,
      include: {
        table: true,
        family: { include: { members: true } },
        volunteer: true,
        pastor: true,
      },
    });
    created.push(result);
  }

  return { assignments: created, warnings };
}
