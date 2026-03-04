import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { getFamilyTypeLabel, getServiceTimeLabel, getStatusColor, getStatusLabel } from '../lib/utils';

function getMonthRange(monthsBack: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  return {
    fromStr: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`,
    toStr: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`,
    fromMonth: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
    toMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  };
}

function monthToDateRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${y}년 ${m}월`;
}

function formatDayLabel(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일`;
}

export default function RegistrationHistoryPage() {
  const defaultRange = getMonthRange(3);
  const [fromMonth, setFromMonth] = useState(defaultRange.fromMonth);
  const [toMonth, setToMonth] = useState(defaultRange.toMonth);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const { from } = monthToDateRange(fromMonth);
    const { to } = monthToDateRange(toMonth);
    api.getRegistrationHistory(from, to)
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromMonth, toMonth]);

  // 월별 그룹핑
  const monthlyGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? groups
          .map(g => ({
            ...g,
            families: g.families.filter((f: any) =>
              f.members?.some((m: any) => m.name?.toLowerCase().includes(q))
            ),
          }))
          .filter(g => g.families.length > 0)
      : groups;

    const byMonth: Record<string, { date: string; families: any[] }[]> = {};
    for (const g of filtered) {
      const ym = g.date.substring(0, 7); // YYYY-MM
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push(g);
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, dateGroups]) => ({
        month,
        dateGroups,
        totalFamilies: dateGroups.reduce((sum, g) => sum + g.families.length, 0),
      }));
  }, [groups, search]);

  const totalCount = monthlyGroups.reduce((sum, mg) => sum + mg.totalFamilies, 0);

  return (
    <div className="flex-1">
      <Header
        title="새가족 등록 현황"
        subtitle={`총 ${totalCount}가족`}
        actions={
          <Link
            to="/families/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            새가족 등록
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* 날짜 범위 + 검색 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFromMonth(shiftMonth(fromMonth, -1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="month"
            value={fromMonth}
            onChange={e => setFromMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-400 text-sm">~</span>
          <input
            type="month"
            value={toMonth}
            onChange={e => setToMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button onClick={() => setToMonth(shiftMonth(toMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : monthlyGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">
              {search ? '검색 결과가 없습니다' : '해당 기간에 등록된 가족이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {monthlyGroups.map(mg => (
              <div key={mg.month}>
                {/* 월 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-bold text-gray-800">{formatMonthLabel(mg.month)}</h2>
                  <span className="text-sm text-gray-400">({mg.totalFamilies}건)</span>
                </div>

                {/* 날짜별 테이블 */}
                <div className="space-y-3">
                  {mg.dateGroups.map(group => (
                    <div key={group.date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-600">
                          {formatDayLabel(group.date)}
                          <span className="ml-2 text-gray-400 font-normal">({group.families.length}건)</span>
                        </h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">이름</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">유형</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">예배</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">바나바</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">상태</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">진행</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.families.map((f: any) => {
                            const volunteerName = f.sessions?.find((s: any) => s.volunteer)?.volunteer?.name || '-';
                            const completedCount = f.sessions?.filter((s: any) => s.completed).length || 0;
                            const totalSessions = f.sessions?.length || 0;

                            return (
                              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-2.5 px-4">
                                  <Link to={`/families/${f.id}`} className="text-primary-600 hover:underline font-medium">
                                    {f.members?.map((m: any) => m.name).slice(0, 2).join(', ')}
                                  </Link>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    f.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {getFamilyTypeLabel(f.type)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-gray-500">{getServiceTimeLabel(f.serviceTime)}</td>
                                <td className="py-2.5 px-4 text-gray-500">{volunteerName}</td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(f.status)}`}>
                                    {getStatusLabel(f.status)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5 flex-1 min-w-[40px]">
                                      {Array.from({ length: totalSessions }, (_, i) => (
                                        <div
                                          key={i}
                                          className={`h-1.5 flex-1 rounded-sm ${
                                            i >= totalSessions - 2
                                              ? (i < completedCount ? 'bg-amber-400' : 'bg-amber-100')
                                              : (i < completedCount ? 'bg-emerald-400' : 'bg-gray-100')
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{completedCount}/{totalSessions}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
