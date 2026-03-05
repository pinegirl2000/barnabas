import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Header from '../components/layout/Header';
import DateInput from '../components/ui/DateInput';
import { api } from '../api/client';
import { useTableNavigation } from '../hooks/useTableNavigation';

interface MemberInput {
  name: string;
  relation: string;
  gender: string;
  birthDate: string;
  phone: string;
  position: string;
  attending: boolean;
  baptized: boolean;
  baptismYear: string;
  previousChurch: string;
  livingInSG: boolean;
  memo: string;
}

const FAMILY_RELATIONS = ['남편', '아내', '아들', '딸', '', '', '', ''];

function createEmptyMember(relation: string): MemberInput {
  return {
    name: '', relation, gender: '', birthDate: '', phone: '+65 ', position: '', attending: true,
    baptized: false, baptismYear: '', previousChurch: '', livingInSG: true, memo: '',
  };
}

function createMembers(count: number, isSingle: boolean): MemberInput[] {
  if (isSingle) {
    return [createEmptyMember('본인')];
  }
  return Array.from({ length: count }, (_, i) =>
    createEmptyMember(FAMILY_RELATIONS[i] || '기타')
  );
}

export default function FamilyFormPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<'NEW' | 'RE_REGISTER'>('NEW');
  const [serviceTime, setServiceTime] = useState('SECOND');
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [arrivalDate, setArrivalDate] = useState('');
  const [isSingle, setIsSingle] = useState(false);
  const [familyCount, setFamilyCount] = useState(4);
  const [members, setMembers] = useState<MemberInput[]>(createMembers(4, false));
  const [submitting, setSubmitting] = useState(false);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volunteerId, setVolunteerId] = useState('');
  const [address, setAddress] = useState('');
  const { tbodyRef, cellProps } = useTableNavigation(isSingle, members.length);

  useEffect(() => {
    api.getRegions().then(setRegions).catch(() => {});
    api.getVolunteers().then(setVolunteers).catch(() => {});
  }, []);

  useEffect(() => {
    if (regionId) {
      api.getZones(regionId).then(setZones).catch(() => {});
    } else {
      setZones([]);
    }
    setZoneId('');
  }, [regionId]);

  const handleSingleChange = (single: boolean) => {
    setIsSingle(single);
    if (single) {
      setMembers(prev => {
        const first = prev[0] ? { ...prev[0], relation: '본인' } : createEmptyMember('본인');
        return [first];
      });
    } else {
      setMembers(prev => {
        const first = prev[0] ? { ...prev[0], relation: FAMILY_RELATIONS[0] || '' } : createEmptyMember(FAMILY_RELATIONS[0] || '');
        const extra = Array.from({ length: familyCount - 1 }, (_, i) =>
          createEmptyMember(FAMILY_RELATIONS[i + 1] || '기타')
        );
        return [first, ...extra];
      });
    }
  };

  const handleFamilyCountChange = (count: number) => {
    if (count < 2) count = 2;
    setFamilyCount(count);
    setMembers(prev => {
      if (count <= prev.length) {
        return prev.slice(0, count);
      }
      const extra = Array.from({ length: count - prev.length }, (_, i) =>
        createEmptyMember(FAMILY_RELATIONS[prev.length + i] || '기타')
      );
      return [...prev, ...extra];
    });
  };

  const addMember = () => {
    setMembers([...members, createEmptyMember('')]);
    if (!isSingle) setFamilyCount(members.length + 1);
  };

  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
    if (!isSingle) setFamilyCount(updated.length);
  };

  const getGenderFromRelation = (relation: string): string => {
    if (['남편', '아들', '친정아버님', '시아버님', '기타-남자'].includes(relation)) return '남';
    if (['아내', '딸', '친정어머님', '시어머님', '기타-여자'].includes(relation)) return '여';
    return '';
  };

  const updateMember = (index: number, field: keyof MemberInput, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'relation') {
      const autoGender = getGenderFromRelation(value);
      if (autoGender) updated[index].gender = autoGender;
    }
    if (field === 'baptized' && !value) {
      updated[index].baptismYear = '';
    }
    if (field === 'previousChurch' && index === 0) {
      for (let i = 1; i < updated.length; i++) {
        if (!updated[i].previousChurch || updated[i].previousChurch === updated[0].previousChurch) {
          updated[i] = { ...updated[i], previousChurch: value };
        }
      }
    }
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!members[0]?.name) {
      alert('최소 1명의 이름을 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        type,
        serviceTime,
        regionId: regionId || undefined,
        zoneId: zoneId || undefined,
        arrivalDate: arrivalDate || undefined,
        volunteerId: volunteerId || undefined,
        address: address || undefined,
        members: members
          .filter(m => m.name.trim())
          .map(m => ({
            name: m.name.trim(),
            relation: m.relation || null,
            gender: m.gender || null,
            birthDate: m.birthDate || null,
            phone: m.phone || null,
            position: m.position || null,
            isSingle,
            attending: isSingle ? false : m.attending,
            baptized: m.baptized,
            baptismYear: m.baptismYear ? parseInt(m.baptismYear) : null,
            previousChurch: m.previousChurch || null,
            servingDepartment: m.livingInSG ? '싱가폴거주' : null,
            memo: m.memo || null,
          })),
      };

      const result = await api.createFamily(data);
      navigate(`/families/${result.id}`);
    } catch (err: any) {
      alert(err.message || '등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1">
      <Header title="새가족 등록" subtitle="새로운 가족을 등록합니다" />

      <div className="p-6 max-w-5xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">기본 정보</h3>
            <div className="grid grid-cols-4 gap-x-3 gap-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">유형</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="NEW">신규</option>
                  <option value="RE_REGISTER">재등록</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">선호하는 교육시간</label>
                <select value={serviceTime} onChange={e => setServiceTime(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="FIRST">1부후</option>
                  <option value="SECOND">2부후</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">지역</label>
                <select value={regionId} onChange={e => setRegionId(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="">미정</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">구역</label>
                <select value={zoneId} onChange={e => setZoneId(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400" disabled={!regionId}>
                  <option value="">{regionId ? '미정' : '지역을 먼저 선택'}</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name || z.id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">싱가폴 입국일</label>
                <DateInput value={arrivalDate} onChange={setArrivalDate} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">구분</label>
                <div className="flex items-center gap-2 h-[30px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="familyType" checked={isSingle} onChange={() => handleSingleChange(true)} className="w-3.5 h-3.5 text-primary-600" />
                    <span className="text-sm">싱글</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="familyType" checked={!isSingle} onChange={() => handleSingleChange(false)} className="w-3.5 h-3.5 text-primary-600" />
                    <span className="text-sm">가족</span>
                  </label>
                  {!isSingle && (
                    <div className="flex items-center gap-1 ml-1">
                      <input type="number" min={2} max={10} value={familyCount} onChange={e => handleFamilyCountChange(parseInt(e.target.value) || 2)} className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-sm text-center" />
                      <span className="text-xs text-gray-500">명</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">담당바나바</label>
                <select value={volunteerId} onChange={e => setVolunteerId(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="">미정</option>
                  {volunteers.filter(v => v.isActive).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">싱가폴주소</label>
                <input type="text" placeholder="싱가폴 주소 입력" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
          </div>

          {/* 가족 구성원 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {isSingle ? '본인 정보' : `가족 구성원 (${members.length}명)`}
              </h3>
              {!isSingle && (
                <button
                  type="button"
                  onClick={addMember}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-4 h-4" /> 구성원 추가
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium min-w-[100px]">이름</th>
                    {!isSingle && (
                      <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-24">관계</th>
                    )}
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-28">생년월일</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-28">연락처</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-24">직분</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium w-12">세례</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-20">세례연도</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium min-w-[100px]">이전교회</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium w-20">싱가폴거주</th>
                    {!isSingle && (
                      <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium w-16">교회출석</th>
                    )}
                    <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium min-w-[100px]">메모</th>
                    {!isSingle && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {members.map((member, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 px-2 text-gray-400 text-center">{index + 1}</td>
                      <td className="py-1.5 px-2">
                        <input
                          {...cellProps(index, 'name')}
                          type="text"
                          placeholder={index === 0 ? '이름 *' : '이름'}
                          value={member.name}
                          onChange={e => updateMember(index, 'name', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                          required={index === 0}
                        />
                      </td>
                      {!isSingle && (
                        <td className="py-1.5 px-2">
                          <select
                            {...cellProps(index, 'relation')}
                            value={member.relation}
                            onChange={e => updateMember(index, 'relation', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                          >
                            <option value="">선택</option>
                            <option value="남편">남편</option>
                            <option value="아내">아내</option>
                            <option value="딸">딸</option>
                            <option value="아들">아들</option>
                            <option value="친정어머님">친정어머님</option>
                            <option value="친정아버님">친정아버님</option>
                            <option value="시어머님">시어머님</option>
                            <option value="시아버님">시아버님</option>
                            <option value="기타-남자">기타-남자</option>
                            <option value="기타-여자">기타-여자</option>
                          </select>
                        </td>
                      )}
                      <td className="py-1.5 px-2">
                        <input
                          {...cellProps(index, 'birthDate')}
                          type="text"
                          placeholder="YYYY/MM/DD"
                          value={member.birthDate}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9/]/g, '');
                            let v = raw.replace(/\//g, '');
                            if (v.length > 4) v = v.slice(0, 4) + '/' + v.slice(4);
                            if (v.length > 7) v = v.slice(0, 7) + '/' + v.slice(7);
                            if (v.length > 10) v = v.slice(0, 10);
                            updateMember(index, 'birthDate', v);
                          }}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          {...cellProps(index, 'phone')}
                          type="text"
                          placeholder="010-0000-0000"
                          value={member.phone}
                          onChange={e => updateMember(index, 'phone', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          {...cellProps(index, 'position')}
                          value={member.position}
                          onChange={e => updateMember(index, 'position', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                        >
                          <option value="">선택</option>
                          <option value="새신자">새신자</option>
                          <option value="없음">없음</option>
                          <option value="서리집사">서리집사</option>
                          <option value="안수집사">안수집사</option>
                          <option value="권사">권사</option>
                          <option value="장로">장로</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <div
                          {...cellProps(index, 'baptized')}
                          tabIndex={0}
                          className="flex items-center justify-center gap-2 outline-none focus:ring-1 focus:ring-primary-300 rounded px-1 py-0.5"
                          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateMember(index, 'baptized', !member.baptized); } }}
                        >
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input type="radio" tabIndex={-1} name={`baptized-${index}`} checked={member.baptized} onChange={() => updateMember(index, 'baptized', true)} className="w-3.5 h-3.5" />
                            <span className="text-xs">Y</span>
                          </label>
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input type="radio" tabIndex={-1} name={`baptized-${index}`} checked={!member.baptized} onChange={() => updateMember(index, 'baptized', false)} className="w-3.5 h-3.5" />
                            <span className="text-xs">N</span>
                          </label>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          {...cellProps(index, 'baptismYear')}
                          value={member.baptismYear}
                          onChange={e => updateMember(index, 'baptismYear', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                          disabled={!member.baptized}
                        >
                          <option value="">선택</option>
                          {Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          {...cellProps(index, 'previousChurch')}
                          type="text"
                          placeholder="이전교회"
                          value={member.previousChurch}
                          onChange={e => updateMember(index, 'previousChurch', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <div
                          {...cellProps(index, 'livingInSG')}
                          tabIndex={0}
                          className="flex items-center justify-center gap-2 outline-none focus:ring-1 focus:ring-primary-300 rounded px-1 py-0.5"
                          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateMember(index, 'livingInSG', !member.livingInSG); } }}
                        >
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input type="radio" tabIndex={-1} name={`livingInSG-${index}`} checked={member.livingInSG} onChange={() => updateMember(index, 'livingInSG', true)} className="w-3.5 h-3.5" />
                            <span className="text-xs">Y</span>
                          </label>
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input type="radio" tabIndex={-1} name={`livingInSG-${index}`} checked={!member.livingInSG} onChange={() => updateMember(index, 'livingInSG', false)} className="w-3.5 h-3.5" />
                            <span className="text-xs">N</span>
                          </label>
                        </div>
                      </td>
                      {!isSingle && (
                        <td className="py-1.5 px-2">
                          <div
                            {...cellProps(index, 'attending')}
                            tabIndex={0}
                            className="flex items-center justify-center gap-2 outline-none focus:ring-1 focus:ring-primary-300 rounded px-1 py-0.5"
                            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); updateMember(index, 'attending', !member.attending); } }}
                          >
                            <label className="flex items-center gap-0.5 cursor-pointer">
                              <input type="radio" tabIndex={-1} name={`attending-${index}`} checked={member.attending} onChange={() => updateMember(index, 'attending', true)} className="w-3.5 h-3.5" />
                              <span className="text-xs">Y</span>
                            </label>
                            <label className="flex items-center gap-0.5 cursor-pointer">
                              <input type="radio" tabIndex={-1} name={`attending-${index}`} checked={!member.attending} onChange={() => updateMember(index, 'attending', false)} className="w-3.5 h-3.5" />
                              <span className="text-xs">N</span>
                            </label>
                          </div>
                        </td>
                      )}
                      <td className="py-1.5 px-2">
                        <input
                          {...cellProps(index, 'memo')}
                          type="text"
                          placeholder="메모"
                          value={member.memo}
                          onChange={e => updateMember(index, 'memo', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                        />
                      </td>
                      {!isSingle && (
                        <td className="py-1.5 px-2">
                          <button
                            type="button"
                            onClick={() => removeMember(index)}
                            className={`text-red-400 hover:text-red-600 ${members.length <= 1 ? 'invisible' : ''}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 제출 */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
