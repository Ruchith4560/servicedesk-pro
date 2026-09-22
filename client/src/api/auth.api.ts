import { apiClient } from './client.js';
import { User } from '../types/index.js';

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data.user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    }
  }
};
