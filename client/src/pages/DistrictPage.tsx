import { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Edit2, Trash2, X, Save, Check, ChevronDown, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';

export default function DistrictPage() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  // 지역 추가/수정 상태
  const [regionForm, setRegionForm] = useState<{ districtId: string; regionId?: string; name: string } | null>(null);
  // 구역 추가/수정 상태
  const [zoneForm, setZoneForm] = useState<{ regionId: string; zoneId?: string; name: string; leaderName: string; leaderName2: string } | null>(null);
  // 접기/펼치기
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  const fetchDistricts = async () => {
    setLoading(true);
    const data = await api.getDistricts();
    setDistricts(data);
    // 처음 로드 시 모두 펼침
    setExpandedDistricts(new Set(data.map((d: any) => d.id)));
    setExpandedRegions(new Set(data.flatMap((d: any) => d.regions?.map((r: any) => r.id) || [])));
    setLoading(false);
  };

  useEffect(() => { fetchDistricts(); }, []);

  const toggleDistrict = (id: string) => {
    setExpandedDistricts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRegion = (id: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 교구 CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editing) {
        await api.updateDistrict(editing.id, { name });
      } else {
        await api.createDistrict({ name });
      }
      await fetchDistricts();
      setName('');
      setEditing(null);
      setShowForm(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('교구를 삭제하시겠습니까?')) return;
    await api.deleteDistrict(id);
    await fetchDistricts();
  };

  // 지역 CRUD
  const handleRegionSubmit = async () => {
    if (!regionForm || !regionForm.name.trim()) return;
    try {
      if (regionForm.regionId) {
        await api.updateRegion(regionForm.regionId, { name: regionForm.name });
      } else {
        await api.createRegion({ districtId: regionForm.districtId, name: regionForm.name });
      }
      setRegionForm(null);
      await fetchDistricts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRegion = async (regionId: string) => {
    if (!confirm('지역을 삭제하시겠습니까?')) return;
    await api.deleteRegion(regionId);
    await fetchDistricts();
  };

  // 구역 CRUD
  const handleZoneSubmit = async () => {
    if (!zoneForm || !zoneForm.name.trim()) return;
    try {
      if (zoneForm.zoneId) {
        await api.updateZone(zoneForm.zoneId, { name: zoneForm.name, leaderName: zoneForm.leaderName, leaderName2: zoneForm.leaderName2 });
      } else {
        await api.createZone({ regionId: zoneForm.regionId, name: zoneForm.name, leaderName: zoneForm.leaderName, leaderName2: zoneForm.leaderName2 });
      }
      setZoneForm(null);
      await fetchDistricts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('구역을 삭제하시겠습니까?')) return;
    await api.deleteZone(zoneId);
    await fetchDistricts();
  };

  const totalRegions = districts.reduce((sum, d) => sum + (d.regions?.length || 0), 0);
  const totalZones = districts.reduce((sum, d) => sum + (d.regions?.reduce((s: number, r: any) => s + (r.zones?.length || 0), 0) || 0), 0);

  return (
    <div className="flex-1">
      <Header
        title="교구/지역/구역 관리"
        actions={
          <button
            onClick={() => { setName(''); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            교구 추가
          </button>
        }
      />

      <div className="p-4">
        {/* 요약 */}
        <div className="flex gap-3 mb-4 text-xs text-gray-500">
          <span>교구 {districts.length}개</span>
          <span>지역 {totalRegions}개</span>
          <span>구역 {totalZones}개</span>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <input
                placeholder="교구명"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
                autoFocus
              />
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
                <Save className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {districts.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200">
                {/* 교구 헤더 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleDistrict(d.id)}>
                    {expandedDistricts.has(d.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <Building2 className="w-5 h-5 text-primary-500" />
                    <h4 className="font-semibold text-gray-900">{d.name}</h4>
                    <span className="text-xs text-gray-500">{d.regions?.length || 0}개 지역</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRegionForm({ districtId: d.id, name: '' })}
                      className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
                    >
                      + 지역 추가
                    </button>
                    <button onClick={() => { setEditing(d); setName(d.name); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 지역 목록 */}
                {expandedDistricts.has(d.id) && (
                  <div className="px-4 pb-4 ml-6 space-y-2">
                    {d.regions?.map((r: any) => (
                      <div key={r.id} className="border border-gray-100 rounded-lg">
                        {/* 지역 헤더 */}
                        {regionForm?.regionId === r.id ? (
                          <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                            <input
                              placeholder="지역이름"
                              value={regionForm.name}
                              onChange={e => setRegionForm({ ...regionForm, name: e.target.value })}
                              className="border border-gray-200 rounded px-2 py-1.5 text-sm w-32"
                              autoFocus
                            />
                            <button onClick={handleRegionSubmit} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setRegionForm(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2.5">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleRegion(r.id)}>
                              {expandedRegions.has(r.id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                              <MapPin className="w-4 h-4 text-amber-500" />
                              <span className="font-medium text-sm text-gray-800">{r.name}</span>
                              <span className="text-xs text-gray-400">{r.zones?.length || 0}개 구역</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setZoneForm({ regionId: r.id, name: '', leaderName: '', leaderName2: '' })}
                                className="text-xs text-amber-600 hover:text-amber-700 px-1.5 py-0.5 rounded hover:bg-amber-50"
                              >
                                + 구역
                              </button>
                              <button
                                onClick={() => setRegionForm({ districtId: d.id, regionId: r.id, name: r.name })}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteRegion(r.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 구역 목록 */}
                        {expandedRegions.has(r.id) && !(regionForm?.regionId === r.id) && (
                          <div className="ml-6 pb-2 pr-2 space-y-1">
                            {r.zones?.map((z: any) => (
                              <div key={z.id}>
                                {zoneForm?.zoneId === z.id ? (
                                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                    <input
                                      placeholder="구역이름"
                                      value={zoneForm.name}
                                      onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                      className="border border-gray-200 rounded px-2 py-1.5 text-sm w-24"
                                      autoFocus
                                    />
                                    <input
                                      placeholder="구역장1"
                                      value={zoneForm.leaderName}
                                      onChange={e => setZoneForm({ ...zoneForm, leaderName: e.target.value })}
                                      className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20"
                                    />
                                    <input
                                      placeholder="구역장2"
                                      value={zoneForm.leaderName2}
                                      onChange={e => setZoneForm({ ...zoneForm, leaderName2: e.target.value })}
                                      className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20"
                                    />
                                    <button onClick={handleZoneSubmit} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setZoneForm(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{z.name || '(이름없음)'}</span>
                                      {(z.leaderName || z.leaderName2) && (
                                        <span className="text-gray-500">· 구역장: {[z.leaderName, z.leaderName2].filter(Boolean).join(', ')}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setZoneForm({ regionId: r.id, zoneId: z.id, name: z.name || '', leaderName: z.leaderName || '', leaderName2: z.leaderName2 || '' })}
                                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteZone(z.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* 새 구역 추가 폼 */}
                            {zoneForm && !zoneForm.zoneId && zoneForm.regionId === r.id && (
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                <input
                                  placeholder="구역이름"
                                  value={zoneForm.name}
                                  onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                  className="border border-gray-200 rounded px-2 py-1.5 text-sm w-24"
                                  autoFocus
                                />
                                <input
                                  placeholder="구역장1"
                                  value={zoneForm.leaderName}
                                  onChange={e => setZoneForm({ ...zoneForm, leaderName: e.target.value })}
                                  className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20"
                                />
                                <input
                                  placeholder="구역장2"
                                  value={zoneForm.leaderName2}
                                  onChange={e => setZoneForm({ ...zoneForm, leaderName2: e.target.value })}
                                  className="border border-gray-200 rounded px-2 py-1.5 text-sm w-20"
                                />
                                <button onClick={handleZoneSubmit} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setZoneForm(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 새 지역 추가 폼 */}
                    {regionForm && !regionForm.regionId && regionForm.districtId === d.id && (
                      <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                        <input
                          placeholder="지역이름"
                          value={regionForm.name}
                          onChange={e => setRegionForm({ ...regionForm, name: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm w-32"
                          autoFocus
                        />
                        <button onClick={handleRegionSubmit} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRegionForm(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
