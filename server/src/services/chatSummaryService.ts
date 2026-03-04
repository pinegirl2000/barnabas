import { prisma } from '../utils/prisma';

interface WeeklySummary {
  familyId: string;
  familyName: string;
  messageCount: number;
  keywords: string[];
  attendancePrediction: 'LIKELY' | 'UNLIKELY' | 'UNKNOWN';
  rawMessages: string[];
}

// 간단한 캐시 (주 1회 계산)
const summaryCache = new Map<string, { data: WeeklySummary[]; createdAt: Date }>();

/**
 * 주간 카톡 메시지 요약 (간단 내부 로직 버전)
 * - 외부 AI 호출 없이 키워드 추출 방식
 * - 주당 1회 캐시
 */
export async function getWeeklySummary(weekStart: Date): Promise<WeeklySummary[]> {
  const cacheKey = weekStart.toISOString();
  const cached = summaryCache.get(cacheKey);

  // 캐시가 24시간 이내이면 재사용
  if (cached && Date.now() - cached.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    return cached.data;
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const messages = await prisma.chatMessage.findMany({
    where: {
      sentAt: { gte: weekStart, lt: weekEnd },
      familyId: { not: null },
    },
    orderBy: { sentAt: 'asc' },
  });

  // 가족별 그룹핑
  const familyMap = new Map<string, typeof messages>();
  for (const msg of messages) {
    if (!msg.familyId) continue;
    const group = familyMap.get(msg.familyId) || [];
    group.push(msg);
    familyMap.set(msg.familyId, group);
  }

  const summaries: WeeklySummary[] = [];

  for (const [familyId, msgs] of familyMap) {
    const allText = msgs.map(m => m.content).join(' ');
    const keywords = extractKeywords(allText);
    const prediction = predictAttendance(allText);

    // 가족 이름 조회
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: { members: { take: 1 } },
    });

    summaries.push({
      familyId,
      familyName: family?.members[0]?.name || '알 수 없음',
      messageCount: msgs.length,
      keywords,
      attendancePrediction: prediction,
      rawMessages: msgs.map(m => `[${m.sender}] ${m.content}`),
    });
  }

  summaryCache.set(cacheKey, { data: summaries, createdAt: new Date() });
  return summaries;
}

// 간단 키워드 추출
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns: [RegExp, string][] = [
    [/참석|출석|갈게|갑니다/g, '참석 의사'],
    [/못.*가|불참|결석|안.*갈/g, '불참 의사'],
    [/감사|좋았|은혜/g, '긍정 피드백'],
    [/힘들|어렵|고민/g, '어려움 표현'],
    [/기도|부탁/g, '기도 요청'],
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) {
      keywords.push(label);
    }
  }

  return keywords;
}

// 간단 출석 예측
function predictAttendance(text: string): 'LIKELY' | 'UNLIKELY' | 'UNKNOWN' {
  const positivePatterns = /참석|출석|갈게|갑니다|네|예/;
  const negativePatterns = /못.*가|불참|결석|안.*갈|아프|일이.*있/;

  if (positivePatterns.test(text)) return 'LIKELY';
  if (negativePatterns.test(text)) return 'UNLIKELY';
  return 'UNKNOWN';
}
