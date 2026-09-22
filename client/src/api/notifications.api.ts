import { apiClient } from './client';
import { AppNotification } from '../types';

export const notificationsApi = {
  getNotifications: async (
    unreadOnly: boolean = false
  ): Promise<{ notifications: AppNotification[]; unreadCount: number }> => {
    const response = await apiClient.get('/notifications', {
      params: unreadOnly ? { unread: 'true' } : {}
    });
    return response.data.data;
  },

  markAsRead: async (id: string): Promise<AppNotification> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data.data.notification;
  },

  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data.data;
  }
};
