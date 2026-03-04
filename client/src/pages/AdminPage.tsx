import { useState, useEffect } from 'react';
import { Users, UserPlus, Save } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';

const ROLES = [
  { value: 'ADMIN', label: '관리자', color: 'bg-red-100 text-red-700' },
  { value: 'FAMILY_TEAM', label: '새가족팀', color: 'bg-blue-100 text-blue-700' },
  { value: 'VOLUNTEER', label: '바나바', color: 'bg-green-100 text-green-700' },
  { value: 'ZONE_LEADER', label: '구역장', color: 'bg-purple-100 text-purple-700' },
  { value: 'USER', label: '일반사용자', color: 'bg-gray-100 text-gray-700' },
];

function getRoleColor(role: string) {
  return ROLES.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-700';
}

function getRoleLabel(role: string) {
  return ROLES.find(r => r.value === role)?.label || role;
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [editAvail, setEditAvail] = useState<Record<string, string>>({});
  const [editRoles, setEditRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getVolunteerRequests()
      .then(list => {
        setVolunteers(list);
        // 초기값 세팅
        const names: Record<string, string> = {};
        const avails: Record<string, string> = {};
        const roles: Record<string, string> = {};
        list.forEach((v: any) => {
          names[v.id] = v.volunteer?.name || v.name;
          avails[v.id] = v.volunteer?.availability || 'BOTH';
          roles[v.id] = v.role;
        });
        setEditNames(names);
        setEditAvail(avails);
        setEditRoles(roles);
      })
      .catch(console.error);
  }, []);

  const handleSaveVolunteer = async (userId: string) => {
    const volunteerName = editNames[userId]?.trim();
    if (!volunteerName) {
      alert('정식 이름을 입력해주세요');
      return;
    }
    try {
      const updated = await api.updateVolunteerRequest(userId, {
        volunteerName,
        availability: editAvail[userId],
        role: editRoles[userId],
      });
      setVolunteers(prev => prev.map(v => v.id === userId ? updated : v));
    } catch (err: any) {
      alert(err.message || '저장 실패');
    }
  };

  const isChanged = (v: any) => {
    const origName = v.volunteer?.name || v.name;
    const origAvail = v.volunteer?.availability || 'BOTH';
    return editNames[v.id] !== origName || editAvail[v.id] !== origAvail || editRoles[v.id] !== v.role;
  };

  return (
    <div className="flex-1">
      <Header title="관리자 설정" subtitle="시스템 관리" />

      <div className="p-6 space-y-6">
        {/* 등록된 바나바 관리 */}
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-500" />
            등록된 바나바
            <span className="text-sm font-normal text-green-600 ml-1">({volunteers.length}명)</span>
          </h3>

          {volunteers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">등록된 바나바가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 border-b border-green-200">
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">카톡이름</th>
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">정식이름</th>
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">예배시간</th>
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">권한</th>
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">등록일</th>
                    <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(v => {
                    const isMe = v.id === currentUser?.id;
                    return (
                      <tr key={v.id} className="border-b border-gray-50 hover:bg-green-50/30">
                        <td className="py-2.5 px-4 text-gray-500">
                          {v.name}
                          {isMe && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">나</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={editNames[v.id] || ''}
                            onChange={e => setEditNames(prev => ({ ...prev, [v.id]: e.target.value }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-400"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={editAvail[v.id] || 'BOTH'}
                            onChange={e => setEditAvail(prev => ({ ...prev, [v.id]: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="FIRST">1부</option>
                            <option value="SECOND">2부</option>
                            <option value="BOTH">모두</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          {isMe ? (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(v.role)}`}>
                              {getRoleLabel(v.role)}
                            </span>
                          ) : (
                            <select
                              value={editRoles[v.id] || v.role}
                              onChange={e => setEditRoles(prev => ({ ...prev, [v.id]: e.target.value }))}
                              className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${getRoleColor(editRoles[v.id] || v.role)}`}
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-gray-400">{formatDate(v.createdAt)}</td>
                        <td className="py-2.5 px-4">
                          {isChanged(v) && (
                            <button
                              onClick={() => handleSaveVolunteer(v.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-primary-500 text-white rounded-lg text-xs font-medium hover:bg-primary-600"
                            >
                              <Save className="w-3.5 h-3.5" />
                              저장
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 시스템 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-xl">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            시스템 정보
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>바나바 시스템 v1.0.0</p>
            <p>역할: 관리자, 새가족팀, 바나바, 구역장</p>
            <p>테이블: 8개 (1-2번: 4명, 3-6번: 6명, 7-8번: 10명)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
