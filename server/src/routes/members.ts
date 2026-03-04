import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param } from '../utils/params';

export const memberRouter = Router();
memberRouter.use(authenticate);

memberRouter.put('/:id', requireRole('ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'), async (req: Request, res: Response) => {
  try {
    const member = await prisma.member.update({ where: { id: param(req, 'id') }, data: req.body });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: '멤버 수정 실패' });
  }
});

memberRouter.delete('/:id', requireRole('ADMIN', 'FAMILY_TEAM'), async (req: Request, res: Response) => {
  try {
    await prisma.member.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '멤버 삭제 실패' });
  }
});
