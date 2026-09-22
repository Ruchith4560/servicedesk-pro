import { apiClient } from './client.js';
import { TicketCategory, TicketPriority, TicketStatus } from '../types/index.js';

export interface ExecutiveOverviewData {
  summary: {
    totalTickets: number;
    activeTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    breachedTickets: number;
    atRiskTickets: number;
    slaComplianceRate: number;
    overallMTTRHours: number;
    aiAutoEnrichmentRate: number;
  };
  mttrByCategory: {
    category: TicketCategory;
    mttrHours: number;
    ticketCount: number;
  }[];
  priorityDistribution: {
    priority: TicketPriority;
    count: number;
  }[];
  statusDistribution: {
    status: TicketStatus;
    count: number;
  }[];
}

export interface TechnicianWorkloadMetric {
  technicianId: string;
  name: string;
  email: string;
  department: string;
  skills: string[];
  activeTickets: number;
  resolvedTickets: number;
  totalTimeLoggedMinutes: number;
  averageResolutionHours: number;
}

export interface AssetFailureMetric {
  assetId: string;
  assetTag: string;
  name: string;
  type: string;
  vendor: string;
  location: string;
  isCritical: boolean;
  incidentCount: number;
}

export const analyticsApi = {
  getOverview: async (): Promise<ExecutiveOverviewData> => {
    const res = await apiClient.get('/analytics/overview');
    return res.data.data;
  },

  getTechnicians: async (): Promise<TechnicianWorkloadMetric[]> => {
    const res = await apiClient.get('/analytics/technicians');
    return res.data.data.technicians;
  },

  getAssets: async (): Promise<AssetFailureMetric[]> => {
    const res = await apiClient.get('/analytics/assets');
    return res.data.data.assets;
  }
};
