import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param } from '../utils/params';

export const sessionRouter = Router();
sessionRouter.use(authenticate);

sessionRouter.get('/family/:familyId', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.sessionRecord.findMany({
      where: { familyId: param(req, 'familyId') },
      include: { volunteer: true, pastor: true },
      orderBy: { sessionNumber: 'asc' },
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: '세션 목록 조회 실패' });
  }
});

sessionRouter.put(
  '/:id',
  requireRole('ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'),
  async (req: Request, res: Response) => {
    try {
      const id = param(req, 'id');
      const { feedback, completed, date, photoUrl, needsNewVolunteer, pastorVisit } = req.body;

      const session = await prisma.sessionRecord.update({
        where: { id },
        data: {
          ...(feedback !== undefined && { feedback }),
          ...(completed !== undefined && { completed }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(needsNewVolunteer !== undefined && { needsNewVolunteer }),
          ...(pastorVisit !== undefined && { pastorVisit }),
        },
        include: { volunteer: true, pastor: true },
      });

      if (completed) {
        await prisma.family.update({
          where: { id: session.familyId },
          data: { lastContactAt: new Date() },
        });
      }

      res.json(session);
    } catch (err) {
      res.status(500).json({ error: '세션 업데이트 실패' });
    }
  }
);

sessionRouter.put(
  '/:id/volunteer',
  requireRole('ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'),
  async (req: Request, res: Response) => {
    try {
      const { volunteerId } = req.body;
      const session = await prisma.sessionRecord.update({
        where: { id: param(req, 'id') },
        data: { volunteerId: volunteerId || null, needsNewVolunteer: false },
        include: { volunteer: true, pastor: true },
      });

      // 미완료 이후 회차 중 바나바가 없는 세션도 함께 업데이트
      // 단, 신규는 7·8회차(목사님 심방), 재등록은 3·4회차(목사님 심방) 제외
      if (volunteerId && !session.completed) {
        const family = await prisma.family.findUnique({
          where: { id: session.familyId },
          select: { type: true },
        });
        const excludeNumbers = family?.type === 'RE_REGISTER' ? [3, 4] : [7, 8];

        await prisma.sessionRecord.updateMany({
          where: {
            familyId: session.familyId,
            sessionNumber: { gt: session.sessionNumber, notIn: excludeNumbers },
            completed: false,
            volunteerId: null,
          },
          data: { volunteerId },
        });
      }

      res.json(session);
    } catch (err) {
      res.status(500).json({ error: '바나바 변경 실패' });
    }
  }
);

sessionRouter.put(
  '/:id/pastor',
  requireRole('ADMIN', 'FAMILY_TEAM'),
  async (req: Request, res: Response) => {
    try {
      const { pastorId } = req.body;
      const session = await prisma.sessionRecord.update({
        where: { id: param(req, 'id') },
        data: { pastorId },
        include: { volunteer: true, pastor: true },
      });
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: '목사 배정 실패' });
    }
  }
);
