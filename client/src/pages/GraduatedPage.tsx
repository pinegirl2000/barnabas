import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Search } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { formatDate, getFamilyTypeLabel, getServiceTimeLabel } from '../lib/utils';
import { volunteerDisplayName } from '../lib/volunteerDisplay';

const YEARS = [2026, 2025];

export default function GraduatedPage() {
  const [year, setYear] = useState(2026);
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getGraduatedFamilies(String(year))
      .then(setFamilies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const filtered = useMemo(() => {
    if (!search.trim()) return families;
    const q = search.trim().toLowerCase();
    return families.filter(f =>
      f.members?.some((m: any) => m.name?.toLowerCase().includes(q))
    );
  }, [families, search]);

  return (
    <div className="flex-1">
      <Header
        title="바나바 수료완료 현황"
        subtitle={`${year}년 수료 ${filtered.length}가족`}
      />

      <div className="p-6 space-y-4">
        {/* 연도 탭 + 검색 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  year === y
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{search ? '검색 결과가 없습니다' : `${year}년 수료 가족이 없습니다`}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">번호</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">이름</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">유형</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">예배</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">수료일</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">바나바</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">전화심방</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, idx) => {
                  const volunteerName = volunteerDisplayName(f.sessions?.find((s: any) => s.volunteer)?.volunteer) || '-';
                  const phoneVisits: any[] = f.phoneVisits || [];

                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <Link to={`/families/${f.id}`} className="text-primary-600 hover:underline font-medium">
                          {f.members.map((m: any) => m.name).slice(0, 2).join(', ')}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          f.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {getFamilyTypeLabel(f.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{getServiceTimeLabel(f.serviceTime)}</td>
                      <td className="py-3 px-4 text-gray-500">{f.graduatedAt ? formatDate(f.graduatedAt) : '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{volunteerName}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {phoneVisits.length > 0 ? phoneVisits.map((pv: any) => (
                            <div key={pv.sessionNumber} className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">{pv.sessionNumber}주차</span>
                              <span className="text-xs text-gray-400">{pv.date ? formatDate(pv.date) : '미정'}</span>
                              {pv.completed ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">완료</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">예정</span>
                              )}
                            </div>
                          )) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
