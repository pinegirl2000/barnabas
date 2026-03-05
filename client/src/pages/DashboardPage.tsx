import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Heart, Calendar, Grid3X3, UserPlus } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import { volunteerDisplayName } from '../lib/volunteerDisplay';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isUserOnly = user?.role === 'USER';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1">
        <Header title="대시보드" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="flex-1">
      <Header
        title="대시보드"
        subtitle=""
      />

      <div className="p-6 space-y-6">
        {/* 이번주 바나바일정 제목 */}
        <div className="text-lg font-bold text-gray-900">
          {(() => { const s = new Date(); const d = s.getDay(); s.setDate(s.getDate() + (d === 0 ? 0 : 7 - d)); return `${s.getFullYear()}년 ${s.getMonth() + 1}월${s.getDate()}일`; })()} 새가족부 일정
        </div>

        {/* 통계 카드 */}
        {(() => {
          const schedule = data?.weeklyVolunteerSchedule || [];
          const pastorVisitSessions = schedule.filter((s: any) => s.needsPastorVisit);
          const pvFirst = pastorVisitSessions.filter((s: any) => s.family.serviceTime === 'FIRST').length;
          const pvSecond = pastorVisitSessions.filter((s: any) => s.family.serviceTime !== 'FIRST').length;
          return (
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Calendar}
                label="바나바교육 예정"
                value={schedule.filter((s: any) =>
                  s.family.type === 'NEW' ? s.sessionNumber <= 6 : s.sessionNumber <= 2
                ).length}
                unit="건"
                color="text-pink-600 bg-pink-50"
                sub={`(보류중 : ${stats.onHoldFamilies || 0}건)`}
              />
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-purple-600 bg-purple-50">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 whitespace-nowrap mb-1">담임목사님 면담예정</p>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">1부후</span>
                      <span className="text-sm font-bold text-gray-900">{pvFirst}건</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">2부후</span>
                      <span className="text-sm font-bold text-gray-900">{pvSecond}건</span>
                    </div>
                  </div>
                </div>
              </div>
              <StatCard
                icon={CheckCircle}
                label="수료 예정"
                value={schedule.filter((s: any) => s.isGraduating).length}
                unit="건"
                color="text-blue-600 bg-blue-50"
                sub="🎁 선물준비"
              />
            </div>
          );
        })()}

        {/* 이번주 바나바 일정 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            {(() => {
              if (data?.thisSundayStr) {
                const [, m, d] = data.thisSundayStr.split('-');
                return `이번주 ${parseInt(m)}월${parseInt(d)}일 바나바 일정`;
              }
              return '이번주 바나바 일정';
            })()}
            {!isUserOnly && (
              <div className="ml-auto flex items-center gap-2">
                <Link
                  to="/families/new"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  새가족 등록
                </Link>
                <Link
                  to="/assignments"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  테이블 배정보기
                </Link>
              </div>
            )}
          </h3>
          {data?.weeklyVolunteerSchedule?.length > 0 ? (
            (() => {
              const serviceOrder = ['FIRST', 'SECOND', 'THIRD', 'BOTH'];
              const serviceLabels: Record<string, string> = { FIRST: '1부후', SECOND: '2부후', THIRD: '3부후', BOTH: '1·2부' };
              const sorted = [...data.weeklyVolunteerSchedule].sort((a: any, b: any) => {
                const ai = serviceOrder.indexOf(a.family.serviceTime || 'SECOND');
                const bi = serviceOrder.indexOf(b.family.serviceTime || 'SECOND');
                if (ai !== bi) return ai - bi;
                return (a.sessionNumber || 0) - (b.sessionNumber || 0);
              });

              // 그룹별로 분리
              const groups: { svc: string; items: any[] }[] = [];
              let currentGroup: { svc: string; items: any[] } | null = null;
              for (const s of sorted) {
                const svc = s.family.serviceTime || 'SECOND';
                if (!currentGroup || currentGroup.svc !== svc) {
                  currentGroup = { svc, items: [] };
                  groups.push(currentGroup);
                }
                currentGroup.items.push(s);
              }
              for (const g of groups) {
                g.items.sort((a: any, b: any) => (a.sessionNumber || 0) - (b.sessionNumber || 0));
              }

              const colCount = 5;

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-medium">새가족</th>
                        <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-medium">예정단계</th>
                        <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-medium w-32">진행</th>
                        <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-medium">바나바</th>
                        {!isUserOnly && <th className="text-center py-2.5 px-3 text-xs text-slate-500 font-medium w-16"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => {
                        const now = new Date();
                        let groupAdults = 0;
                        let groupChildren = 0;
                        for (const gi of group.items) {
                          for (const m of (gi.family.members || [])) {
                            if (!m.attending) continue;
                            if (m.birthDate) {
                              const [y, mo, d] = m.birthDate.split('-').map(Number);
                              const birth = new Date(y, mo - 1, d);
                              const age = now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
                              age <= 6 ? groupChildren++ : groupAdults++;
                            } else {
                              groupAdults++;
                            }
                          }
                        }
                        return [
                          <tr key={`group-${group.svc}`} className="bg-slate-50/80 border-b border-slate-200">
                            <td colSpan={colCount} className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                  group.svc === 'FIRST' ? 'bg-blue-500 text-white' :
                                  group.svc === 'SECOND' ? 'bg-blue-600 text-white' :
                                  'bg-blue-700 text-white'
                                }`}>
                                  {serviceLabels[group.svc]} ({group.items.length}가정)
                                </span>
                                <span className="text-[11px] text-gray-400">성인 {groupAdults}명 · 유아 {groupChildren}명</span>
                              </div>
                            </td>
                          </tr>,
                          ...group.items.map((s: any, gIdx: number) => {
                            const isMySchedule = user?.volunteerId && s.volunteerId === user.volunteerId;
                            return (
                            <tr key={s.sessionId} className={`border-b border-slate-100 ${isMySchedule ? 'bg-yellow-50 ring-1 ring-inset ring-yellow-300' : 'hover:bg-slate-50/50'}`}>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold shrink-0">{gIdx + 1}</span>
                                  {isUserOnly ? (
                                    <span className="text-slate-800 font-medium">
                                      {s.family.members?.map((m: any) => m.name).slice(0, 2).join(', ')}
                                      <span className="text-xs text-gray-400 font-normal ml-1">({s.family.members?.filter((m: any) => m.attending).length || 0}명)</span>
                                    </span>
                                  ) : (
                                    <Link to={`/families/${s.family.id}`} className="text-slate-800 hover:text-primary-600 hover:underline font-medium">
                                      {s.family.members?.map((m: any) => m.name).slice(0, 2).join(', ')}
                                      <span className="text-xs text-gray-400 font-normal ml-1">({s.family.members?.filter((m: any) => m.attending).length || 0}명)</span>
                                    </Link>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                    s.sessionType === 'EDUCATION' ? 'bg-blue-50 text-blue-600' :
                                    s.sessionType === 'PASTOR_VISIT' ? 'bg-purple-50 text-purple-600' :
                                    'bg-amber-50 text-amber-600'
                                  }`}>
                                    {`${s.sessionNumber}주차`}{(s.pastorVisit || s.needsPastorVisit) && ' · 담임목사님 면담'}
                                  </span>
                                  {s.isGraduating && (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-pink-100 text-pink-600">수료예정</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-0.5 flex-1 min-w-[50px]">
                                    {Array.from({ length: s.totalSessions }, (_, i) => (
                                      <div
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-sm ${
                                          i >= s.totalSessions - 2
                                            ? (i < s.completedCount ? 'bg-amber-400' : 'bg-amber-100')
                                            : (i < s.completedCount ? 'bg-emerald-400' : 'bg-slate-100')
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-slate-400 whitespace-nowrap">{s.completedCount}/{s.totalSessions}</span>
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 whitespace-nowrap ${isMySchedule ? 'text-yellow-700 font-bold' : 'text-slate-600'}`}>
                                {volunteerDisplayName(s.volunteer) || <span className="text-rose-400">미배정</span>}
                                {isMySchedule && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-800">나</span>}
                              </td>
                              {!isUserOnly && (
                                <td className="py-2.5 px-3 text-center">
                                  <Link
                                    to={`/families/${s.family.id}?editSession=${s.sessionId}`}
                                    className="text-xs px-2.5 py-1 text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-700 whitespace-nowrap transition-colors"
                                  >
                                    변경
                                  </Link>
                                </td>
                              )}
                            </tr>
                          );}),
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-gray-400">이번주 일정 없음</p>
          )}
        </div>

        {!isUserOnly && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 바나바 변경 필요 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  바나바 배정/변경 필요
                </h3>
                {data?.needsNewVolunteer?.length > 0 ? (
                  <ul className="space-y-2">
                    {data.needsNewVolunteer.map((s: any) => (
                      <li key={s.id}>
                        <Link to={`/families/${s.familyId}?editSession=${s.id}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium">
                              {s.family.members?.[0]?.name} 가족
                            </span>
                            <span className="text-xs text-gray-500 ml-2">{s.sessionNumber}회차</span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${s.needsNewVolunteer ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'}`}>
                            {s.needsNewVolunteer ? '변경요청' : '미배정'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">변경 요청 없음</p>
                )}
              </div>

              {/* 수료 대상 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  수료예정
                </h3>
                {data?.graduationCandidates?.length > 0 ? (
                  <ul className="space-y-2">
                    {data.graduationCandidates.map((f: any) => (
                      <li key={f.id}>
                        <Link to={`/families/${f.id}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">
                            {f.members.map((m: any) => m.name).slice(0, 2).join(', ')}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(f.registeredAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">수료 대상 없음</p>
                )}
              </div>
            </div>

            {/* 최근 등록 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">최근 등록 새가족</h3>
              {data?.recentFamilies?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">이름</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">등록일</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">유형</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentFamilies.map((f: any) => (
                        <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <Link to={`/families/${f.id}`} className="text-primary-600 hover:underline font-medium">
                              {f.members.map((m: any) => m.name).slice(0, 2).join(', ')}
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-gray-500">{formatDate(f.firstSessionDate || f.registeredAt)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${f.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                              {f.type === 'NEW' ? '신규' : '재등록'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(f.status)}`}>
                              {getStatusLabel(f.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">최근 등록된 가족이 없습니다</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, color, sub }: { icon: any; label: string; value: number; unit?: string; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 whitespace-nowrap">{label}</p>
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}<span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span></p>
          {sub && <p className="text-[10px] text-gray-400 leading-tight">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
