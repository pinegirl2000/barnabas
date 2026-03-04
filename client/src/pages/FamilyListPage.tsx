import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import Header from '../components/layout/Header';
import { useFamilies } from '../hooks/useFamilies';
import { formatDate, getStatusColor, getStatusLabel, getFamilyTypeLabel, getServiceTimeLabel } from '../lib/utils';

export default function FamilyListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params: Record<string, string> = { excludeCompleted: 'true' };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;

  const { families, loading } = useFamilies(params);

  return (
    <div className="flex-1">
      <Header
        title={<span>바나바교육 현황 <span className="text-primary-500 font-normal text-base ml-1">총 {families.length}가족</span></span>}
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

      <div className="p-6">
        {/* 필터 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <option value="">진행상태</option>
            <option value="ACTIVE">진행</option>
            <option value="ON_HOLD">보류</option>
            <option value="COMPLETED">수료</option>
          </select>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : families.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>등록된 새가족이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">가족이름</th>
                  <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">1주차 교육일</th>
                  <th className="text-center py-2.5 px-4 text-xs text-gray-500 font-medium">유형</th>
                  <th className="text-center py-2.5 px-4 text-xs text-gray-500 font-medium">예배</th>
                  <th className="text-center py-2.5 px-4 text-xs text-gray-500 font-medium">진행</th>
                  <th className="text-center py-2.5 px-4 text-xs text-gray-500 font-medium">상태</th>
                  <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">바나바</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family, idx) => (
                  <FamilyRow key={family.id} family={family} index={idx + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FamilyRow({ family, index }: { family: any; index: number }) {
  const members = family.members || [];
  const memberNames = members.length === 0 ? '이름 없음'
    : members.length === 1 ? members[0].name
    : members.slice(0, 2).map((m: any) => m.name).join(', ');
  const completedCount = family.sessions?.filter((s: any) => s.completed).length || 0;
  const totalSessions = family.sessions?.length || 0;
  const volunteer = family.sessions?.find((s: any) => s.volunteerId)?.volunteer;
  const firstSession = family.sessions?.find((s: any) => s.sessionNumber === 1);
  const registrationDate = firstSession?.date ? formatDate(firstSession.date) : formatDate(family.registeredAt);

  // 담임목사님 면담 필요 여부: 완료된 세션 중 pastorVisit=true인 것이 없으면 면담 필요
  const pastorVisitDone = family.sessions?.some((s: any) => s.completed && s.pastorVisit);
  // 아직 미완료 세션이 남아있고, 면담이 아직 안 됐으면 아이콘 표시
  const needsPastorVisit = !pastorVisitDone && completedCount > 0 && completedCount < totalSessions;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/families/${family.id}`}>
      <td className="py-2.5 px-4">
        <Link to={`/families/${family.id}`} className="flex items-center gap-2 text-primary-600 hover:underline font-medium">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-[10px] font-bold flex-shrink-0">{index}</span>
          {memberNames}
        </Link>
      </td>
      <td className="py-2.5 px-4 text-gray-500">{registrationDate}</td>
      <td className="py-2.5 px-4 text-center">
        <span className={`px-2 py-0.5 rounded-full text-xs ${family.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
          {getFamilyTypeLabel(family.type)}
        </span>
      </td>
      <td className="py-2.5 px-4 text-center text-gray-600">{getServiceTimeLabel(family.serviceTime)}</td>
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 flex-1 min-w-[50px]">
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
          {needsPastorVisit && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 whitespace-nowrap">면담</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-4 text-center">
        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(family.status)}`}>
          {getStatusLabel(family.status)}
        </span>
      </td>
      <td className="py-2.5 px-4 text-gray-600">{volunteer?.name || '-'}</td>
    </tr>
  );
}
