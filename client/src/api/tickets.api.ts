import { apiClient } from './client.js';
import {
  Ticket,
  TicketEvent,
  WorkLog,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  RiskScore,
  TechnicianRoutingRank
} from '../types/index.js';

export interface TicketDetailsResponse {
  ticket: Ticket;
  events: TicketEvent[];
  workLogs: WorkLog[];
}

export interface GetTicketsParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigneeId?: string;
  requesterId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const ticketsApi = {
  getTickets: async (params: GetTicketsParams = {}): Promise<{ tickets: Ticket[]; meta?: any }> => {
    const res = await apiClient.get('/tickets', { params });
    return {
      tickets: res.data.data.tickets,
      meta: res.data.meta
    };
  },

  getTicketById: async (id: string): Promise<TicketDetailsResponse> => {
    const res = await apiClient.get(`/tickets/${id}`);
    return res.data.data;
  },

  createTicket: async (payload: {
    title: string;
    description: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    assetId?: string;
    tags?: string[];
  }): Promise<Ticket> => {
    const res = await apiClient.post('/tickets', payload);
    return res.data.data.ticket;
  },

  transitionTicket: async (
    id: string,
    payload: {
      targetStatus: TicketStatus;
      waitingReason?: string;
      resolutionSummary?: string;
      rootCause?: string;
      reopenReason?: string;
    }
  ): Promise<Ticket> => {
    const res = await apiClient.post(`/tickets/${id}/transition`, payload);
    return res.data.data.ticket;
  },

  assignTicket: async (
    id: string,
    payload: { assigneeId?: string; teamId?: string; notes?: string }
  ): Promise<Ticket> => {
    const res = await apiClient.post(`/tickets/${id}/assign`, payload);
    return res.data.data.ticket;
  },

  addComment: async (
    id: string,
    payload: { note: string; isInternal: boolean }
  ): Promise<TicketEvent> => {
    const res = await apiClient.post(`/tickets/${id}/comments`, payload);
    return res.data.data.event;
  },

  addWorkLog: async (
    id: string,
    payload: { timeSpentMinutes: number; activityType: string; description: string }
  ): Promise<WorkLog> => {
    const res = await apiClient.post(`/tickets/${id}/work-logs`, payload);
    return res.data.data.workLog;
  },

  recalculateRisk: async (id: string): Promise<RiskScore> => {
    const res = await apiClient.post(`/tickets/${id}/recalculate-risk`);
    return res.data.data.riskScore;
  },

  getRoutingSuggestions: async (id: string): Promise<TechnicianRoutingRank[]> => {
    const res = await apiClient.get(`/tickets/${id}/routing-suggestions`);
    return res.data.data.suggestions;
  },

  autoRouteTicket: async (
    id: string
  ): Promise<{ assignedTechnician: TechnicianRoutingRank; allRankings: TechnicianRoutingRank[]; ticket: Ticket }> => {
    const res = await apiClient.post(`/tickets/${id}/auto-route`);
    return res.data.data;
  },

  getDuplicates: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/tickets/${id}/duplicates`);
    return res.data.data;
  },

  clusterTickets: async (
    parentId: string,
    childTicketIds: string[],
    reason?: string
  ): Promise<Ticket> => {
    const res = await apiClient.post(`/tickets/${parentId}/cluster`, {
      childTicketIds,
      reason
    });
    return res.data.data.ticket;
  }
};
