import { create } from 'zustand';
import { User, RoleInfo } from '@/types';
import api from './api';

// ── JWT decoder (client-side, no verification needed) ─────────────

function decodeJWT(token: string): { userId: number; email: string; activeRole: string; permissions: string[] } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────

const COOKIE_MAX_AGE = 604800; // 7 days

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

function applyToken(token: string) {
  localStorage.setItem('token', token);
  setCookie('ist_token', token);
  const decoded = decodeJWT(token);
  if (decoded?.activeRole) setCookie('ist_role', decoded.activeRole);
  return decoded;
}

function clearAuth() {
  localStorage.removeItem('token');
  clearCookie('ist_token');
  clearCookie('ist_role');
}

// ── Store ─────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  activeRole: string | null;
  roles: RoleInfo[];
  permissions: string[];
  requireRoleSelection: boolean;
  tempToken: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  selectRole: (roleId: number) => Promise<void>;
  hasPermission: (code: string) => boolean;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
  fetchRoles: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:                null,
  token:               typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  activeRole:          null,
  roles:               [],
  permissions:         [],
  requireRoleSelection: false,
  tempToken:           null,
  isLoading:           false,

  // ── login ───────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data.data;

      if (data.requireRoleSelection) {
        set({
          requireRoleSelection: true,
          tempToken: data.tempToken,
          roles: data.roles,
          user: data.user,
          isLoading: false,
        });
        return;
      }

      const decoded = applyToken(data.token);
      set({
        token:       data.token,
        user:        data.user,
        activeRole:  decoded?.activeRole ?? null,
        permissions: decoded?.permissions ?? [],
        isLoading:   false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ── selectRole ──────────────────────────────────────────────────
  selectRole: async (roleId: number) => {
    const { tempToken, token } = get();
    const authToken = tempToken ?? token; // tempToken during login flow, token when switching
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/select-role', { roleId }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const { token, user } = res.data.data;
      const decoded = applyToken(token);
      set({
        token,
        user,
        activeRole:           decoded?.activeRole ?? null,
        permissions:          decoded?.permissions ?? [],
        requireRoleSelection: false,
        tempToken:            null,
        isLoading:            false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ── hasPermission ───────────────────────────────────────────────
  hasPermission: (code: string) => {
    return get().permissions.includes(code);
  },

  // ── loginWithGoogle ─────────────────────────────────────────────
  loginWithGoogle: async (token: string) => {
    const decoded = applyToken(token);
    set({ token, activeRole: decoded?.activeRole ?? null, permissions: decoded?.permissions ?? [] });
    try {
      const [meRes, rolesRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/my-roles'),
      ]);
      set({ user: meRes.data.data, roles: rolesRes.data.data ?? [] });
    } catch {
      clearAuth();
      set({ user: null, token: null, activeRole: null, permissions: [], roles: [] });
      throw new Error('Failed to fetch user profile');
    }
  },

  // ── logout ──────────────────────────────────────────────────────
  logout: () => {
    try { api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    set({ user: null, token: null, activeRole: null, permissions: [], roles: [], requireRoleSelection: false, tempToken: null });
  },

  // ── refresh ─────────────────────────────────────────────────────
  refresh: async () => {
    try {
      const res = await api.post('/auth/refresh', {}, { withCredentials: true });
      const { token } = res.data.data;
      const decoded = applyToken(token);
      set({ token, activeRole: decoded?.activeRole ?? null, permissions: decoded?.permissions ?? [] });
    } catch {
      // refresh failed, leave state as-is
    }
  },

  // ── fetchRoles ──────────────────────────────────────────────────
  fetchRoles: async () => {
    try {
      const res = await api.get('/auth/my-roles');
      set({ roles: res.data.data ?? [] });
    } catch { /* ignore */ }
  },

  // ── fetchMe ─────────────────────────────────────────────────────
  fetchMe: async () => {
    try {
      const [meRes, rolesRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/my-roles'),
      ]);
      const user = meRes.data.data;
      const userRoles = rolesRes.data.data ?? [];
      const token = localStorage.getItem('token');
      const decoded = token ? decodeJWT(token) : null;
      set({ user, roles: userRoles, activeRole: decoded?.activeRole ?? null, permissions: decoded?.permissions ?? [] });
    } catch {
      clearAuth();
      set({ user: null, token: null, activeRole: null, permissions: [], roles: [] });
    }
  },
}));
