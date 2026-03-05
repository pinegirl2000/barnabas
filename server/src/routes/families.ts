import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { createSessionsForFamily } from '../services/sessionService';
import { param, query } from '../utils/params';

export const familyRouter = Router();
familyRouter.use(authenticate);

// 등록번호 자동 생성: YYYY-001 형식
async function generateRegistrationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const lastFamily = await prisma.family.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: 'desc' },
  });

  let nextNum = 1;
  if (lastFamily?.registrationNumber) {
    const lastNum = parseInt(lastFamily.registrationNumber.split('-')[1], 10);
    nextNum = lastNum + 1;
  }

  return `${year}-${String(nextNum).padStart(3, '0')}`;
}

// 새가족 목록
familyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const status = query(req, 'status');
    const type = query(req, 'type');
    const serviceTime = query(req, 'serviceTime');
    const search = query(req, 'search');

    const where: any = {};
    const excludeCompleted = query(req, 'excludeCompleted');
    if (status) where.status = status;
    else if (excludeCompleted === 'true') where.status = { not: 'COMPLETED' };
    if (type) where.type = type;
    if (serviceTime) where.serviceTime = serviceTime;
    if (search) {
      where.members = { some: { name: { contains: search, mode: 'insensitive' } } };
    }

    const families = await prisma.family.findMany({
      where,
      include: {
        members: true,
        sessions: { orderBy: { sessionNumber: 'asc' }, include: { volunteer: true } },
        district: true,
        region: true,
        zone: true,
        assignments: {
          include: { volunteer: true },
          orderBy: { weekStart: 'desc' },
          take: 1,
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json(families);
  } catch (err) {
    res.status(500).json({ error: '목록 조회 실패' });
  }
});

// 수료 목록 (연도별) — 신규: 6주차 완료, 재등록: 2주차 완료 기준
familyRouter.get('/graduated', async (req: Request, res: Response) => {
  try {
    const year = query(req, 'year') || String(new Date().getFullYear());
    const yearNum = parseInt(year);
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    const families = await prisma.family.findMany({
      where: {
        registeredAt: { gte: startDate, lt: endDate },
        OR: [
          {
            type: 'NEW',
            sessions: { some: { sessionNumber: 6, completed: true } },
          },
          {
            type: 'RE_REGISTER',
            sessions: { some: { sessionNumber: 2, completed: true } },
          },
        ],
      },
      include: {
        members: true,
        sessions: {
          include: { volunteer: true },
          orderBy: { sessionNumber: 'asc' },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    // 수료일과 전화심방 정보 계산
    const result = families.map(family => {
      const gradSessionNum = family.type === 'NEW' ? 6 : 2;
      const gradSession = family.sessions.find(s => s.sessionNumber === gradSessionNum);
      const phoneVisits = family.sessions.filter(s => s.type === 'PHONE_VISIT');

      return {
        ...family,
        graduatedAt: gradSession?.date || gradSession?.updatedAt || null,
        phoneVisits: phoneVisits.map(pv => ({
          sessionNumber: pv.sessionNumber,
          date: pv.date,
          completed: pv.completed,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '수료 목록 조회 실패' });
  }
});

// 새가족 등록 현황 (주일별 그룹핑)
familyRouter.get('/registrations', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const dateFilter: any = { not: null };
    if (from) dateFilter.gte = new Date(from + 'T00:00:00');
    if (to) dateFilter.lte = new Date(to + 'T23:59:59');

    const allFirstSessions = await prisma.sessionRecord.findMany({
      where: {
        sessionNumber: 1,
        date: dateFilter,
      },
      include: {
        family: {
          include: {
            members: true,
            sessions: {
              include: { volunteer: true },
              orderBy: { sessionNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const grouped: Record<string, any[]> = {};
    for (const session of allFirstSessions) {
      if (!session.date) continue;
      const dateStr = toLocaleDateStr(new Date(session.date));
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(session.family);
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, families]) => ({ date, families }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '등록 현황 조회 실패' });
  }
});

// 전화심방 예정 목록 (신규 7-8주차, 재등록 3-4주차)
familyRouter.get('/phone-visits', async (_req: Request, res: Response) => {
  try {
    const families = await prisma.family.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: true,
        sessions: {
          include: { volunteer: true },
          orderBy: { sessionNumber: 'asc' },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    // 전화심방 해당 세션이 있는 가족만 필터
    const result = families.filter(f => {
      const phoneSessionNumbers = f.type === 'RE_REGISTER' ? [3, 4] : [7, 8];
      return f.sessions.some(s =>
        phoneSessionNumbers.includes(s.sessionNumber)
      );
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '전화심방 목록 조회 실패' });
  }
});

// 새가족 조회 (기간별 검색)
familyRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const fromDate = query(req, 'fromDate');
    const toDate = query(req, 'toDate');
    const search = query(req, 'search');

    // 1회차 완료일 기준 필터링
    const sessionFilter: any = { sessionNumber: 1, date: { not: null } };
    if (fromDate || toDate) {
      sessionFilter.date = {};
      if (fromDate) sessionFilter.date.gte = new Date(fromDate + 'T00:00:00');
      if (toDate) sessionFilter.date.lte = new Date(toDate + 'T23:59:59');
    }

    const where: any = {
      sessions: { some: sessionFilter },
    };
    if (search) {
      where.members = { some: { name: { contains: search, mode: 'insensitive' } } };
    }

    const families = await prisma.family.findMany({
      where,
      include: {
        members: true,
        sessions: { orderBy: { sessionNumber: 'asc' }, include: { volunteer: true } },
        district: true,
        region: true,
        zone: true,
      },
      orderBy: { registeredAt: 'desc' },
    });

    const result = families.map(f => {
      const firstSession = f.sessions.find(s => s.sessionNumber === 1);
      return { ...f, firstSessionDate: firstSession?.date || null };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '새가족 조회 실패' });
  }
});

// 새가족 상세
familyRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const family = await prisma.family.findUnique({
      where: { id },
      include: {
        members: true,
        sessions: {
          include: { volunteer: true, pastor: true },
          orderBy: { sessionNumber: 'asc' },
        },
        district: true,
        region: true,
        zone: true,
        assignments: {
          include: { table: true, volunteer: true, pastor: true },
          orderBy: { weekStart: 'desc' },
        },
      },
    });
    if (!family) {
      res.status(404).json({ error: '가족을 찾을 수 없습니다' });
      return;
    }
    res.json(family);
  } catch (err) {
    res.status(500).json({ error: '상세 조회 실패' });
  }
});

// 새가족 등록
familyRouter.post(
  '/',
  requireRole('ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'),
  async (req: Request, res: Response) => {
    try {
      const { members, type, serviceTime, districtId, regionId, zoneId, photoUrl, arrivalDate, volunteerId, address } = req.body;

      // 등록번호 자동 발급
      const registrationNumber = await generateRegistrationNumber();

      const family = await prisma.family.create({
        data: {
          type: type || 'NEW',
          serviceTime: serviceTime || 'FIRST',
          registrationNumber,
          districtId,
          regionId,
          zoneId,
          photoUrl,
          arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
          address: address || null,
          members: {
            create: members.map((m: any) => ({
              name: m.name,
              relation: m.relation,
              gender: m.gender || null,
              birthDate: m.birthDate || null,
              phone: m.phone || null,
              position: m.position || null,
              isSingle: m.isSingle || false,
              attending: m.attending || false,
              baptized: m.baptized || false,
              baptismYear: m.baptismYear || null,
              previousChurch: m.previousChurch || null,
              servingDepartment: m.servingDepartment || null,
              memo: m.memo,
            })),
          },
        },
        include: { members: true },
      });

      await createSessionsForFamily(family.id, family.type);

      // 등록일을 첫 번째 세션 날짜(첫 만남일)로 설정
      const firstSession = await prisma.sessionRecord.findFirst({
        where: { familyId: family.id, sessionNumber: 1 },
      });
      if (firstSession?.date) {
        await prisma.family.update({
          where: { id: family.id },
          data: { registeredAt: firstSession.date },
        });
      }

      // 담당 바나바가 지정된 경우 세션들에 바나바 배정
      if (volunteerId) {
        await prisma.sessionRecord.updateMany({
          where: { familyId: family.id },
          data: { volunteerId },
        });
      }

      const result = await prisma.family.findUnique({
        where: { id: family.id },
        include: { members: true, sessions: true },
      });

      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '등록 실패' });
    }
  }
);

// 새가족 수정
familyRouter.put(
  '/:id',
  requireRole('ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'),
  async (req: Request, res: Response) => {
    try {
      const id = param(req, 'id');
      const { members, volunteerId, ...familyData } = req.body;

      const family = await prisma.family.update({
        where: { id },
        data: familyData,
        include: { members: true },
      });

      // 바나바 변경 시 미완료 세션만 업데이트
      if (volunteerId !== undefined) {
        await prisma.sessionRecord.updateMany({
          where: { familyId: id, completed: false },
          data: { volunteerId: volunteerId || null, needsNewVolunteer: false },
        });
      }

      if (members && Array.isArray(members)) {
        for (const m of members) {
          if (m.id) {
            await prisma.member.update({
              where: { id: m.id },
              data: { name: m.name, relation: m.relation, gender: m.gender, birthDate: m.birthDate || null, phone: m.phone || null, position: m.position, isSingle: m.isSingle, attending: m.attending, baptized: m.baptized, baptismYear: m.baptismYear, previousChurch: m.previousChurch, servingDepartment: m.servingDepartment, memo: m.memo },
            });
          } else {
            await prisma.member.create({
              data: { familyId: family.id, name: m.name, relation: m.relation, gender: m.gender, birthDate: m.birthDate || null, phone: m.phone || null, position: m.position, isSingle: m.isSingle, attending: m.attending, baptized: m.baptized, baptismYear: m.baptismYear, previousChurch: m.previousChurch, servingDepartment: m.servingDepartment, memo: m.memo },
            });
          }
        }
      }

      const result = await prisma.family.findUnique({
        where: { id: family.id },
        include: { members: true, sessions: true },
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: '수정 실패' });
    }
  }
);

// 새가족 삭제
familyRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      await prisma.family.delete({ where: { id: param(req, 'id') } });
      res.json({ message: '삭제 완료' });
    } catch (err) {
      res.status(500).json({ error: '삭제 실패' });
    }
  }
);

function toLocaleDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
