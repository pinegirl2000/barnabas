export interface ParsedMember {
  familyHead: string;     // 가족대표이름
  type: string;           // 신규 | 재등록
  serviceTime: string;    // 1부후 | 2부후
  name: string;
  relation: string;
  gender: string;
  birthDate: string;
  phone: string;
  position: string;
  baptized: boolean;
  previousChurch: string;
  address: string;
  volunteerName: string;
  attending: boolean;
}

function parseType(val: string): string {
  if (val === '재등록') return 'RE_REGISTER';
  return 'NEW';
}

function parseServiceTime(val: string): string {
  if (val === '2부후') return 'SECOND';
  return 'FIRST';
}

function parseBool(val: string): boolean {
  const v = val.toUpperCase();
  return v === 'Y' || v === 'O' || v === '예';
}

// 컬럼 순서: 가족대표이름, 유형, 예배, 이름, 관계, 성별, 생년월일, 연락처, 직분, 세례(Y/N), 이전교회, 주소, 바나바이름, 교회출석여부(Y/N)
function parseRow(cols: string[]): ParsedMember {
  return {
    familyHead: cols[0]?.trim() || '',
    type: parseType(cols[1]?.trim() || ''),
    serviceTime: parseServiceTime(cols[2]?.trim() || ''),
    name: cols[3]?.trim() || '',
    relation: cols[4]?.trim() || '',
    gender: cols[5]?.trim() || '',
    birthDate: cols[6]?.trim() || '',
    phone: cols[7]?.trim() || '',
    position: cols[8]?.trim() || '',
    baptized: parseBool(cols[9]?.trim() || ''),
    previousChurch: cols[10]?.trim() || '',
    address: cols[11]?.trim() || '',
    volunteerName: cols[12]?.trim() || '',
    attending: parseBool(cols[13]?.trim() || ''),
  };
}

export function parseTsvToMembers(tsvText: string): ParsedMember[] {
  const lines = tsvText.trim().split(/\r?\n/);
  return lines
    .map(line => parseRow(line.split('\t')))
    .filter(m => m.name);
}

// 가족대표이름이 같은 행을 한 가족으로 그룹핑
export function groupMembersIntoFamilies(text: string): ParsedMember[][] {
  const lines = text.trim().split(/\r?\n/);
  const familyMap = new Map<string, ParsedMember[]>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseRow(trimmed.split('\t'));
    if (!parsed.name || !parsed.familyHead) continue;

    const key = parsed.familyHead;
    if (!familyMap.has(key)) {
      familyMap.set(key, []);
    }
    familyMap.get(key)!.push(parsed);
  }

  return Array.from(familyMap.values());
}
