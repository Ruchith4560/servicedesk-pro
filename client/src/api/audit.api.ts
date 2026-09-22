import { apiClient } from './client';
import { AuditEvent, AuditSeverity } from '../types';

export interface AuditQueryParams {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorEmail?: string;
  severity?: AuditSeverity;
  page?: number;
  limit?: number;
}

export interface AuditEventsResponse {
  events: AuditEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const auditApi = {
  getAuditEvents: async (params: AuditQueryParams = {}): Promise<AuditEventsResponse> => {
    const response = await apiClient.get('/audit', { params });
    return {
      events: response.data.data.events,
      meta: response.data.meta
    };
  }
};
