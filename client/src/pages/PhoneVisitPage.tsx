import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Search } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { formatDate, getFamilyTypeLabel, getServiceTimeLabel } from '../lib/utils';
import { volunteerDisplayName } from '../lib/volunteerDisplay';
import { familyDisplayNames } from '../lib/familyDisplayNames';

export default function PhoneVisitPage() {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getPhoneVisitFamilies()
      .then(setFamilies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        title="전화심방 예정"
        subtitle={`총 ${filtered.length}가족`}
      />

      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center justify-end">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{search ? '검색 결과가 없습니다' : '전화심방 예정 가족이 없습니다'}</p>
          </div>
        ) : (
          <>
          {/* 모바일 카드 뷰 */}
          <div className="sm:hidden space-y-3">
            {filtered.map(f => {
              const phoneNums = f.type === 'RE_REGISTER' ? [3, 4] : [7, 8];
              const phoneSessions = f.sessions?.filter((s: any) => phoneNums.includes(s.sessionNumber)) || [];
              const vol = phoneSessions.find((s: any) => s.volunteer)?.volunteer
                || f.sessions?.find((s: any) => s.volunteer)?.volunteer;
              const volunteerName = volunteerDisplayName(vol) || '-';
              const memberNames = familyDisplayNames(f.members || []);

              const projectedDates: Record<number, string> = {};
              let prevDate: Date | null = null;
              for (const s of (f.sessions || [])) {
                if (s.date) {
                  prevDate = new Date(s.date);
                } else if (prevDate) {
                  const isPhoneGap = f.type === 'RE_REGISTER' ? s.sessionNumber >= 3 : s.sessionNumber >= 7;
                  const weeks = isPhoneGap ? 4 : 1;
                  prevDate = new Date(prevDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
                }
                if (prevDate && phoneNums.includes(s.sessionNumber)) {
                  projectedDates[s.sessionNumber] = prevDate.toISOString().split('T')[0];
                }
              }

              return (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <Link to={`/families/${f.id}`} className="text-sm text-primary-600 font-medium truncate">{memberNames}</Link>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] shrink-0 ${f.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{getFamilyTypeLabel(f.type)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1.5">바나바: {volunteerName}</div>
                  <div className="flex flex-wrap gap-1">
                    {phoneSessions.map((s: any) => (
                      <span key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.completed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {s.sessionNumber}회차 {s.completed ? '완료' : (s.date ? formatDate(s.date) : projectedDates[s.sessionNumber] ? formatDate(projectedDates[s.sessionNumber]) : '예정')}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium">바나바</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium">가족이름</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium">유형</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium">예배</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium">전화심방 진행</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const phoneNums = f.type === 'RE_REGISTER' ? [3, 4] : [7, 8];
                  const phoneSessions = f.sessions?.filter((s: any) => phoneNums.includes(s.sessionNumber)) || [];
                  const vol = phoneSessions.find((s: any) => s.volunteer)?.volunteer
                    || f.sessions?.find((s: any) => s.volunteer)?.volunteer;
                  const volunteerName = volunteerDisplayName(vol) || '-';
                  const memberNames = f.members?.length <= 1
                    ? (f.members?.[0]?.name || '이름 없음')
                    : f.members.slice(0, 2).map((m: any) => m.name).join(', ');

                  // 예정 날짜 계산 (DB에 date가 없을 때 이전 세션 기반으로 추정)
                  const projectedDates: Record<number, string> = {};
                  let prevDate: Date | null = null;
                  for (const s of (f.sessions || [])) {
                    if (s.date) {
                      prevDate = new Date(s.date);
                    } else if (prevDate) {
                      const isPhoneGap = f.type === 'RE_REGISTER' ? s.sessionNumber >= 3 : s.sessionNumber >= 7;
                      const weeks = isPhoneGap ? 4 : 1;
                      prevDate = new Date(prevDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
                    }
                    if (prevDate && phoneNums.includes(s.sessionNumber)) {
                      projectedDates[s.sessionNumber] = prevDate.toISOString().split('T')[0];
                    }
                  }

                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{volunteerName}</td>
                      <td className="py-3 px-4">
                        <Link to={`/families/${f.id}`} className="text-primary-600 hover:underline font-medium">
                          {memberNames}
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {phoneSessions.map((s: any) => (
                            <span
                              key={s.id}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                s.completed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {s.sessionNumber}회차 {s.completed ? '완료' : (s.date ? formatDate(s.date) : projectedDates[s.sessionNumber] ? formatDate(projectedDates[s.sessionNumber]) : '예정')}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
