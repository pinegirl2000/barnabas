import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Users, User, Search, X } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { formatDate, getFamilyTypeLabel, getServiceTimeLabel, getStatusLabel, getStatusColor } from '../lib/utils';
import { exportFamiliesToExcel } from '../lib/excelExport';
import { groupMembersIntoFamilies, type ParsedMember } from '../lib/excelPaste';
import { familyDisplayNames } from '../lib/familyDisplayNames';
import PhotoThumbnail from '../components/PhotoThumbnail';
import { volunteerDisplayName } from '../lib/volunteerDisplay';

export default function FamilySearchPage() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [fromYear, setFromYear] = useState(currentYear);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(currentYear);
  const [toMonth, setToMonth] = useState(currentMonth);
  const [viewMode, setViewMode] = useState<'family' | 'individual'>('family');
  const [search, setSearch] = useState('');
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasteModal, setShowPasteModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    const lastDay = new Date(toYear, toMonth, 0).getDate();
    const params: Record<string, string> = {
      fromDate: `${fromYear}-${String(fromMonth).padStart(2, '0')}-01`,
      toDate: `${toYear}-${String(toMonth).padStart(2, '0')}-${lastDay}`,
    };
    api.searchFamilies(params)
      .then(setFamilies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromYear, fromMonth, toYear, toMonth]);

  const filtered = useMemo(() => {
    if (!search.trim()) return families;
    const q = search.trim().toLowerCase();
    return families.filter((f: any) =>
      f.members?.some((m: any) => m.name?.toLowerCase().includes(q))
    );
  }, [families, search]);

  const individualRows = useMemo(() => {
    return filtered.flatMap((f: any) =>
      (f.members || []).map((m: any) => ({ ...m, _family: f }))
    );
  }, [filtered]);

  const getVolunteerName = (f: any) => {
    const s = f.sessions?.find((s: any) => s.volunteer);
    return volunteerDisplayName(s?.volunteer) || '';
  };

  const getFirstSessionDate = (f: any) => {
    return f.firstSessionDate || f.registeredAt;
  };

  return (
    <div className="flex-1">
      <Header
        title={<span>새가족 조회 <span className="text-primary-500 font-normal text-base ml-1">총 {filtered.length}가정{viewMode === 'individual' ? ` (${individualRows.length}명)` : ''}</span></span>}
      />

      <div className="p-6 space-y-4">
        {/* 필터 바 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">등록일자 검색</span>
            {/* 시작 년월 */}
            <div className="flex items-center gap-1">
              <select
                value={fromYear}
                onChange={e => setFromYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={fromMonth}
                onChange={e => setFromMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>

            <span className="text-gray-400 text-sm">~</span>

            {/* 종료 년월 */}
            <div className="flex items-center gap-1">
              <select
                value={toYear}
                onChange={e => setToYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={toMonth}
                onChange={e => setToMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>

            {/* 가족별/개인별 토글 */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('family')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'family' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" /> 가족별
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'individual' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" /> 개인별
              </button>
            </div>

            {/* 이름 검색 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="이름 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 엑셀 내보내기 */}
            <button
              onClick={() => exportFamiliesToExcel(filtered, viewMode)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
            >
              <Download className="w-4 h-4" /> Excel다운
            </button>

            {/* 엑셀 붙여넣기로 한꺼번에 등록 */}
            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <Upload className="w-4 h-4" /> 붙여넣기로 한꺼번에 등록
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : viewMode === 'family' ? (
            <FamilyTable families={filtered} getVolunteerName={getVolunteerName} getFirstSessionDate={getFirstSessionDate} onRowClick={id => navigate(`/families/${id}`)} />
          ) : (
            <IndividualTable rows={individualRows} getFirstSessionDate={getFirstSessionDate} onRowClick={id => navigate(`/families/${id}`)} />
          )}
        </div>
      </div>

      {/* 붙여넣기 모달 */}
      {showPasteModal && (
        <PasteModal
          onClose={() => setShowPasteModal(false)}
          onSuccess={() => {
            setShowPasteModal(false);
            setLoading(true);
            const lastDay = new Date(toYear, toMonth, 0).getDate();
            const params: Record<string, string> = {
              fromDate: `${fromYear}-${String(fromMonth).padStart(2, '0')}-01`,
              toDate: `${toYear}-${String(toMonth).padStart(2, '0')}-${lastDay}`,
            };
            api.searchFamilies(params).then(setFamilies).finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}

/* ── 가족별 테이블 ── */
function FamilyTable({ families, getVolunteerName, getFirstSessionDate, onRowClick }: {
  families: any[];
  getVolunteerName: (f: any) => string;
  getFirstSessionDate: (f: any) => any;
  onRowClick: (id: string) => void;
}) {
  if (families.length === 0) return <div className="p-8 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-10">#</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-24">등록일자</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">유형</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">예배</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium">가족이름</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-28">연락처</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium">주소</th>
          <th className="py-2.5 px-3 text-center text-xs text-gray-500 font-medium w-16">상태</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-20">바나바</th>
        </tr>
      </thead>
      <tbody>
        {families.map((f, idx) => (
          <tr key={f.id} onClick={() => onRowClick(f.id)} className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer">
            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
            <td className="py-2 px-3 text-gray-600">{formatDate(getFirstSessionDate(f))}</td>
            <td className="py-2 px-3">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${f.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                {getFamilyTypeLabel(f.type)}
              </span>
            </td>
            <td className="py-2 px-3 text-gray-600 text-xs">{getServiceTimeLabel(f.serviceTime)}</td>
            <td className="py-2 px-3 font-medium text-gray-900">
              <div className="flex items-center gap-1.5">
                <PhotoThumbnail thumbnail={f.photoThumbnail} fullPhoto={f.photoUrl} />
                {familyDisplayNames(f.members || [])}
              </div>
            </td>
            <td className="py-2 px-3 text-gray-500 text-xs">{f.members?.[0]?.phone || ''}</td>
            <td className="py-2 px-3 text-gray-500 text-xs truncate max-w-[200px]">{f.address || ''}</td>
            <td className="py-2 px-3 text-center">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(f.status)}`}>
                {getStatusLabel(f.status)}
              </span>
            </td>
            <td className="py-2 px-3 text-gray-600 text-xs">{getVolunteerName(f)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── 개인별 테이블 ── */
function IndividualTable({ rows, getFirstSessionDate, onRowClick }: {
  rows: any[];
  getFirstSessionDate: (f: any) => any;
  onRowClick: (id: string) => void;
}) {
  if (rows.length === 0) return <div className="p-8 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-10">#</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-24">등록일자</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium">이름</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">관계</th>
          <th className="py-2.5 px-3 text-center text-xs text-gray-500 font-medium w-12">성별</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-24">생년월일</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-28">연락처</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">직분</th>
          <th className="py-2.5 px-3 text-center text-xs text-gray-500 font-medium w-12">세례</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium">이전교회</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">유형</th>
          <th className="py-2.5 px-3 text-left text-xs text-gray-500 font-medium w-16">예배</th>
          <th className="py-2.5 px-3 text-center text-xs text-gray-500 font-medium w-16">상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m, idx) => (
          <tr key={`${m._family.id}-${m.id}`} onClick={() => onRowClick(m._family.id)} className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer">
            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
            <td className="py-2 px-3 text-gray-600">{formatDate(getFirstSessionDate(m._family))}</td>
            <td className="py-2 px-3 font-medium text-gray-900">{m.name}</td>
            <td className="py-2 px-3 text-gray-500">{m.relation || ''}</td>
            <td className="py-2 px-3 text-center text-gray-500">{m.gender || ''}</td>
            <td className="py-2 px-3 text-gray-500 text-xs">{m.birthDate || ''}</td>
            <td className="py-2 px-3 text-gray-500 text-xs">{m.phone || ''}</td>
            <td className="py-2 px-3 text-gray-500 text-xs">{m.position || ''}</td>
            <td className="py-2 px-3 text-center">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m.baptized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {m.baptized ? 'Y' : 'N'}
              </span>
            </td>
            <td className="py-2 px-3 text-gray-500 text-xs">{m.previousChurch || ''}</td>
            <td className="py-2 px-3">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m._family.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                {getFamilyTypeLabel(m._family.type)}
              </span>
            </td>
            <td className="py-2 px-3 text-gray-500 text-xs">{getServiceTimeLabel(m._family.serviceTime)}</td>
            <td className="py-2 px-3 text-center">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(m._family.status)}`}>
                {getStatusLabel(m._family.status)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── 엑셀 붙여넣기 모달 ── */
function PasteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedMember[][] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePreview = () => {
    const groups = groupMembersIntoFamilies(text);
    if (groups.length === 0) {
      alert('붙여넣기 데이터가 없습니다.');
      return;
    }
    setPreview(groups);
  };

  const handleSubmit = async () => {
    if (!preview || preview.length === 0) return;
    setSubmitting(true);
    try {
      for (const members of preview) {
        const isSingle = members.length === 1;
        const familyType = members[0]?.type || 'NEW';
        const familyServiceTime = members[0]?.serviceTime || 'FIRST';
        const familyAddress = members[0]?.address || null;
        await api.createFamily({
          type: familyType,
          serviceTime: familyServiceTime,
          address: familyAddress,
          members: members.map((m, i) => ({
            name: m.name,
            relation: isSingle ? '본인' : (m.relation || (i === 0 ? '본인' : '')),
            gender: m.gender || null,
            birthDate: m.birthDate || null,
            phone: m.phone || null,
            position: m.position || null,
            isSingle,
            attending: m.attending,
            baptized: m.baptized,
            previousChurch: m.previousChurch || null,
          })),
        });
      }
      alert(`${preview.length}가족 등록 완료`);
      onSuccess();
    } catch (err: any) {
      alert(err.message || '등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold">엑셀 붙여넣기로 한꺼번에 등록</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 안내 텍스트 */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>컬럼 순서: 가족대표이름, 유형(신규/재등록), 예배(1부후/2부후), 이름, 관계, 성별, 생년월일, 연락처, 직분, 세례(Y/N), 이전교회, 주소, 바나바이름, 교회출석여부(Y/N)</p>
            <p>* 가족대표이름이 같은 행은 한 가족으로 등록됩니다</p>
          </div>

          {/* 텍스트 영역 */}
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setPreview(null); }}
            placeholder={'Excel에서 복사한 내용을 여기에 붙여넣으세요 (Ctrl+V)\n\n예시:\n로미오\t신규\t2부후\t로미오\t남편\t남\t01/01/1990\t98889999\t새신자\tN\t00교회\tBukit Panjang\t바나바\tN\n로미오\t신규\t2부후\t줄리엣\t부인\t여\t01/01/1991\t98889999\t새신자\tN\t00교회\tBukit Panjang\t바나바\tY\n로미오\t신규\t2부후\t베이비\t딸\t여\t01/01/2023\t98889999\t새신자\tN\t00교회\tBukit Panjang\t바나바\tN'}
            className="w-full h-40 border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-mono resize-y"
          />

          {/* 미리보기 버튼 */}
          {!preview && (
            <button
              onClick={handlePreview}
              disabled={!text.trim()}
              className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              미리보기
            </button>
          )}

          {/* 미리보기 테이블 */}
          {preview && preview.map((members, fi) => (
            <div key={fi} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                가족 {fi + 1}: {members[0]?.familyHead} ({members.length}명)
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-1.5 px-2 text-left text-gray-400">유형</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">예배</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">이름</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">관계</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">성별</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">생년월일</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">연락처</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">직분</th>
                    <th className="py-1.5 px-2 text-center text-gray-400">세례</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">이전교회</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">주소</th>
                    <th className="py-1.5 px-2 text-left text-gray-400">바나바</th>
                    <th className="py-1.5 px-2 text-center text-gray-400">출석</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, mi) => (
                    <tr key={mi} className="border-b border-gray-50">
                      <td className="py-1.5 px-2">{m.type === 'RE_REGISTER' ? '재등록' : '신규'}</td>
                      <td className="py-1.5 px-2">{m.serviceTime === 'SECOND' ? '2부후' : '1부후'}</td>
                      <td className="py-1.5 px-2 font-medium">{m.name}</td>
                      <td className="py-1.5 px-2">{m.relation}</td>
                      <td className="py-1.5 px-2">{m.gender}</td>
                      <td className="py-1.5 px-2">{m.birthDate}</td>
                      <td className="py-1.5 px-2">{m.phone}</td>
                      <td className="py-1.5 px-2">{m.position}</td>
                      <td className="py-1.5 px-2 text-center">{m.baptized ? 'Y' : 'N'}</td>
                      <td className="py-1.5 px-2">{m.previousChurch}</td>
                      <td className="py-1.5 px-2">{m.address}</td>
                      <td className="py-1.5 px-2">{m.volunteerName}</td>
                      <td className="py-1.5 px-2 text-center">{m.attending ? 'Y' : 'N'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* 등록 버튼 */}
          {preview && (
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '등록 중...' : `${preview.length}가족 등록`}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                수정
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
