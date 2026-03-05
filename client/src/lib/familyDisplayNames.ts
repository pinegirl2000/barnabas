/**
 * 새가족 이름 표시: 출석자 중 나이 많은 순서대로 최대 2명
 * - attending=true인 구성원만 대상 (없으면 전체)
 * - birthDate 오름차순 (생년월일 빠른 = 나이 많은 순)
 * - 최대 2명까지만 표시
 */
export function familyDisplayNames(members: any[]): string {
  if (!members || members.length === 0) return '이름 없음';

  const attending = members.filter((m: any) => m.attending);
  const pool = attending.length > 0 ? attending : members;

  const sorted = [...pool].sort((a: any, b: any) => {
    if (!a.birthDate && !b.birthDate) return 0;
    if (!a.birthDate) return 1;
    if (!b.birthDate) return -1;
    return a.birthDate.localeCompare(b.birthDate);
  });

  return sorted.slice(0, 2).map((m: any) => m.name).join(', ') || '이름 없음';
}
