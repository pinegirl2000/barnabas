import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, X, CheckCircle, Circle, Edit2 } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { formatDate, getStatusColor, getStatusLabel, getFamilyTypeLabel, getServiceTimeLabel } from '../lib/utils';
import { volunteerDisplayName } from '../lib/volunteerDisplay';
import { useAuth } from '../hooks/useAuth';

/** 로컬 날짜를 YYYY-MM-DD 문자열로 변환 (타임존 안전) */
function toLocaleDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 가장 최근 과거 주일 (오늘이 일요일이면 오늘) */
function getMostRecentSunday(): Date {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

const MOST_RECENT_SUNDAY_ISO = toLocaleDateStr(getMostRecentSunday());

/** 올해 모든 주일 날짜 목록 생성 */
function getSundayOptions(): { value: string; label: string; isRecent: boolean }[] {
  const year = new Date().getFullYear();
  const sundays: { value: string; label: string; isRecent: boolean }[] = [];
  // 1월 1일부터 첫 번째 일요일 찾기
  const d = new Date(year, 0, 1);
  const dayOfWeek = d.getDay();
  if (dayOfWeek !== 0) d.setDate(d.getDate() + (7 - dayOfWeek));
  while (d.getFullYear() === year) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isRecent = iso === MOST_RECENT_SUNDAY_ISO;
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const label = isRecent ? `${dateStr} (최근 주일)` : dateStr;
    sundays.push({ value: iso, label, isRecent });
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

const SUNDAY_OPTIONS = getSundayOptions();

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isFamilyTeam, isAdmin, isVolunteer } = useAuth();
  const canEdit = isFamilyTeam || isVolunteer;
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [pastors, setPastors] = useState<any[]>([]);
  const [infoTab, setInfoTab] = useState<'info' | 'members'>('info');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingDateSession, setEditingDateSession] = useState<string | null>(null);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());
  const [pendingEdits, setPendingEdits] = useState<Record<string, {
    date?: string; volunteerId?: string; needsNewVolunteer?: boolean;
    serviceTime?: string; memberAttending?: Record<string, boolean>; pastorVisit?: boolean;
    zoneLeaderName?: string;
  }>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getFamily(id),
      api.getVolunteers(),
      api.getPastors(),
    ]).then(([f, v, p]) => {
      setFamily(f);
      setVolunteers(v);
      setPastors(p);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  // 대시보드에서 editSession 쿼리 파라미터로 진입 시 해당 세션 편집 모드 자동 활성화
  useEffect(() => {
    const editSessionId = searchParams.get('editSession');
    if (editSessionId && family) {
      setEditingDateSession(editSessionId);
      // 쿼리 파라미터 제거하여 저장 후 재트리거 방지
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('editSession');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, family, navigate]);

  const handleSessionComplete = async (sessionId: string) => {
    // 기존 날짜가 있으면 덮어쓰지 않고, 없을 때만 현재 시간 설정
    const session = family.sessions?.find((s: any) => s.id === sessionId);
    const updateData: any = { completed: true };
    if (!session?.date) {
      updateData.date = toLocaleDateStr(new Date()) + 'T12:00:00.000Z';
    }
    await api.updateSession(sessionId, updateData);
    const updated = await api.getFamily(id!);
    setFamily(updated);
  };

  const handleFeedbackSave = async (sessionId: string) => {
    await api.updateSession(sessionId, { feedback });
    const updated = await api.getFamily(id!);
    setFamily(updated);
    setEditingSession(null);
    setFeedback('');
  };

  const setPending = (sessionId: string, field: string, value: any) => {
    setPendingEdits(prev => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], [field]: value },
    }));
  };

  const handleConfirmEdit = async (sessionId: string) => {
    setSaving(true);
    try {
      const edit = pendingEdits[sessionId] || {};

      // 각 API 호출을 독립적으로 실행하여 하나가 실패해도 나머지는 진행
      const tasks: Promise<any>[] = [];

      // 세션 업데이트 (date, needsNewVolunteer, pastorVisit 통합)
      const sessionUpdate: any = {};
      if (edit.date) {
        sessionUpdate.date = edit.date + 'T12:00:00.000Z';
        // 날짜가 오늘 이후(미래)이면 완료 상태를 예정으로 되돌림
        const today = toLocaleDateStr(new Date());
        if (edit.date > today) {
          sessionUpdate.completed = false;
        }
      }
      if (edit.needsNewVolunteer !== undefined) sessionUpdate.needsNewVolunteer = edit.needsNewVolunteer;

      if (edit.pastorVisit !== undefined) {
        sessionUpdate.pastorVisit = edit.pastorVisit;
      }

      if (Object.keys(sessionUpdate).length > 0) {
        tasks.push(api.updateSession(sessionId, sessionUpdate).catch(e => console.error('세션 업데이트 실패:', e)));
      }

      // 날짜 변경 시 이후 미완료 세션들의 날짜도 자동 업데이트
      // 신규: 1~6회차 1주 간격, 7~8회차 4주 간격
      // 재등록: 1~2회차 1주 간격, 3~4회차 4주 간격
      if (edit.date && family?.sessions) {
        const currentSession = family.sessions.find((s: any) => s.id === sessionId);
        if (currentSession) {
          const newDate = new Date(edit.date);
          const isRe = family.type === 'RE_REGISTER';
          const gapThreshold = isRe ? 3 : 7; // 이 회차부터 4주 간격
          // 편집 세션부터 각 회차별 누적 일수 계산
          let totalDays = 0;
          const offsetMap: Record<number, number> = {};
          for (let n = currentSession.sessionNumber + 1; n <= (isRe ? 4 : 8); n++) {
            totalDays += (n >= gapThreshold ? 4 : 1) * 7;
            offsetMap[n] = totalDays;
          }
          family.sessions
            .filter((s: any) => s.sessionNumber > currentSession.sessionNumber && !s.completed)
            .forEach((s: any) => {
              if (offsetMap[s.sessionNumber] !== undefined) {
                const futureDate = new Date(newDate);
                futureDate.setDate(futureDate.getDate() + offsetMap[s.sessionNumber]);
                tasks.push(api.updateSession(s.id, { date: toLocaleDateStr(futureDate) + 'T12:00:00.000Z' }).catch(e => console.error(`${s.sessionNumber}회차 날짜 업데이트 실패:`, e)));
              }
            });
        }
      }

      if (edit.volunteerId === '__ZONE_LEADER__' && edit.zoneLeaderName?.trim()) {
        // 구역장: 이름으로 봉사자 찾거나 생성 후 배정
        const vol = await api.findOrCreateVolunteer(edit.zoneLeaderName.trim());
        tasks.push(api.changeVolunteer(sessionId, vol.id).catch(e => console.error('구역장 배정 실패:', e)));
      } else if (edit.volunteerId !== undefined && edit.volunteerId !== '__ZONE_LEADER__') {
        tasks.push(api.changeVolunteer(sessionId, edit.volunteerId || null).catch(e => console.error('바나바 변경 실패:', e)));
      }
      if (edit.serviceTime) {
        tasks.push(api.updateFamily(id!, { serviceTime: edit.serviceTime }).catch(e => console.error('예배시간 변경 실패:', e)));
      }
      if (edit.memberAttending) {
        for (const [memberId, attending] of Object.entries(edit.memberAttending)) {
          tasks.push(api.updateMember(memberId, { attending }).catch(e => console.error('참석인원 변경 실패:', e)));
        }
      }

      await Promise.all(tasks);
      const updated = await api.getFamily(id!);
      setFamily(updated);
      setPendingEdits(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      setEditingDateSession(null);
      setCollapsedSessions(prev => new Set(prev).add(sessionId));
    } catch (err) {
      console.error('저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (sessionId: string) => {
    setPendingEdits(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setEditingDateSession(null);
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await api.deleteFamily(id!);
    navigate('/families');
  };

  if (loading) {
    return (
      <div className="flex-1">
        <Header title="새가족 상세" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex-1">
        <Header title="새가족 상세" />
        <div className="p-6 text-center text-gray-400">가족 정보를 찾을 수 없습니다</div>
      </div>
    );
  }

  const memberNames = family.members?.map((m: any) => m.name).join(', ') || '이름 없음';

  // 회차별 예정날짜 계산 (완료된 세션은 실제 날짜, 미완료 세션은 주간 단위 예측)
  const projectedDates: string[] = (() => {
    const dates: string[] = [];
    let prevDate: Date | null = null;
    for (const session of (family.sessions || [])) {
      if (session.date) {
        const d = new Date(session.date);
        dates.push(toLocaleDateStr(d));
        prevDate = d;
      } else if (prevDate) {
        // 신규: 1~6회차 1주 간격, 7~8회차(전화심방) 4주 간격
        // 재등록: 1~2회차 1주 간격, 3~4회차(연락심방) 4주 간격
        const is4WeekGap = family.type === 'RE_REGISTER'
          ? session.sessionNumber >= 3
          : session.sessionNumber >= 7;
        const weeks = is4WeekGap ? 4 : 1;
        const d: Date = new Date(prevDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
        dates.push(toLocaleDateStr(d));
        prevDate = d;
      } else {
        const reg = new Date(family.registeredAt);
        const day = reg.getDay();
        if (day !== 0) reg.setDate(reg.getDate() + (7 - day));
        dates.push(toLocaleDateStr(reg));
        prevDate = reg;
      }
    }
    return dates;
  })();

  const formatDateDisplay = (iso: string) => {
    const opt = SUNDAY_OPTIONS.find(o => o.value === iso);
    if (opt) return opt.label;
    const d = new Date(iso + 'T00:00:00');
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1">
      <Header
        title={memberNames}
        subtitle={`${formatDate(family.registeredAt)} 등록`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {canEdit && (
              <button
                onClick={() => navigate(`/families/${id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
              >
                <Edit2 className="w-4 h-4" />
                정보 수정
              </button>
            )}
            {isAdmin && (
              <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* 기본정보 / 가족구성원 탭 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setInfoTab('info')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                infoTab === 'info'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              기본정보
            </button>
            <button
              onClick={() => setInfoTab('members')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                infoTab === 'members'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              가족구성원 ({family.members?.length || 0})
            </button>
          </div>

          {infoTab === 'info' ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${family.type === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                    {getFamilyTypeLabel(family.type)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(family.status)}`}>
                    {getStatusLabel(family.status)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {getServiceTimeLabel(family.serviceTime)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 ml-auto">
                  참석인원 {family.members?.filter((m: any) => m.attending).length || 0}명
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[52px]">바나바</span>
                  <span className="font-medium text-pink-600">
                    {(() => {
                      const v = family.sessions?.find((s: any) => !s.completed && s.volunteerId)?.volunteer;
                      return volunteerDisplayName(v) || '미배정';
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[52px]">교구</span>
                  <span className="font-medium">
                    {family.district?.name
                      ? `${family.district.name}${family.zone ? `-${family.zone.name}` : ''}`
                      : '미배정'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[52px]">입국일</span>
                  <span className="font-medium">{family.arrivalDate ? formatDate(family.arrivalDate) : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[52px]">주소</span>
                  <span className="font-medium">{family.address || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">이름</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">관계</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">생년월일</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">연락처</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">출석</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">세례</th>
                  </tr>
                </thead>
                <tbody>
                  {family.members?.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{m.name}</td>
                      <td className="py-2 px-2 text-gray-500">{m.relation || '-'}</td>
                      <td className="py-2 px-2 text-gray-500">{m.birthDate || '-'}</td>
                      <td className="py-2 px-2 text-gray-500">{m.phone || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${m.attending ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.attending ? 'Y' : 'N'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${m.baptized ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.baptized ? 'Y' : 'N'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 세션 타임라인 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <h3 className="font-semibold text-gray-900 mb-4">진행 현황</h3>
          <div className="space-y-3">
            {family.sessions?.map((session: any, idx: number) => {
              const prevSession = family.sessions?.find((s: any) => s.sessionNumber === session.sessionNumber - 1);
              const isNextActive = !session.completed && (session.sessionNumber === 1 || prevSession?.completed);
              const pending = pendingEdits[session.id];
              const isEditMode = editingDateSession === session.id;
              const displayDate = pending?.date ?? projectedDates[idx] ?? '';

              // 담임목사님 면담 체크박스 표시 조건:
              // 2회차: 항상 표시
              // 3회차: 2회차가 면담 체크 없이 완료된 경우 표시
              // 4회차: 2,3회차 모두 면담 체크 없이 완료된 경우 표시
              const session2 = family.sessions?.find((s: any) => s.sessionNumber === 2);
              const session3 = family.sessions?.find((s: any) => s.sessionNumber === 3);
              const s2PastorDone = session2?.completed && session2?.pastorVisit;
              const s3PastorDone = session3?.completed && session3?.pastorVisit;
              const showPastorCheckbox =
                session.sessionNumber === 1 ||
                session.sessionNumber === 2 ||
                (session.sessionNumber === 3 && !s2PastorDone) ||
                (session.sessionNumber === 4 && !s2PastorDone && !s3PastorDone);

              const currentServiceTime = pending?.serviceTime ?? family.serviceTime;
              const currentAttending = (mid: string) =>
                pending?.memberAttending?.[mid] ?? family.members?.find((m: any) => m.id === mid)?.attending ?? false;
              const isCollapsed = collapsedSessions.has(session.id) && !isEditMode;

              return (
              <div
                key={session.id}
                className={`border rounded-xl ${session.completed ? 'border-sky-300 bg-sky-100' : 'border-gray-200'}`}
              >
                {/* 헤더 행 */}
                <div
                  className="flex items-center justify-between p-3 pb-2 cursor-pointer select-none"
                  onClick={() => setCollapsedSessions(prev => {
                    const next = new Set(prev);
                    if (next.has(session.id)) next.delete(session.id); else next.add(session.id);
                    return next;
                  })}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {session.completed ? (
                      <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-sm">{session.sessionNumber}회차</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      session.completed
                        ? 'bg-sky-500 text-white'
                        : (session.pastorVisit) ? 'bg-purple-100 text-purple-700'
                        : session.type === 'EDUCATION' ? 'bg-blue-100 text-blue-700'
                        : session.type === 'PASTOR_VISIT' ? 'bg-purple-100 text-purple-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {session.completed
                        ? ((session.pastorVisit)
                            ? (session.sessionNumber === 1
                              ? `${session.sessionNumber}주차-부목사님 면담완료`
                              : `${session.sessionNumber}주차-담임목사님 면담완료`)
                            : session.type === 'EDUCATION' ? '교육완료'
                            : session.type === 'PASTOR_VISIT' ? '면담완료'
                            : ((family.type === 'RE_REGISTER' ? session.sessionNumber === 4 : session.sessionNumber === 8)
                              ? '두달 뒤 심방완료' : '한달 뒤 심방완료'))
                        : (session.pastorVisit)
                          ? (session.sessionNumber === 1
                            ? `${session.sessionNumber}주차-부목사님 면담`
                            : `${session.sessionNumber}주차-담임목사님 면담`)
                          : session.type === 'EDUCATION' ? '교육'
                          : session.type === 'PASTOR_VISIT'
                            ? (family.type === 'RE_REGISTER'
                              ? (session.sessionNumber === 1 ? '부목사님 면담' : '담임목사님 면담')
                              : '목사 면담')
                            : (family.type === 'RE_REGISTER' ? session.sessionNumber === 4 : session.sessionNumber === 8)
                              ? '두달 뒤 연락심방' : '한달 뒤 연락심방'}
                    </span>
                    {!isEditMode && (
                      <span className={`text-xs ${session.completed ? 'text-sky-600' : 'text-blue-500'}`}>
                        {displayDate ? formatDateDisplay(displayDate) : '-'}
                        {!session.completed && displayDate && <span className="text-gray-400 ml-0.5">(예정)</span>}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isEditMode && canEdit && (
                      <button
                        onClick={() => { setCollapsedSessions(prev => { const n = new Set(prev); n.delete(session.id); return n; }); setEditingDateSession(session.id); }}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 active:bg-blue-700"
                      >
                        수정
                      </button>
                    )}
                    {isNextActive && !isEditMode && canEdit && (
                      <button
                        onClick={() => handleSessionComplete(session.id)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 active:bg-blue-700"
                      >
                        회차 완료
                      </button>
                    )}
                  </div>
                </div>

                {/* 요약 정보 (비편집 모드) */}
                {!isEditMode && (
                  <div className="px-3 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>바나바: <span className={session.needsNewVolunteer ? 'text-orange-600 font-medium' : 'text-gray-700 font-medium'}>
                      {session.needsNewVolunteer ? '변경요청' : (volunteerDisplayName(session.volunteer) || '미배정')}
                    </span></span>
                    <span>{getServiceTimeLabel(family.serviceTime)}</span>
                    <span>참석 {family.members?.filter((m: any) => m.attending).length || 0}명</span>
                    {!session.completed && showPastorCheckbox && (session.pastorVisit || pending?.pastorVisit) && (
                      <span className="text-purple-600">{session.sessionNumber === 1 ? '부목사님 면담예정' : '담임목사님 면담예정'}</span>
                    )}
                  </div>
                )}

                {/* 편집 폼 (모바일 친화적 세로 배치) */}
                {isEditMode && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* 일정 */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">일정</label>
                      <select
                        value={displayDate}
                        onChange={e => setPending(session.id, 'date', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5"
                      >
                        <option value="">날짜 선택</option>
                        {SUNDAY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} style={opt.isRecent ? { fontWeight: 'bold' } : undefined}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 바나바 */}
                    {(() => {
                      const isCurrentZoneLeader = session.volunteer && session.volunteer.isInternal === false;
                      const defaultValue = session.needsNewVolunteer ? '__CHANGE_REQUEST__' : isCurrentZoneLeader ? '__ZONE_LEADER__' : (session.volunteerId || '');
                      const selectValue = pending?.volunteerId ?? defaultValue;
                      const showZoneLeaderInput = selectValue === '__ZONE_LEADER__';
                      const defaultZoneLeaderName = isCurrentZoneLeader ? session.volunteer.name : '';
                      return (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">바나바</label>
                      <select
                        value={selectValue}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '__CHANGE_REQUEST__') {
                            setPending(session.id, 'needsNewVolunteer', true);
                            setPending(session.id, 'volunteerId', '');
                          } else {
                            setPending(session.id, 'needsNewVolunteer', false);
                            setPending(session.id, 'volunteerId', val);
                          }
                          if (val === '__ZONE_LEADER__') {
                            setPending(session.id, 'zoneLeaderName', defaultZoneLeaderName);
                          } else {
                            setPending(session.id, 'zoneLeaderName', undefined);
                          }
                        }}
                        className={`w-full text-sm border rounded-lg px-3 py-2.5 ${(pending?.needsNewVolunteer ?? session.needsNewVolunteer) ? 'border-orange-300 text-orange-600 bg-orange-50' : 'border-gray-200'}`}
                      >
                        <option value="">미배정</option>
                        {volunteers.filter((v: any) => v.isInternal !== false).map((v: any) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                        <option value="__ZONE_LEADER__">구역장</option>
                        <option value="__CHANGE_REQUEST__">바나바 변경요청</option>
                      </select>
                      {showZoneLeaderInput && (
                        <input
                          type="text"
                          placeholder="구역장 이름 입력"
                          value={pending?.zoneLeaderName ?? defaultZoneLeaderName}
                          onChange={e => setPending(session.id, 'zoneLeaderName', e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1.5"
                        />
                      )}
                    </div>
                      );
                    })()}

                    {/* 예배시간 */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">예배시간</label>
                      <div className="flex gap-2">
                        {[
                          { key: 'FIRST', label: '1부후' },
                          { key: 'SECOND', label: '2부후' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setPending(session.id, 'serviceTime', opt.key)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              currentServiceTime === opt.key
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 참석인원 */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">
                        참석인원 ({family.members?.filter((m: any) => currentAttending(m.id)).length || 0}명)
                      </label>
                      <div className="space-y-1.5">
                        {family.members?.map((m: any) => (
                          <label
                            key={m.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                              currentAttending(m.id)
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={currentAttending(m.id)}
                              onChange={e => {
                                const prev = pending?.memberAttending || {};
                                setPending(session.id, 'memberAttending', { ...prev, [m.id]: e.target.checked });
                              }}
                              className="w-4 h-4 rounded text-green-600"
                            />
                            <span className="text-sm font-medium">{m.name}</span>
                            {m.relation && <span className="text-xs text-gray-400">{m.relation}</span>}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 담임목사님 면담 체크박스 */}
                    {showPastorCheckbox && (
                      <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-purple-200 bg-purple-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pending?.pastorVisit !== undefined ? pending.pastorVisit : (session.pastorVisit)}
                          onChange={e => setPending(session.id, 'pastorVisit', e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600"
                        />
                        <span className="text-sm font-medium text-purple-700">{session.sessionNumber === 1 ? '부목사님 면담예정' : '담임목사님 면담예정'}</span>
                      </label>
                    )}

                    {/* 저장/취소 버튼 */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmEdit(session.id)}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={() => handleCancelEdit(session.id)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300"
                      >
                        취소
                      </button>
                    </div>
                    {session.completed && (
                      <button
                        onClick={async () => {
                          if (!confirm('이 회차를 교육예정 상태로 되돌리시겠습니까?')) return;
                          setSaving(true);
                          try {
                            await api.updateSession(session.id, { completed: false });
                            const updated = await api.getFamily(id!);
                            setFamily(updated);
                            setEditingDateSession(null);
                            setPendingEdits(prev => { const n = { ...prev }; delete n[session.id]; return n; });
                          } catch (err) {
                            console.error('완료취소 실패:', err);
                            alert('완료취소 중 오류가 발생했습니다.');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="w-full py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 active:bg-red-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        완료취소
                      </button>
                    )}
                  </div>
                )}

                {/* 피드백 */}
                {!isCollapsed && !isEditMode && (
                  <div className="px-3 pb-3">
                    {editingSession === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feedback}
                          onChange={e => setFeedback(e.target.value)}
                          placeholder="피드백 입력..."
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
                          autoFocus
                        />
                        <button onClick={() => handleFeedbackSave(session.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingSession(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-sm cursor-pointer text-gray-600 hover:text-gray-800"
                        onClick={() => {
                          setEditingSession(session.id);
                          setFeedback(session.feedback || '');
                        }}
                      >
                        {session.feedback ? (
                          <p className={`rounded-lg p-2 text-xs ${session.completed ? 'bg-sky-100' : 'bg-gray-50'}`}>{session.feedback}</p>
                        ) : (
                          <p className="text-gray-400 italic text-xs">피드백 추가하려면 탭...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
