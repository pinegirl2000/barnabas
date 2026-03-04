import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { autoAssign } from '../services/assignmentService';
import { param, query } from '../utils/params';

export const assignmentRouter = Router();
assignmentRouter.use(authenticate);

assignmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const week = query(req, 'week');
    const weekStart = week ? new Date(week) : getMonday(new Date());

    const tables = await prisma.tableConfig.findMany({
      orderBy: { tableNumber: 'asc' },
      include: {
        assignments: {
          where: { weekStart },
          include: {
            family: { include: { members: true, sessions: { orderBy: { sessionNumber: 'asc' } } } },
            volunteer: true,
            pastor: true,
          },
        },
      },
    });

    res.json({ weekStart, tables });
  } catch (err) {
    res.status(500).json({ error: '배정 현황 조회 실패' });
  }
});

assignmentRouter.post(
  '/auto',
  requireRole('ADMIN', 'FAMILY_TEAM'),
  async (req: Request, res: Response) => {
    try {
      const { week } = req.body;
      const weekStart = week ? new Date(week) : getMonday(new Date());
      const result = await autoAssign(weekStart);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '자동 배정 실패' });
    }
  }
);

assignmentRouter.put(
  '/:id',
  requireRole('ADMIN', 'FAMILY_TEAM'),
  async (req: Request, res: Response) => {
    try {
      const id = param(req, 'id');
      const { tableId, volunteerId, pastorId } = req.body;

      if (tableId) {
        const table = await prisma.tableConfig.findUnique({
          where: { id: tableId },
          include: { assignments: true },
        });
        if (table && table.assignments.length >= table.capacity) {
          res.status(400).json({ error: `테이블 ${table.tableNumber}번이 만석입니다 (용량: ${table.capacity})` });
          return;
        }
      }

      const assignment = await prisma.assignment.update({
        where: { id },
        data: {
          ...(tableId && { tableId }),
          ...(volunteerId !== undefined && { volunteerId }),
          ...(pastorId !== undefined && { pastorId }),
        },
        include: {
          table: true,
          family: { include: { members: true } },
          volunteer: true,
          pastor: true,
        },
      });

      res.json(assignment);
    } catch (err) {
      res.status(500).json({ error: '배정 수정 실패' });
    }
  }
);

assignmentRouter.delete(
  '/:id',
  requireRole('ADMIN', 'FAMILY_TEAM'),
  async (req: Request, res: Response) => {
    try {
      await prisma.assignment.delete({ where: { id: param(req, 'id') } });
      res.json({ message: '배정 해제 완료' });
    } catch (err) {
      res.status(500).json({ error: '배정 해제 실패' });
    }
  }
);

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
