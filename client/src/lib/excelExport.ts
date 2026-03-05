import * as XLSX from 'xlsx';
import { getServiceTimeLabel, getFamilyTypeLabel, getStatusLabel } from './utils';
import { familyDisplayNames } from './familyDisplayNames';

function fmtDate(d: string | Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function exportFamiliesToExcel(families: any[], viewMode: 'family' | 'individual') {
  let data: Record<string, any>[];
  let sheetName: string;

  if (viewMode === 'family') {
    sheetName = '가족별';
    data = families.map((f, idx) => ({
      '번호': idx + 1,
      '등록일자': fmtDate(f.firstSessionDate || f.registeredAt),
      '유형': getFamilyTypeLabel(f.type),
      '예배': getServiceTimeLabel(f.serviceTime),
      '가족이름': familyDisplayNames(f.members || []),
      '연락처': f.members?.[0]?.phone || '',
      '주소': f.address || '',
      '상태': getStatusLabel(f.status),
      '바나바': f.sessions?.find((s: any) => s.volunteer)?.volunteer?.name || '',
    }));
  } else {
    sheetName = '개인별';
    let counter = 0;
    data = families.flatMap((f: any) =>
      (f.members || []).map((m: any) => ({
        '번호': ++counter,
        '등록일자': fmtDate(f.firstSessionDate || f.registeredAt),
        '이름': m.name,
        '관계': m.relation || '',
        '성별': m.gender || '',
        '생년월일': m.birthDate || '',
        '연락처': m.phone || '',
        '직분': m.position || '',
        '세례': m.baptized ? 'Y' : 'N',
        '세례연도': m.baptismYear || '',
        '이전교회': m.previousChurch || '',
        '싱가폴거주': m.servingDepartment === '싱가폴거주' ? 'Y' : 'N',
        '메모': m.memo || '',
        '유형': getFamilyTypeLabel(f.type),
        '예배': getServiceTimeLabel(f.serviceTime),
        '상태': getStatusLabel(f.status),
      }))
    );
  }

  if (data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map(key => ({
    wch: Math.max(key.length * 2, ...data.map(row => String(row[key] || '').length).slice(0, 100)) + 2,
  }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `새가족조회_${sheetName}_${today}.xlsx`);
}
