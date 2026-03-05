import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Grid3X3,
  Building2,
  Shield,
  LogOut,
  GraduationCap,
  Heart,
  UserPlus,
  ChevronDown,
  ClipboardList,
  Phone,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

// 공통 탭 메뉴
const commonTabs = [
  { to: '/', icon: LayoutDashboard, label: '홈', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER', 'ZONE_LEADER', 'USER'] },
  { to: '/families', icon: Users, label: '바나바교육 현황', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/graduated', icon: GraduationCap, label: '수료완료', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/phone-visits', icon: Phone, label: '전화심방 예정', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
];

// 어드민 드롭다운 메뉴
const adminMenuItems = [
  { to: '/family-search', icon: ClipboardList, label: '새가족 조회', roles: ['ADMIN', 'FAMILY_TEAM'] },
  { to: '/assignments', icon: Grid3X3, label: '테이블 배정', roles: ['ADMIN', 'FAMILY_TEAM'] },
  { to: '/volunteers', icon: Heart, label: '바나바 관리', roles: ['ADMIN'] },
  { to: '/districts', icon: Building2, label: '교구/구역', roles: ['ADMIN'] },
  { to: '/admin', icon: Shield, label: '관리자', roles: ['ADMIN'] },
];

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN': return '관리자';
    case 'FAMILY_TEAM': return '새가족팀';
    case 'VOLUNTEER': return '바나바';
    case 'ZONE_LEADER': return '구역장';
    case 'USER': return '일반사용자';
    default: return role;
  }
}

export default function TopNav() {
  const { user, hasRole, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const visibleTabs = commonTabs.filter(item => item.roles.some(role => hasRole(role)));
  const visibleAdminMenu = adminMenuItems.filter(item => item.roles.some(role => hasRole(role)));

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      {/* 1행: 로고 바 — 진한 배경 */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white">
        <div className="flex items-center justify-between px-4 h-11">
          {/* 로고 */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">새가족부 바나바시스템</span>
          </NavLink>

          {/* 오른쪽: 관리메뉴 + 프로필 + 로그아웃 */}
          <div className="flex items-center gap-1">
            {/* 관리 드롭다운 */}
            {visibleAdminMenu.length > 0 && (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    menuOpen ? 'bg-white/25 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'
                  )}
                >
                  관리메뉴
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', menuOpen && 'rotate-180')} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {visibleAdminMenu.map(item => {
                      const isActive = location.pathname.startsWith(item.to);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <item.icon className="w-4 h-4 opacity-60" />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 구분선 */}
            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* 프로필 */}
            <div className="flex items-center gap-1.5 px-1.5">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-semibold text-white">
                  {user?.name?.[0] || '?'}
                </span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-medium text-white">
                  {user?.name}{(user as any)?.volunteer?.name && `(${(user as any).volunteer.name})`}
                </p>
                <p className="text-[10px] text-white/60">{getRoleLabel(user?.role || '')}</p>
              </div>
            </div>

            {/* 로그아웃 */}
            <button
              onClick={logout}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-md transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2행: 탭 네비게이션 — 밝은 배경 */}
      <nav className="bg-white border-b border-gray-200">
        <div className="flex">
          {visibleTabs.map(item => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={cn(
                  'flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-medium transition-all relative whitespace-nowrap',
                  isActive
                    ? 'text-primary-700'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary-600')} />
                {item.label}
                {/* 활성 인디케이터 */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
