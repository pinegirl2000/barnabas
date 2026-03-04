import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { param, query } from '../utils/params';

export const zoneRouter = Router();
zoneRouter.use(authenticate);

zoneRouter.get('/', async (req: Request, res: Response) => {
  try {
    const regionId = query(req, 'regionId');
    const where: any = {};
    if (regionId) where.regionId = regionId;

    const zones = await prisma.zone.findMany({
      where,
      include: { region: true, leader: true, families: { include: { members: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: '구역 목록 조회 실패' });
  }
});

zoneRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const zone = await prisma.zone.create({ data: req.body, include: { region: true, leader: true } });
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ error: '구역 등록 실패' });
  }
});

zoneRouter.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const zone = await prisma.zone.update({ where: { id: param(req, 'id') }, data: req.body, include: { region: true, leader: true } });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: '구역 수정 실패' });
  }
});

zoneRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.zone.delete({ where: { id: param(req, 'id') } });
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '구역 삭제 실패' });
  }
});
