import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';

export default function VolunteerSchedulePage() {
  const [data, setData] = useState<any>(null);
  const [assignData, setAssignData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.getVolunteerSchedule(),
      api.getAssignments(),
    ]).then(([schedule, assignments]) => {
      setData(schedule);
      setAssignData(assignments);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const sundayLabel = data?.sundayStr
    ? (() => {
        const [y, m, d] = data.sundayStr.split('-');
        return `${Number(m)}월 ${Number(d)}일`;
      })()
    : '';

  // 선택된 테이블의 가족 ID 목록
  const selectedFamilyIds = new Set<string>();
  if (selectedTable !== null && assignData?.tables) {
    const table = assignData.tables.find((t: any) => t.tableNumber === selectedTable);
    if (table) {
      for (const a of table.assignments || []) {
        if (a.family?.id) selectedFamilyIds.add(a.family.id);
      }
    }
  }

  const isHighlighted = (familyId: string) => selectedFamilyIds.size > 0 && selectedFamilyIds.has(familyId);
  const isDimmed = (familyId: string) => selectedFamilyIds.size > 0 && !selectedFamilyIds.has(familyId);

  const handleTableClick = (tableNum: number) => {
    setSelectedTable(prev => prev === tableNum ? null : tableNum);
  };

  return (
    <div className="flex-1">
      <Header title="바나바 일정보기" subtitle={sundayLabel ? `${sundayLabel} (주일)` : ''} />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 미니 테이블 배정도 */}
            {assignData?.tables && (
              <MiniTableStrip
                tables={assignData.tables}
                selectedTable={selectedTable}
                onTableClick={handleTableClick}
              />
            )}

            {/* 바나바별 일정 */}
            {data?.grouped?.map((group: any) => {
              const groupHighlighted = group.items.some((item: any) => isHighlighted(item.family.id));
              const groupDimmed = group.items.every((item: any) => isDimmed(item.family.id));

              return (
                <div
                  key={group.volunteer.id}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    groupHighlighted
                      ? 'bg-slate-800 border-slate-600'
                      : groupDimmed
                        ? 'bg-white border-gray-200 opacity-30'
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <User className={`w-4 h-4 ${groupHighlighted ? 'text-pink-300' : 'text-pink-500'}`} />
                    <h3 className={`font-semibold ${groupHighlighted ? 'text-white' : 'text-gray-900'}`}>{group.volunteer.name}</h3>
                    <span className={`text-xs ${groupHighlighted ? 'text-slate-400' : 'text-gray-400'}`}>({group.items.length}건)</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={groupHighlighted ? 'bg-slate-700 border-b border-slate-600' : 'bg-slate-50 border-b border-slate-200'}>
                        <th className={`text-left py-2 px-3 text-xs font-medium ${groupHighlighted ? 'text-slate-300' : 'text-slate-500'}`}>새가족</th>
                        <th className={`text-left py-2 px-3 text-xs font-medium ${groupHighlighted ? 'text-slate-300' : 'text-slate-500'}`}>예배</th>
                        <th className={`text-left py-2 px-3 text-xs font-medium ${groupHighlighted ? 'text-slate-300' : 'text-slate-500'}`}>유형</th>
                        <th className={`text-left py-2 px-3 text-xs font-medium ${groupHighlighted ? 'text-slate-300' : 'text-slate-500'}`}>진행</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item: any) => {
                        const serviceLabels: Record<string, string> = { FIRST: '1부', SECOND: '2부', THIRD: '3부', BOTH: '1·2부' };
                        const rowHighlighted = isHighlighted(item.family.id);
                        const rowDimmed = isDimmed(item.family.id);

                        return (
                          <tr
                            key={item.sessionId}
                            className={`transition-all duration-200 ${
                              rowHighlighted
                                ? 'bg-slate-700 border-b border-slate-600'
                                : rowDimmed && !groupHighlighted
                                  ? 'border-b border-slate-100'
                                  : groupHighlighted
                                    ? 'border-b border-slate-600 opacity-50'
                                    : 'border-b border-slate-100 hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <Link
                                to={`/families/${item.family.id}`}
                                className={`hover:underline font-medium ${
                                  rowHighlighted ? 'text-white hover:text-blue-300' : groupHighlighted ? 'text-slate-400' : 'text-slate-800 hover:text-primary-600'
                                }`}
                              >
                                {item.family.members?.map((m: any) => m.name).slice(0, 2).join(', ')}
                                <span className={`text-xs font-normal ml-1 ${rowHighlighted ? 'text-slate-400' : groupHighlighted ? 'text-slate-500' : 'text-gray-400'}`}>
                                  ({item.family.members?.filter((m: any) => m.attending).length || 0}명)
                                </span>
                              </Link>
                            </td>
                            <td className={`py-2 px-3 ${rowHighlighted ? 'text-slate-300' : groupHighlighted ? 'text-slate-500' : 'text-slate-600'}`}>
                              {serviceLabels[item.family.serviceTime] || '2부'}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                rowHighlighted
                                  ? (item.sessionType === 'EDUCATION' ? 'bg-blue-900 text-blue-300' :
                                     item.sessionType === 'PASTOR_VISIT' ? 'bg-purple-900 text-purple-300' :
                                     'bg-amber-900 text-amber-300')
                                  : (item.sessionType === 'EDUCATION' ? 'bg-blue-50 text-blue-600' :
                                     item.sessionType === 'PASTOR_VISIT' ? 'bg-purple-50 text-purple-600' :
                                     'bg-amber-50 text-amber-600')
                              }`}>
                                {item.sessionType === 'EDUCATION' ? `${item.sessionNumber}주차 교육` :
                                 item.sessionType === 'PASTOR_VISIT' ? '담임목사님 면담' : '연락심방'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5 flex-1 min-w-[50px]">
                                  {Array.from({ length: item.totalSessions }, (_, i) => (
                                    <div
                                      key={i}
                                      className={`h-1.5 flex-1 rounded-sm ${
                                        i >= item.totalSessions - 2
                                          ? (i < item.completedCount
                                              ? (rowHighlighted ? 'bg-amber-300' : 'bg-amber-400')
                                              : (rowHighlighted ? 'bg-amber-800' : 'bg-amber-100'))
                                          : (i < item.completedCount
                                              ? (rowHighlighted ? 'bg-emerald-300' : 'bg-emerald-400')
                                              : (rowHighlighted ? 'bg-slate-600' : 'bg-slate-100'))
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className={`text-xs whitespace-nowrap ${rowHighlighted ? 'text-slate-400' : 'text-slate-400'}`}>{item.completedCount}/{item.totalSessions}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* 미배정 */}
            {data?.unassigned?.length > 0 && (
              <div className={`rounded-xl border p-4 transition-all duration-200 ${
                selectedFamilyIds.size > 0 ? 'bg-white border-orange-200 opacity-30' : 'bg-white border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-orange-700">바나바 미배정</h3>
                  <span className="text-xs text-gray-400">({data.unassigned.length}건)</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orange-50 border-b border-orange-200">
                      <th className="text-left py-2 px-3 text-xs text-orange-500 font-medium">새가족</th>
                      <th className="text-left py-2 px-3 text-xs text-orange-500 font-medium">예배</th>
                      <th className="text-left py-2 px-3 text-xs text-orange-500 font-medium">유형</th>
                      <th className="text-left py-2 px-3 text-xs text-orange-500 font-medium">진행</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unassigned.map((item: any) => {
                      const serviceLabels: Record<string, string> = { FIRST: '1부', SECOND: '2부', THIRD: '3부', BOTH: '1·2부' };
                      return (
                        <tr key={item.sessionId} className="border-b border-orange-100 hover:bg-orange-50/50">
                          <td className="py-2 px-3">
                            <Link to={`/families/${item.family.id}`} className="text-slate-800 hover:text-primary-600 hover:underline font-medium">
                              {item.family.members?.map((m: any) => m.name).slice(0, 2).join(', ')}
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {serviceLabels[item.family.serviceTime] || '2부'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                              item.sessionType === 'EDUCATION' ? 'bg-blue-50 text-blue-600' :
                              item.sessionType === 'PASTOR_VISIT' ? 'bg-purple-50 text-purple-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {item.sessionType === 'EDUCATION' ? `${item.sessionNumber}주차 교육` :
                               item.sessionType === 'PASTOR_VISIT' ? '담임목사님 면담' : '연락심방'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-slate-400">{item.sessionNumber}/{item.totalSessions}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(!data?.grouped?.length && !data?.unassigned?.length) && (
              <div className="text-center py-12 text-gray-400">이번주 바나바 일정이 없습니다</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 미니 테이블 배정도 — 탭으로 1부후/2부후 전환 */
function MiniTableStrip({
  tables,
  selectedTable,
  onTableClick,
}: {
  tables: any[];
  selectedTable: number | null;
  onTableClick: (num: number) => void;
}) {
  const [serviceTab, setServiceTab] = useState<'FIRST' | 'SECOND'>('SECOND');

  const getFiltered = (tableNum: number, serviceFilter: 'FIRST' | 'SECOND') => {
    const table = tables.find((t: any) => t.tableNumber === tableNum);
    if (!table) return [];
    return (table.assignments || []).filter((a: any) => {
      const svc = a.family?.serviceTime;
      return svc === serviceFilter || svc === 'BOTH';
    });
  };

  const zoneColors = {
    inner: { bg: 'bg-blue-50', border: 'border-blue-200', selected: 'bg-blue-700 border-blue-800', label: 'text-blue-600' },
    outer: { bg: 'bg-emerald-50', border: 'border-emerald-200', selected: 'bg-emerald-700 border-emerald-800', label: 'text-emerald-600' },
    hall: { bg: 'bg-purple-50', border: 'border-purple-200', selected: 'bg-purple-700 border-purple-800', label: 'text-purple-600' },
  };

  const renderColumn = (tableNums: number[], zone: 'inner' | 'outer' | 'hall', label: string) => (
    <div className="space-y-1.5">
      <div className={`text-[10px] font-semibold text-center ${zoneColors[zone].label}`}>{label}</div>
      {tableNums.map(num => {
        const assignments = getFiltered(num, serviceTab);
        const isSelected = selectedTable === num;
        const colors = zoneColors[zone];
        const attendCount = assignments.reduce(
          (sum: number, a: any) => sum + (a.family?.members?.filter((m: any) => m.attending).length || 0), 0
        );
        const hasAssignments = assignments.length > 0;

        return (
          <button
            key={num}
            onClick={() => onTableClick(num)}
            className={`w-full rounded-lg border text-left cursor-pointer transition-all duration-150 ${
              isSelected
                ? `${colors.selected} text-white shadow-md`
                : hasAssignments
                  ? `${colors.bg} ${colors.border}`
                  : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`flex items-center justify-between px-2 py-1 ${hasAssignments && !isSelected ? 'border-b ' + colors.border : ''}`}>
              <span className={`text-xs font-bold ${isSelected ? 'text-white' : colors.label}`}>T{num}</span>
              <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{attendCount}명</span>
            </div>
            {hasAssignments ? (
              <div className="px-2 py-1 space-y-0.5">
                {assignments.map((a: any, i: number) => {
                  const names = a.family?.members?.map((m: any) => m.name).slice(0, 2).join(', ') || '가족';
                  const vol = a.volunteer?.name;
                  return (
                    <div key={i}>
                      <div className={`text-[10px] font-medium truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>{names}</div>
                      {vol && <div className={`text-[9px] truncate ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>바나바: {vol}</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`px-2 py-1.5 text-center text-[10px] ${isSelected ? 'text-white/50' : 'text-gray-300'}`}>빈 테이블</div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mb-2">
      <div className="flex gap-1 mb-1.5">
        {(['FIRST', 'SECOND'] as const).map(svc => (
          <button
            key={svc}
            onClick={() => setServiceTab(svc)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              serviceTab === svc
                ? 'bg-slate-700 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {svc === 'FIRST' ? '1부후' : '2부후'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {renderColumn([1, 2, 3], 'inner', '안쪽')}
        {renderColumn([4, 5, 6], 'outer', '바깥쪽')}
        {renderColumn([7, 8], 'hall', '오병이어홀')}
      </div>
    </div>
  );
}
