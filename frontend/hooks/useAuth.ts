import { create } from 'zustand';
import { AuthUser, fetchMe, logout as serviceLogout } from '@/services/auth';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, loading: false }),
  refreshUser: async () => {
    set({ loading: true });
    try {
      const user = await fetchMe();
      set({ user, loading: false, initialized: true });
    } catch (error) {
      set({ user: null, loading: false, initialized: true });
    }
  },
  logout: () => {
    serviceLogout();
    set({ user: null, loading: false });
    window.location.href = '/login';
  },
}));
