import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Grid3X3, Zap, ChevronLeft, ChevronRight, Crown, Gift } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { volunteerDisplayName } from '../lib/volunteerDisplay';

export default function TableAssignmentPage() {
  const { isFamilyTeam } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getSunday(new Date()));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<'FIRST' | 'SECOND'>('SECOND');

  const weekDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const result = await api.getAssignments(weekDateStr);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignments(); }, [weekStart]);

  const handleAutoAssign = async () => {
    try {
      const result = await api.autoAssign(weekDateStr);
      setWarnings(result.warnings || []);
      await fetchAssignments();
    } catch (err: any) {
      alert(err.message || '자동 배정 실패');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const assignmentId = active.id as string;
    const targetTableId = over.id as string;

    try {
      await api.updateAssignment(assignmentId, { tableId: targetTableId });
      await fetchAssignments();
    } catch (err: any) {
      alert(err.message || '이동 실패');
    }
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setWeekStart(newDate);
  };

  const weekLabel = weekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' 주';

  return (
    <div className="flex-1">
      <Header
        title="테이블 배정현황"
        subtitle={weekLabel}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button onClick={() => changeWeek(-1)} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs sm:text-sm font-medium px-1 sm:px-2">{weekLabel}</span>
              <button onClick={() => changeWeek(1)} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isFamilyTeam && (
              <button
                onClick={handleAutoAssign}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs sm:text-sm font-medium"
              >
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                자동 배정
              </button>
            )}
          </div>
        }
      />

      <div className="p-3 sm:p-6">
        {/* 1부/2부 탭 */}
        <div className="flex gap-1 mb-4">
          {[
            { key: 'FIRST' as const, label: '1부' },
            { key: 'SECOND' as const, label: '2부' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setServiceFilter(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                serviceFilter === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 경고 */}
        {warnings.length > 0 && (
          <div className="mb-4 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3">
                {w}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {/* PC: 3열 그리드 */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              <h3 className="text-sm font-semibold text-blue-700 text-center bg-blue-50 py-1.5 rounded-lg">새가족실 안쪽</h3>
              <h3 className="text-sm font-semibold text-emerald-700 text-center bg-emerald-50 py-1.5 rounded-lg">새가족실 바깥쪽</h3>
              <h3 className="text-sm font-semibold text-purple-700 text-center bg-purple-50 py-1.5 rounded-lg">오병이어홀</h3>
              {[[1,'blue'],[4,'emerald'],[7,'purple']].map(([num, zone]) => {
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
              {[[2,'blue'],[5,'emerald'],[8,'purple']].map(([num, zone]) => {
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
              {[[3,'blue'],[6,'emerald'],[0,'purple']].map(([num, zone]) => {
                if (num === 0) return <div key="empty-placeholder" />;
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
            </div>

            {/* 모바일: 새가족실 2열 + 오병이어홀 아래 */}
            <div className="md:hidden space-y-4">
              {/* 새가족실 안쪽 & 바깥쪽 */}
              <div className="grid grid-cols-2 gap-2">
                <h3 className="text-sm font-semibold text-blue-700 text-center bg-blue-50 py-1.5 rounded-lg">새가족실 안쪽</h3>
                <h3 className="text-sm font-semibold text-emerald-700 text-center bg-emerald-50 py-1.5 rounded-lg">새가족실 바깥쪽</h3>
                {[1,2,3].map(num => {
                  const table = data?.tables?.find((t: any) => t.tableNumber === num);
                  return table ? <TableSlot key={table.id} table={table} zone="blue" serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
                })}
                {[4,5,6].map(num => {
                  const table = data?.tables?.find((t: any) => t.tableNumber === num);
                  return table ? <TableSlot key={table.id} table={table} zone="emerald" serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
                })}
              </div>
              {/* 오병이어홀 */}
              <div>
                <h3 className="text-sm font-semibold text-purple-700 text-center bg-purple-50 py-1.5 rounded-lg mb-2">오병이어홀</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[7,8].map(num => {
                    const table = data?.tables?.find((t: any) => t.tableNumber === num);
                    return table ? <TableSlot key={table.id} table={table} zone="purple" serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
                  })}
                </div>
              </div>
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}

const zoneStyles = {
  blue: {
    border: 'border-blue-200', bg: 'bg-blue-50/30', header: 'text-blue-800',
    activeBorder: 'border-blue-400', activeBg: 'bg-blue-100', activeHeader: 'text-blue-700',
  },
  emerald: {
    border: 'border-emerald-200', bg: 'bg-emerald-50/30', header: 'text-emerald-800',
    activeBorder: 'border-emerald-400', activeBg: 'bg-emerald-100', activeHeader: 'text-emerald-700',
  },
  purple: {
    border: 'border-purple-200', bg: 'bg-purple-50/30', header: 'text-purple-800',
    activeBorder: 'border-purple-400', activeBg: 'bg-purple-100', activeHeader: 'text-purple-700',
  },
};

function TableSlot({ table, zone, serviceFilter }: { table: any; zone: 'blue' | 'emerald' | 'purple'; serviceFilter: 'FIRST' | 'SECOND' }) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const filteredAssignments = (table.assignments || []).filter((a: any) => {
    const svc = a.family?.serviceTime;
    return svc === serviceFilter || svc === 'BOTH';
  });
  const attendeeCount = filteredAssignments.reduce(
    (sum: number, a: any) => sum + (a.family?.members?.filter((m: any) => m.attending).length || 0), 0
  );
  const isFull = attendeeCount >= table.capacity;
  const hasAssignments = filteredAssignments.length > 0;
  const styles = zoneStyles[zone];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-2 min-h-[60px] transition-colors ${
        isOver ? 'border-primary-400 bg-primary-50' :
        isFull ? 'border-red-200 bg-white' :
        hasAssignments ? `${styles.activeBorder} ${styles.activeBg}` :
        `${styles.border} ${styles.bg}`
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-semibold ${hasAssignments && !isOver ? styles.activeHeader : styles.header}`}>테이블 {table.tableNumber}</h4>
        <span className="text-xs text-gray-500">새가족 참석 : {attendeeCount}명</span>
      </div>

      <div className="space-y-2">
        {filteredAssignments.map((assignment: any) => (
          <DraggableCard key={assignment.id} assignment={assignment} inverted={hasAssignments} />
        ))}
        {filteredAssignments.length === 0 && (
          <div className="text-center py-1.5 text-gray-300 text-sm">
            빈 테이블
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ assignment, inverted }: { assignment: any; inverted?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  const memberNames = assignment.family?.members?.filter((m: any) => m.attending).map((m: any) => m.name).join(', ') || '가족';
  const nextSession = assignment.family?.sessions?.find((s: any) => !s.completed);
  const isPastorVisit = nextSession?.type === 'PASTOR_VISIT' || nextSession?.pastorVisit;
  const pastorLabel = isPastorVisit
    ? (assignment.family?.type === 'RE_REGISTER'
      ? (nextSession.sessionNumber === 1 ? '부목사님 면담' : '담임목사님 면담')
      : '담임목사님 면담')
    : null;
  const isGiftSession = nextSession && (
    (assignment.family?.type === 'NEW' && nextSession.sessionNumber === 6) ||
    (assignment.family?.type === 'RE_REGISTER' && nextSession.sessionNumber === 2)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg p-2 cursor-grab active:cursor-grabbing border ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } bg-white border-gray-200 shadow-sm`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span
          className="text-sm font-medium text-gray-900 hover:text-primary-600 hover:underline"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); window.location.href = `/families/${assignment.family.id}`; }}
        >{memberNames}</span>
        {nextSession && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
            {nextSession.sessionNumber}주차
          </span>
        )}
        {isPastorVisit && (
          <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
        )}
        {isGiftSession && (
          <Gift className="w-4 h-4 text-pink-500 flex-shrink-0" />
        )}
      </div>
      {pastorLabel && (
        <div className="text-xs mt-0.5 text-purple-600 text-center">{pastorLabel}</div>
      )}
      {isGiftSession && (
        <div className="text-xs mt-0.5 text-pink-600 text-center">선물준비</div>
      )}
      {(() => {
        const sessions = assignment.family?.sessions || [];
        const completedWithVol = sessions.filter((s: any) => s.completed && s.volunteerId);
        const sessionVol = nextSession?.volunteer
          || (completedWithVol.length > 0 ? completedWithVol[completedWithVol.length - 1].volunteer : null);
        return (
          <div className="text-xs mt-1 text-gray-500 text-center">바나바: {sessionVol ? volunteerDisplayName(sessionVol) : '미배정'}</div>
        );
      })()}
    </div>
  );
}

/** 다가올 일요일 (오늘이 일요일이면 오늘) */
function getSunday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
