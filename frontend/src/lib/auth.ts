import { create } from 'zustand';
import { User } from '@/types';
import api from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;
      localStorage.setItem('token', token);
      if (typeof document !== 'undefined') {
        document.cookie = `ist_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `ist_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
      }
      set({ token, user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async (token: string) => {
    localStorage.setItem('token', token);
    if (typeof document !== 'undefined') {
      document.cookie = `ist_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    }
    set({ token });
    try {
      const res = await api.get('/auth/me');
      const user = res.data.data;
      if (typeof document !== 'undefined') {
        document.cookie = `ist_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
      }
      set({ user });
    } catch {
      localStorage.removeItem('token');
      set({ token: null });
      throw new Error('Failed to fetch user profile');
    }
  },

  logout: () => {
    try {
      api.post('/auth/logout');
    } catch {
      // ignore errors on logout
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'ist_token=; path=/; max-age=0';
      document.cookie = 'ist_role=; path=/; max-age=0';
    }
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  refresh: async () => {
    try {
      const res = await api.post('/auth/refresh', {}, { withCredentials: true });
      const { token } = res.data.data;
      localStorage.setItem('token', token);
      if (typeof document !== 'undefined') {
        document.cookie = `ist_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }
      set({ token });
    } catch {
      // refresh failed, leave state as-is
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data });
    } catch {
      localStorage.removeItem('token');
      if (typeof document !== 'undefined') {
        document.cookie = 'ist_token=; path=/; max-age=0';
      }
      set({ user: null, token: null });
    }
  },
}));
