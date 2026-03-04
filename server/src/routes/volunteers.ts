import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param } from '../utils/params';

/** 로컬 날짜를 YYYY-MM-DD 문자열로 변환 */
function toLocaleDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const volunteerRouter = Router();
volunteerRouter.use(authenticate);

volunteerRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const volunteers = await prisma.volunteer.findMany({
      orderBy: { name: 'asc' },
      include: { users: { select: { id: true, name: true } } },
    });
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: '목록 조회 실패' });
  }
});

/** 이번주 일요일 바나바별 일정 */
volunteerRouter.get('/schedule', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + diff);
    sunday.setHours(0, 0, 0, 0);
    const sundayStr = toLocaleDateStr(sunday);

    const families = await prisma.family.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: true,
        sessions: { orderBy: { sessionNumber: 'asc' }, include: { volunteer: true } },
      },
    });

    // 각 가족의 이번주 일요일 예정 세션 찾기
    const scheduleItems: any[] = [];
    for (const family of families) {
      const sessions = family.sessions;
      const nextIdx = sessions.findIndex(s => {
        if (s.completed) return false;
        if (s.sessionNumber === 1) return true;
        const prev = sessions.find(p => p.sessionNumber === s.sessionNumber - 1);
        return prev?.completed;
      });
      if (nextIdx === -1) continue;
      const nextSession = sessions[nextIdx];

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
              const is4Week = family.type === 'RE_REGISTER' ? sessions[j].sessionNumber >= 3 : sessions[j].sessionNumber >= 7;
              weeksToAdd += is4Week ? 4 : 1;
            }
            break;
          }
        }
        if (!baseDate) {
          baseDate = new Date(family.registeredAt);
          const d = baseDate.getDay();
          if (d !== 0) baseDate.setDate(baseDate.getDate() + (7 - d));
          for (let j = 1; j <= nextIdx; j++) {
            const is4Week = family.type === 'RE_REGISTER' ? sessions[j].sessionNumber >= 3 : sessions[j].sessionNumber >= 7;
            weeksToAdd += is4Week ? 4 : 1;
          }
        }
        const projected = new Date(baseDate!.getTime() + weeksToAdd * 7 * 24 * 60 * 60 * 1000);
        projectedDate = toLocaleDateStr(projected);
      }

      if (projectedDate > sundayStr) continue;

      const { sessions: _, ...familyInfo } = family;
      scheduleItems.push({
        sessionId: nextSession.id,
        sessionNumber: nextSession.sessionNumber,
        sessionType: nextSession.type,
        totalSessions: sessions.length,
        completedCount: sessions.filter(s => s.completed).length,
        volunteer: nextSession.volunteer,
        volunteerId: nextSession.volunteerId,
        family: familyInfo,
      });
    }

    // 바나바별 그룹핑
    const volunteerMap = new Map<string, { volunteer: any; items: any[] }>();
    const unassigned: any[] = [];

    for (const item of scheduleItems) {
      if (!item.volunteerId || !item.volunteer) {
        unassigned.push(item);
      } else {
        const key = item.volunteerId;
        if (!volunteerMap.has(key)) {
          volunteerMap.set(key, { volunteer: item.volunteer, items: [] });
        }
        volunteerMap.get(key)!.items.push(item);
      }
    }

    const grouped = Array.from(volunteerMap.values()).sort((a, b) => a.volunteer.name.localeCompare(b.volunteer.name, 'ko'));
    res.json({ sundayStr, grouped, unassigned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '바나바 일정 조회 실패' });
  }
});

volunteerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: param(req, 'id') },
      include: {
        sessions: { include: { family: { include: { members: true } } } },
        assignments: { include: { family: { include: { members: true } }, table: true }, orderBy: { weekStart: 'desc' } },
      },
    });
    if (!volunteer) { res.status(404).json({ error: '바나바를 찾을 수 없습니다' }); return; }
    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: '상세 조회 실패' });
  }
});

volunteerRouter.post('/', requireRole('ADMIN', 'FAMILY_TEAM'), async (req: Request, res: Response) => {
  try {
    const volunteer = await prisma.volunteer.create({ data: req.body });
    res.status(201).json(volunteer);
  } catch (err) {
    res.status(500).json({ error: '등록 실패' });
  }
});

volunteerRouter.put('/:id', requireRole('ADMIN', 'FAMILY_TEAM'), async (req: Request, res: Response) => {
  try {
    const volunteer = await prisma.volunteer.update({ where: { id: param(req, 'id') }, data: req.body });
    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: '수정 실패' });
  }
});

volunteerRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.volunteer.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패' });
  }
});
