import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Camera } from 'lucide-react';
import Header from '../components/layout/Header';
import DateInput from '../components/ui/DateInput';
import { api } from '../api/client';
import { useTableNavigation } from '../hooks/useTableNavigation';

interface MemberInput {
  id?: string;
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

function createEmptyMember(relation: string): MemberInput {
  return {
    name: '', relation, gender: '', birthDate: '', phone: '+65 ', position: '', attending: true,
    baptized: false, baptismYear: '', previousChurch: '', livingInSG: true, memo: '',
  };
}

function getGenderFromRelation(relation: string): string {
  if (['남편', '아들', '친정아버님', '시아버님', '기타-남자'].includes(relation)) return '남';
  if (['아내', '딸', '친정어머님', '시어머님', '기타-여자'].includes(relation)) return '여';
  return '';
}

export default function FamilyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'NEW' | 'RE_REGISTER'>('NEW');
  const [serviceTime, setServiceTime] = useState('FIRST');
  const [status, setStatus] = useState('ACTIVE');
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [arrivalDate, setArrivalDate] = useState('');
  const [isSingle, setIsSingle] = useState(false);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const [deletedMemberIds, setDeletedMemberIds] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volunteerId, setVolunteerId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tbodyRef, cellProps } = useTableNavigation(isSingle, members.length);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadPhoto(file);
      setPhotoUrl(url);
    } catch {
      alert('사진 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getFamily(id),
      api.getRegions(),
      api.getVolunteers(),
    ]).then(([family, regs, vols]) => {
      setRegions(regs);
      setVolunteers(vols);
      setType(family.type);
      setServiceTime(family.serviceTime);
      setStatus(family.status);
      setRegionId(family.regionId || '');
      setAddress(family.address || '');
      setPhotoUrl(family.photoUrl || '');
      setArrivalDate(family.arrivalDate ? new Date(family.arrivalDate).toISOString().split('T')[0].replace(/-/g, '/') : '');

      // 현재 담당 바나바: 미완료 세션 중 배정된 바나바
      const currentVolunteer = family.sessions?.find((s: any) => !s.completed && s.volunteerId);
      setVolunteerId(currentVolunteer?.volunteerId || '');

      const memberList: MemberInput[] = (family.members || []).map((m: any) => ({
        id: m.id,
        name: m.name || '',
        relation: m.relation || '',
        gender: m.gender || '',
        birthDate: m.birthDate || '',
        phone: m.phone || '',
        position: m.position || '',
        attending: m.attending ?? true,
        baptized: m.baptized ?? false,
        baptismYear: m.baptismYear ? String(m.baptismYear) : '',
        previousChurch: m.previousChurch || '',
        livingInSG: m.servingDepartment === '싱가폴거주',
        memo: m.memo || '',
      }));

      const single = memberList.length === 1 && memberList[0]?.relation === '본인';
      setIsSingle(single);
      setMembers(memberList.length > 0 ? memberList : [createEmptyMember('본인')]);

      if (family.regionId) {
        api.getZones(family.regionId).then(zs => {
          setZones(zs);
          setZoneId(family.zoneId || '');
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (regionId && !loading) {
      api.getZones(regionId).then(setZones).catch(() => {});
    } else if (!regionId) {
      setZones([]);
    }
  }, [regionId]);

  const addMember = () => {
    setMembers([...members, createEmptyMember('')]);
  };

  const removeMember = (index: number) => {
    if (members.length <= 1) return;
    const removed = members[index];
    if (removed.id) {
      setDeletedMemberIds(prev => [...prev, removed.id!]);
    }
    setMembers(members.filter((_, i) => i !== index));
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
      // Delete removed members
      for (const mid of deletedMemberIds) {
        await api.deleteMember(mid).catch(() => {});
      }

      const data = {
        type,
        serviceTime,
        status,
        regionId: regionId || null,
        zoneId: zoneId || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate.replace(/\//g, '-')).toISOString() : null,
        address: address || null,
        photoUrl: photoUrl || null,
        volunteerId: volunteerId || null,
        members: members
          .filter(m => m.name.trim())
          .map(m => ({
            id: m.id || undefined,
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

      await api.updateFamily(id!, data);
      navigate(`/families/${id}`);
    } catch (err: any) {
      alert(err.message || '수정 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1">
        <Header title="새가족 정보 수정" />
        <div className="p-3 sm:p-6 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <Header title="새가족 정보 수정" subtitle="가족 정보를 수정합니다" />

      <div className="p-3 sm:p-6 max-w-5xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">기본 정보</h3>
            {/* 사진 업로드 */}
            <div className="flex items-center gap-3 mb-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors overflow-hidden"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="가족사진" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                ) : (
                  <Camera className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <span className="text-xs text-gray-400">{photoUrl ? '사진 변경' : '사진 등록'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
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
                <label className="block text-xs text-gray-500 mb-0.5">상태</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="ACTIVE">진행중</option>
                  <option value="ON_HOLD">보류</option>
                  <option value="COMPLETED">수료</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">지역</label>
                <select value={regionId} onChange={e => { setRegionId(e.target.value); setZoneId(''); }} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
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
                <label className="block text-xs text-gray-500 mb-0.5">싱가폴주소</label>
                <input type="text" placeholder="싱가폴 주소 입력" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">담당 바나바</label>
                <select value={volunteerId} onChange={e => setVolunteerId(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                  <option value="">미배정</option>
                  {volunteers.filter(v => v.isInternal !== false).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 가족 구성원 */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
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
            {/* 모바일 카드 뷰 */}
            <div className="sm:hidden space-y-3">
              {members.map((member, index) => (
                <div key={member.id || index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                    {!isSingle && members.length > 1 && (
                      <button type="button" onClick={() => removeMember(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div className={isSingle ? 'col-span-2' : ''}>
                      <label className="block text-[10px] text-gray-400 mb-0.5">이름</label>
                      <input type="text" placeholder={index === 0 ? '이름 *' : '이름'} value={member.name} onChange={e => updateMember(index, 'name', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" required={index === 0} />
                    </div>
                    {!isSingle && (
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">관계</label>
                        <select value={member.relation} onChange={e => updateMember(index, 'relation', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                          <option value="">선택</option>
                          <option value="남편">남편</option><option value="아내">아내</option><option value="딸">딸</option><option value="아들">아들</option>
                          <option value="친정어머님">친정어머님</option><option value="친정아버님">친정아버님</option><option value="시어머님">시어머님</option><option value="시아버님">시아버님</option>
                          <option value="기타-남자">기타-남자</option><option value="기타-여자">기타-여자</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">생년월일</label>
                      <input type="text" placeholder="YYYY/MM/DD" value={member.birthDate} onChange={e => { const raw = e.target.value.replace(/[^0-9/]/g, ''); let v = raw.replace(/\//g, ''); if (v.length > 4) v = v.slice(0, 4) + '/' + v.slice(4); if (v.length > 7) v = v.slice(0, 7) + '/' + v.slice(7); if (v.length > 10) v = v.slice(0, 10); updateMember(index, 'birthDate', v); }} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">연락처</label>
                      <input type="text" placeholder="010-0000-0000" value={member.phone} onChange={e => updateMember(index, 'phone', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">직분</label>
                      <select value={member.position} onChange={e => updateMember(index, 'position', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                        <option value="">선택</option><option value="새신자">새신자</option><option value="없음">없음</option>
                        <option value="서리집사">서리집사</option><option value="안수집사">안수집사</option><option value="권사">권사</option><option value="장로">장로</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">세례</label>
                      <div className="flex items-center gap-3 h-[30px]">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-baptized-${index}`} checked={member.baptized} onChange={() => updateMember(index, 'baptized', true)} className="w-3.5 h-3.5" /><span className="text-xs">Y</span></label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-baptized-${index}`} checked={!member.baptized} onChange={() => updateMember(index, 'baptized', false)} className="w-3.5 h-3.5" /><span className="text-xs">N</span></label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">세례연도</label>
                      <select value={member.baptismYear} onChange={e => updateMember(index, 'baptismYear', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" disabled={!member.baptized}>
                        <option value="">선택</option>
                        {Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">이전교회</label>
                      <input type="text" placeholder="이전교회" value={member.previousChurch} onChange={e => updateMember(index, 'previousChurch', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">싱가폴거주</label>
                      <div className="flex items-center gap-3 h-[30px]">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-sg-${index}`} checked={member.livingInSG} onChange={() => updateMember(index, 'livingInSG', true)} className="w-3.5 h-3.5" /><span className="text-xs">Y</span></label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-sg-${index}`} checked={!member.livingInSG} onChange={() => updateMember(index, 'livingInSG', false)} className="w-3.5 h-3.5" /><span className="text-xs">N</span></label>
                      </div>
                    </div>
                    {!isSingle && (
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">교회출석</label>
                        <div className="flex items-center gap-3 h-[30px]">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-att-${index}`} checked={member.attending} onChange={() => updateMember(index, 'attending', true)} className="w-3.5 h-3.5" /><span className="text-xs">Y</span></label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`m-att-${index}`} checked={!member.attending} onChange={() => updateMember(index, 'attending', false)} className="w-3.5 h-3.5" /><span className="text-xs">N</span></label>
                        </div>
                      </div>
                    )}
                    <div className={!isSingle ? '' : 'col-span-2'}>
                      <label className="block text-[10px] text-gray-400 mb-0.5">메모</label>
                      <input type="text" placeholder="메모" value={member.memo} onChange={e => updateMember(index, 'memo', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* PC 테이블 뷰 */}
            <div className="hidden sm:block overflow-x-auto">
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
                    <tr key={member.id || index} className="border-b border-gray-50 hover:bg-gray-50">
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
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/families/${id}`)}
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
