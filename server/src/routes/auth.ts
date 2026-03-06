import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { getKakaoAuthUrl, getKakaoToken, getKakaoUserInfo } from '../utils/kakao';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

export const authRouter = Router();

// 카카오 로그인 URL로 리다이렉트
authRouter.get('/kakao', (_req: Request, res: Response) => {
  res.redirect(getKakaoAuthUrl());
});

// 카카오 콜백 → JWT 발급
authRouter.get('/kakao/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: '인가 코드가 없습니다' });
      return;
    }

    const accessToken = await getKakaoToken(code);
    const kakaoUser = await getKakaoUserInfo(accessToken);

    const user = await prisma.user.upsert({
      where: { kakaoId: String(kakaoUser.id) },
      update: {
        name: kakaoUser.kakao_account?.profile?.nickname || '사용자',
        email: kakaoUser.kakao_account?.email,
      },
      create: {
        kakaoId: String(kakaoUser.id),
        name: kakaoUser.kakao_account?.profile?.nickname || '사용자',
        email: kakaoUser.kakao_account?.email,
        role: 'USER',
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
    if (process.env.NODE_ENV === 'production') {
      res.redirect(`/auth/callback?token=${token}`);
    } else {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/auth/callback?token=${token}`);
    }
  } catch (err) {
    console.error('Kakao auth error:', err);
    const message = err instanceof Error ? err.message : '카카오 인증 실패';
    res.status(500).json({ error: '카카오 인증 실패', detail: message });
  }
});

// 현재 로그인 유저 정보
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { volunteer: true },
    });
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 사용자 목록 (ADMIN only)
authRouter.get('/users', authenticate, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '사용자 목록 조회 실패' });
  }
});

// 사용자 역할 변경 (ADMIN only)
authRouter.put('/users/:id/role', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER', 'ZONE_LEADER', 'USER'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: '유효하지 않은 역할입니다' });
      return;
    }

    // 자기 자신 역할 변경 방지
    if (id === req.user!.userId) {
      res.status(400).json({ error: '자신의 역할은 변경할 수 없습니다' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as any },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '역할 변경 실패' });
  }
});

// 바나바 등록 (즉시 완료: Volunteer 생성 + User 연결)
authRouter.post('/volunteer-request', authenticate, async (req: Request, res: Response) => {
  try {
    const { name: volunteerName } = req.body;
    if (!volunteerName?.trim()) {
      res.status(400).json({ error: '이름을 입력해주세요' });
      return;
    }

    const assignRole = 'VOLUNTEER';

    // Volunteer 레코드 생성 (정식 이름으로)
    const volunteer = await prisma.volunteer.create({
      data: { name: volunteerName.trim(), availability: 'BOTH' },
    });

    // User 업데이트: 연결 + 상태 변경
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { isFirstLogin: false, volunteerStatus: 'APPROVED', volunteerId: volunteer.id, role: assignRole },
      include: { volunteer: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '등록 실패' });
  }
});

// 첫 로그인 모달 닫기 (등록 거절)
authRouter.post('/dismiss-first-login', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { isFirstLogin: false },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '처리 실패' });
  }
});

// 등록된 바나바 목록 (ADMIN only) — volunteer 정보 포함
authRouter.get('/volunteer-requests', authenticate, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const volunteers = await prisma.user.findMany({
      where: { volunteerStatus: 'APPROVED' },
      include: { volunteer: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: '바나바 목록 조회 실패' });
  }
});

// 바나바 정보 업데이트 (이름 매핑, 예배시간, 권한) (ADMIN only)
authRouter.put('/volunteer-requests/:userId/update', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { volunteerName, availability, role } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { volunteer: true } });
    if (!user || !user.volunteerId) {
      res.status(404).json({ error: '바나바를 찾을 수 없습니다' });
      return;
    }

    // Volunteer 정보 업데이트
    if (volunteerName || availability) {
      await prisma.volunteer.update({
        where: { id: user.volunteerId },
        data: {
          ...(volunteerName && { name: volunteerName }),
          ...(availability && { availability }),
        },
      });
    }

    // 역할 변경
    if (role && userId !== req.user!.userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    // 최신 정보 반환
    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { volunteer: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '업데이트 실패' });
  }
});
