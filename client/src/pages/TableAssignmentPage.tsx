import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Grid3X3, Zap, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function TableAssignmentPage() {
  const { isFamilyTeam } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getSunday(new Date()));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<'FIRST' | 'SECOND'>('SECOND');

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const result = await api.getAssignments(weekStart.toISOString());
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
      const result = await api.autoAssign(weekStart.toISOString());
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">{weekLabel}</span>
              <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isFamilyTeam && (
              <button
                onClick={handleAutoAssign}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                자동 배정
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
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
            <div className="grid grid-cols-3 gap-4">
              {/* 헤더 행 */}
              <h3 className="text-sm font-semibold text-blue-700 text-center bg-blue-50 py-1.5 rounded-lg">새가족실 안쪽</h3>
              <h3 className="text-sm font-semibold text-emerald-700 text-center bg-emerald-50 py-1.5 rounded-lg">새가족실 바깥쪽</h3>
              <h3 className="text-sm font-semibold text-purple-700 text-center bg-purple-50 py-1.5 rounded-lg">오병이어홀</h3>
              {/* Row 1: 테이블 1, 4, 7 */}
              {[[1,'blue'],[4,'emerald'],[7,'purple']].map(([num, zone]) => {
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
              {/* Row 2: 테이블 2, 5, 8 */}
              {[[2,'blue'],[5,'emerald'],[8,'purple']].map(([num, zone]) => {
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
              {/* Row 3: 테이블 3, 6 */}
              {[[3,'blue'],[6,'emerald'],[0,'purple']].map(([num, zone]) => {
                if (num === 0) return <div key="empty-placeholder" />;
                const table = data?.tables?.find((t: any) => t.tableNumber === num);
                return table ? <TableSlot key={table.id} table={table} zone={zone as 'blue' | 'emerald' | 'purple'} serviceFilter={serviceFilter} /> : <div key={`empty-${num}`} />;
              })}
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
  const isPastorVisit = nextSession?.type === 'PASTOR_VISIT';
  const pastorLabel = isPastorVisit
    ? (assignment.family?.type === 'RE_REGISTER'
      ? (nextSession.sessionNumber === 1 ? '부목사님 면담' : '담임목사님 면담')
      : '담임목사님 면담')
    : null;

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
        <span className="text-sm font-medium text-gray-900">{memberNames}</span>
        {nextSession && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
            {nextSession.sessionNumber}주차
          </span>
        )}
        {isPastorVisit && (
          <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" title={pastorLabel!} />
        )}
      </div>
      {pastorLabel && (
        <div className="text-xs mt-0.5 text-purple-600 text-center">{pastorLabel}</div>
      )}
      {assignment.volunteer && (
        <div className="text-xs mt-1 text-gray-500 text-center">바나바: {assignment.volunteer.name}</div>
      )}
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
