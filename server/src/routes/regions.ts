import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param, query } from '../utils/params';

export const regionRouter = Router();
regionRouter.use(authenticate);

regionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const districtId = query(req, 'districtId');
    const where: any = {};
    if (districtId) where.districtId = districtId;

    const regions = await prisma.region.findMany({
      where,
      include: { district: true, zones: true },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (err) {
    res.status(500).json({ error: '지역 목록 조회 실패' });
  }
});

regionRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const region = await prisma.region.create({ data: req.body });
    res.status(201).json(region);
  } catch (err) {
    res.status(500).json({ error: '지역 등록 실패' });
  }
});

regionRouter.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const region = await prisma.region.update({ where: { id: param(req, 'id') }, data: req.body });
    res.json(region);
  } catch (err) {
    res.status(500).json({ error: '지역 수정 실패' });
  }
});

regionRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.region.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '지역 삭제 실패' });
  }
});
