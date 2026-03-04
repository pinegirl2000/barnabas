import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, loading, logout } = useAuthStore();

  const hasRole = (...roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = hasRole('ADMIN');
  const isFamilyTeam = hasRole('ADMIN', 'FAMILY_TEAM');
  const isVolunteer = hasRole('VOLUNTEER');

  return { user, loading, logout, hasRole, isAdmin, isFamilyTeam, isVolunteer };
}
