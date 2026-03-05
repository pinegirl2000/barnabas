import { useState, useEffect } from 'react';
import { Heart, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';
import { getServiceTimeLabel } from '../lib/utils';

export default function VolunteerPage() {
  const { isFamilyTeam } = useAuth();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', isInternal: true, availability: 'BOTH', phone: '', email: '' });

  const fetchVolunteers = async () => {
    setLoading(true);
    const data = await api.getVolunteers();
    setVolunteers(data.filter((v: any) => v.isInternal !== false));
    setLoading(false);
  };

  useEffect(() => { fetchVolunteers(); }, []);

  const resetForm = () => {
    setForm({ name: '', isInternal: true, availability: 'BOTH', phone: '', email: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      if (editing) {
        await api.updateVolunteer(editing.id, form);
      } else {
        await api.createVolunteer(form);
      }
      await fetchVolunteers();
      resetForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (v: any) => {
    setForm({
      name: v.name,
      isInternal: v.isInternal,
      availability: v.availability,
      phone: v.phone || '',
      email: v.email || '',
    });
    setEditing(v);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteVolunteer(id);
    await fetchVolunteers();
    setDeleteTarget(null);
  };

  return (
    <div className="flex-1">
      <Header
        title="바나바 관리"
        subtitle={`총 ${volunteers.length}명`}
        actions={
          isFamilyTeam && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              바나바 등록
            </button>
          )
        }
      />

      <div className="p-6">
        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing ? '바나바 수정' : '새 바나바 등록'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                placeholder="이름 *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              />
              <select
                value={form.availability}
                onChange={e => setForm({ ...form, availability: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="FIRST">1부후</option>
                <option value="SECOND">2부후</option>
                <option value="BOTH">전체</option>
              </select>
              <input
                placeholder="연락처"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="이메일"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-primary-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-primary-700"
              >
                <Save className="w-4 h-4" />
                {editing ? '수정' : '등록'}
              </button>
            </form>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {volunteers.map(v => (
              <div key={v.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Heart className="w-4 h-4 text-pink-400 shrink-0" />
                    <span className="font-medium text-sm text-gray-900 truncate">{v.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                      {getServiceTimeLabel(v.availability)}
                    </span>
                    {v.users?.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">카톡</span>
                    )}
                    {!v.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">비활성</span>
                    )}
                  </div>
                  {isFamilyTeam && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => handleEdit(v)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(v.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {(v.phone || v.email) && (
                  <div className="mt-1 text-xs text-gray-400 pl-6">
                    {[v.phone, v.email].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        message="정말로 삭제하시겠습니까?"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
