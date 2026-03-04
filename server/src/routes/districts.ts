import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param } from '../utils/params';

export const districtRouter = Router();
districtRouter.use(authenticate);

districtRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const districts = await prisma.district.findMany({
      include: { regions: { include: { zones: { include: { leader: true } } }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json(districts);
  } catch (err) {
    res.status(500).json({ error: '교구 목록 조회 실패' });
  }
});

districtRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const district = await prisma.district.create({ data: req.body });
    res.status(201).json(district);
  } catch (err) {
    res.status(500).json({ error: '교구 등록 실패' });
  }
});

districtRouter.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const district = await prisma.district.update({ where: { id: param(req, 'id') }, data: req.body });
    res.json(district);
  } catch (err) {
    res.status(500).json({ error: '교구 수정 실패' });
  }
});

districtRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.district.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '교구 삭제 실패' });
  }
});
