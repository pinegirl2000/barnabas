import { create } from 'zustand';
import { api } from '../api/client';

interface User {
  id: string;
  kakaoId: string;
  email: string | null;
  name: string;
  role: 'ADMIN' | 'FAMILY_TEAM' | 'VOLUNTEER' | 'ZONE_LEADER' | 'USER';
  isFirstLogin: boolean;
  volunteerStatus: 'NONE' | 'PENDING' | 'APPROVED';
  volunteerId: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  login: async (token: string) => {
    localStorage.setItem('token', token);
    try {
      const user = await api.getMe();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, loading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
}));
