import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { api } from './api/client';
import TopNav from './components/layout/TopNav';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import FamilyListPage from './pages/FamilyListPage';
import FamilyDetailPage from './pages/FamilyDetailPage';
import FamilyFormPage from './pages/FamilyFormPage';
import FamilyEditPage from './pages/FamilyEditPage';
import TableAssignmentPage from './pages/TableAssignmentPage';
import VolunteerPage from './pages/VolunteerPage';
import DistrictPage from './pages/DistrictPage';
import AdminPage from './pages/AdminPage';
import GraduatedPage from './pages/GraduatedPage';
import RegistrationHistoryPage from './pages/RegistrationHistoryPage';
import FamilySearchPage from './pages/FamilySearchPage';
import PhoneVisitPage from './pages/PhoneVisitPage';
import VolunteerSchedulePage from './pages/VolunteerSchedulePage';

function FirstLoginModal() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<'ask' | 'name' | 'done'>('ask');
  const [realName, setRealName] = useState('');

  // admin이거나 이미 바나바 등록된 사용자는 모달 안 띄움
  if (!user) return null;
  if (user.role === 'ADMIN' || user.volunteerStatus === 'APPROVED') return null;
  if (!user.isFirstLogin) return null;

  const handleRegister = async () => {
    const name = realName.trim();
    if (!name) { alert('이름을 입력해주세요'); return; }
    try {
      const updated = await api.requestVolunteer(name, 'VOLUNTEER');
      setUser(updated);
      setStep('done');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = () => {
    setUser({ ...user, isFirstLogin: false });
  };

  const roleLabel = '바나바';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
        {step === 'done' ? (
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{roleLabel} 등록 완료!</h2>
            <p className="text-sm text-gray-600 mb-4">새가족부 {roleLabel}(으)로 등록되었습니다.</p>
            <button
              onClick={() => setUser({ ...user, isFirstLogin: false })}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              확인
            </button>
          </div>
        ) : step === 'name' ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✍️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">정식 이름 입력</h2>
            <p className="text-sm text-gray-600 mb-4">{roleLabel} 활동 시 사용할 이름을 입력해주세요.</p>
            <input
              type="text"
              value={realName}
              onChange={e => setRealName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center text-sm mb-4 focus:outline-none focus:border-primary-400"
              autoFocus
            />
            <div className="space-y-2">
              <button
                onClick={handleRegister}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                등록 완료
              </button>
              <button
                onClick={() => setStep('ask')}
                className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200"
              >
                뒤로
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">👋</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">환영합니다!</h2>
            <p className="text-sm text-gray-600 mb-5">어떤 역할로 등록하시겠습니까?</p>
            <div className="space-y-2">
              <button
                onClick={() => setStep('name')}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                바나바로 등록
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200"
              >
                다음에
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { user } = useAuthStore();
  const isUserOnly = user?.role === 'USER';

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<DashboardPage />} />
          {!isUserOnly && (
            <>
              <Route path="families" element={<FamilyListPage />} />
              <Route path="families/new" element={<FamilyFormPage />} />
              <Route path="families/:id" element={<FamilyDetailPage />} />
              <Route path="families/:id/edit" element={<FamilyEditPage />} />
              <Route path="registrations" element={<RegistrationHistoryPage />} />
              <Route path="graduated" element={<GraduatedPage />} />
              <Route path="phone-visits" element={<PhoneVisitPage />} />
              <Route path="family-search" element={<FamilySearchPage />} />
              <Route path="assignments" element={<TableAssignmentPage />} />
              <Route path="volunteer-schedule" element={<VolunteerSchedulePage />} />
              <Route path="volunteers" element={<VolunteerPage />} />
              <Route path="districts" element={<DistrictPage />} />
              <Route path="admin" element={<AdminPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <FirstLoginModal />
    </div>
  );
}

export default function App() {
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/*"
        element={user ? <ProtectedLayout /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}
