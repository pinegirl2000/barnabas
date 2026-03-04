import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param } from '../utils/params';

export const pastorRouter = Router();
pastorRouter.use(authenticate);

pastorRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const pastors = await prisma.pastor.findMany({ orderBy: { name: 'asc' } });
    res.json(pastors);
  } catch (err) {
    res.status(500).json({ error: '목사 목록 조회 실패' });
  }
});

pastorRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const pastor = await prisma.pastor.create({ data: req.body });
    res.status(201).json(pastor);
  } catch (err) {
    res.status(500).json({ error: '목사 등록 실패' });
  }
});

pastorRouter.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const pastor = await prisma.pastor.update({ where: { id: param(req, 'id') }, data: req.body });
    res.json(pastor);
  } catch (err) {
    res.status(500).json({ error: '목사 수정 실패' });
  }
});

pastorRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.pastor.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '목사 삭제 실패' });
  }
});
