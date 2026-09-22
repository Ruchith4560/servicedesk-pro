import { create } from 'zustand';
import { User } from '../types/index.js';
import { authApi } from '../api/auth.api.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setUser: (user: User | null, token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('sdp_access_token'),
  isAuthenticated: !!localStorage.getItem('sdp_access_token'),
  isLoading: true,

  initAuth: async () => {
    const token = localStorage.getItem('sdp_access_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('sdp_access_token');
      localStorage.removeItem('sdp_refresh_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('sdp_access_token', data.accessToken);
    localStorage.setItem('sdp_refresh_token', data.refreshToken);
    set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await authApi.logout();
    localStorage.removeItem('sdp_access_token');
    localStorage.removeItem('sdp_refresh_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user, token) => {
    if (token) {
      localStorage.setItem('sdp_access_token', token);
    } else {
      localStorage.removeItem('sdp_access_token');
    }
    set({ user, token, isAuthenticated: !!token, isLoading: false });
  }
}));
