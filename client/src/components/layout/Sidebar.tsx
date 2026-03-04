import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Grid3X3,
  Heart,
  Building2,
  Shield,
  LogOut,
  GraduationCap,
  ClipboardList,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER', 'ZONE_LEADER'] },
  { to: '/families', icon: Users, label: '바나바교육 현황', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/registrations', icon: ClipboardList, label: '새가족 등록 현황', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/families/new', icon: UserPlus, label: '새가족 등록', roles: ['ADMIN', 'FAMILY_TEAM'] },
  { to: '/graduated', icon: GraduationCap, label: '바나바 수료완료 현황', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/phone-visits', icon: Phone, label: '전화심방 예정', roles: ['ADMIN', 'FAMILY_TEAM', 'VOLUNTEER'] },
  { to: '/assignments', icon: Grid3X3, label: '테이블 배정 현황', roles: ['ADMIN', 'FAMILY_TEAM'] },
  { to: '/volunteers', icon: Heart, label: '바나바 관리', roles: ['ADMIN'] },
  { to: '/districts', icon: Building2, label: '교구/구역', roles: ['ADMIN'] },
  { to: '/admin', icon: Shield, label: '관리자', roles: ['ADMIN'] },
];

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-700">새가족부 바나바시스템</h1>
        <p className="text-sm text-gray-500 mt-1">새가족 관리 시스템</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter(item => item.roles.some(role => hasRole(role)))
          .map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {user?.name?.[0] || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN': return '관리자';
    case 'FAMILY_TEAM': return '새가족팀';
    case 'VOLUNTEER': return '바나바';
    case 'ZONE_LEADER': return '구역장';
    default: return role;
  }
}
