import mongoose from 'mongoose';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../../models/Ticket.js';
import { User } from '../../models/User.js';
import { Asset } from '../../models/Asset.js';
import { WorkLog } from '../../models/WorkLog.js';

export interface ExecutiveOverview {
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

export class AnalyticsService {
  /**
   * Generates executive KPI cards, SLA compliance rate, and MTTR aggregated by category
   */
  static async getExecutiveOverview(): Promise<ExecutiveOverview> {
    const totalTickets = await Ticket.countDocuments();
    const activeTickets = await Ticket.countDocuments({
      status: { $in: ['OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'REOPENED'] }
    });
    const resolvedTickets = await Ticket.countDocuments({ status: 'RESOLVED' });
    const closedTickets = await Ticket.countDocuments({ status: 'CLOSED' });

    // Breached tickets (response or resolution breached)
    const breachedTickets = await Ticket.countDocuments({
      $or: [
        { 'slaTimers.responseBreached': true },
        { 'slaTimers.resolutionBreached': true }
      ]
    });

    // At risk tickets (score >= 50 or imminent deadline)
    const atRiskTickets = await Ticket.countDocuments({
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'] },
      $or: [
        { 'riskScore.score': { $gte: 50 } },
        { 'slaTimers.responseBreached': true },
        { 'slaTimers.resolutionBreached': true }
      ]
    });

    // SLA Compliance Rate
    const totalResolvedOrClosed = resolvedTickets + closedTickets;
    let slaComplianceRate = 100;
    if (totalResolvedOrClosed > 0) {
      const compliantCount = await Ticket.countDocuments({
        status: { $in: ['RESOLVED', 'CLOSED'] },
        'slaTimers.responseBreached': false,
        'slaTimers.resolutionBreached': false
      });
      slaComplianceRate = Math.round((compliantCount / totalResolvedOrClosed) * 1000) / 10;
    }

    // AI Auto-enrichment rate
    const aiEnrichedCount = await Ticket.countDocuments({
      'aiAnalysis.applied': true
    });
    const aiAutoEnrichmentRate =
      totalTickets > 0 ? Math.round((aiEnrichedCount / totalTickets) * 1000) / 10 : 0;

    // MTTR calculation overall and by category
    const completedTickets = await Ticket.find({
      status: { $in: ['RESOLVED', 'CLOSED'] },
      'slaTimers.resolvedAt': { $exists: true }
    });

    let totalResolutionDurationMs = 0;
    const categoryTotals: Record<TicketCategory, { totalMs: number; count: number }> = {
      HARDWARE: { totalMs: 0, count: 0 },
      SOFTWARE: { totalMs: 0, count: 0 },
      NETWORK: { totalMs: 0, count: 0 },
      ACCESS_IAM: { totalMs: 0, count: 0 },
      SECURITY: { totalMs: 0, count: 0 }
    };

    for (const t of completedTickets) {
      if (t.slaTimers.resolvedAt) {
        const createdMs = new Date(t.createdAt).getTime();
        const resolvedMs = new Date(t.slaTimers.resolvedAt).getTime();
        const pausedMs = t.slaTimers.totalPausedDurationMs || 0;
        const netDurationMs = Math.max(0, resolvedMs - createdMs - pausedMs);

        totalResolutionDurationMs += netDurationMs;

        if (categoryTotals[t.category]) {
          categoryTotals[t.category].totalMs += netDurationMs;
          categoryTotals[t.category].count += 1;
        }
      }
    }

    const overallMTTRHours =
      completedTickets.length > 0
        ? Math.round((totalResolutionDurationMs / (completedTickets.length * 3600000)) * 10) / 10
        : 0;

    const mttrByCategory = (Object.keys(categoryTotals) as TicketCategory[]).map((cat) => {
      const item = categoryTotals[cat];
      return {
        category: cat,
        mttrHours:
          item.count > 0 ? Math.round((item.totalMs / (item.count * 3600000)) * 10) / 10 : 0,
        ticketCount: item.count
      };
    });

    // Priority Distribution
    const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const priorityDistribution = await Promise.all(
      priorities.map(async (p) => ({
        priority: p,
        count: await Ticket.countDocuments({ priority: p })
      }))
    );

    // Status Distribution
    const statuses: TicketStatus[] = [
      'OPEN',
      'TRIAGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'CLOSED',
      'REOPENED'
    ];
    const statusDistribution = await Promise.all(
      statuses.map(async (s) => ({
        status: s,
        count: await Ticket.countDocuments({ status: s })
      }))
    );

    return {
      summary: {
        totalTickets,
        activeTickets,
        resolvedTickets,
        closedTickets,
        breachedTickets,
        atRiskTickets,
        slaComplianceRate,
        overallMTTRHours,
        aiAutoEnrichmentRate
      },
      mttrByCategory,
      priorityDistribution,
      statusDistribution
    };
  }

  /**
   * Aggregates technician active queue saturation and time logs
   */
  static async getTechnicianWorkloads(): Promise<TechnicianWorkloadMetric[]> {
    const technicians = await User.find({
      role: { $in: ['TECHNICIAN', 'IT_MANAGER'] },
      active: true
    });

    const metrics: TechnicianWorkloadMetric[] = [];

    for (const tech of technicians) {
      const activeTickets = await Ticket.countDocuments({
        assigneeId: tech._id,
        status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING'] }
      });

      const resolvedTickets = await Ticket.countDocuments({
        assigneeId: tech._id,
        status: { $in: ['RESOLVED', 'CLOSED'] }
      });

      // Aggregate work log time
      const logs = await WorkLog.find({ technicianId: tech._id });
      const totalTimeLoggedMinutes = logs.reduce((acc, l) => acc + (l.timeSpentMinutes || 0), 0);

      // Average resolution duration
      const completed = await Ticket.find({
        assigneeId: tech._id,
        status: { $in: ['RESOLVED', 'CLOSED'] },
        'slaTimers.resolvedAt': { $exists: true }
      });

      let totalDurationMs = 0;
      for (const t of completed) {
        if (t.slaTimers.resolvedAt) {
          const duration =
            new Date(t.slaTimers.resolvedAt).getTime() - new Date(t.createdAt).getTime();
          totalDurationMs += Math.max(0, duration - (t.slaTimers.totalPausedDurationMs || 0));
        }
      }

      const averageResolutionHours =
        completed.length > 0
          ? Math.round((totalDurationMs / (completed.length * 3600000)) * 10) / 10
          : 0;

      metrics.push({
        technicianId: tech._id.toString(),
        name: tech.name,
        email: tech.email,
        department: tech.department,
        skills: tech.skills || [],
        activeTickets,
        resolvedTickets,
        totalTimeLoggedMinutes,
        averageResolutionHours
      });
    }

    // Sort by active tickets descending
    metrics.sort((a, b) => b.activeTickets - a.activeTickets);

    return metrics;
  }

  /**
   * Retrieves asset reliability and incident frequency matrix
   */
  static async getAssetFailureAnalytics(): Promise<AssetFailureMetric[]> {
    const assets = await Asset.find().lean();

    const metrics: AssetFailureMetric[] = assets.map((asset: any) => ({
      assetId: asset._id.toString(),
      assetTag: asset.assetTag,
      name: asset.name,
      type: asset.type,
      vendor: asset.vendor,
      location: asset.location,
      isCritical: asset.isCritical,
      incidentCount: (asset.incidentTicketIds || []).length
    }));

    // Sort by incidentCount descending
    metrics.sort((a, b) => b.incidentCount - a.incidentCount);

    return metrics.slice(0, 15);
  }
}
