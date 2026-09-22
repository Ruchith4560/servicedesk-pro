import { Ticket, ITicket, TicketCategory } from '../../models/Ticket.js';
import { User, IUser } from '../../models/User.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthUserPayload } from '../../types/auth.types.js';
import { TicketsService } from './tickets.service.js';

export interface TechnicianRoutingRank {
  technicianId: string;
  name: string;
  email: string;
  department: string;
  skills: string[];
  matchedSkills: string[];
  activeTicketCount: number;
  scores: {
    skillScore: number;
    workloadScore: number;
    affinityScore: number;
    compositeScore: number;
  };
  rationale: string;
}

const CATEGORY_DEFAULT_SKILLS: Record<TicketCategory, string[]> = {
  HARDWARE: ['Hardware Diagnostics', 'Laptop Repair', 'Peripheral Configuration'],
  NETWORK: ['Networking', 'VPN', 'Cisco AnyConnect'],
  ACCESS_IAM: ['Active Directory', 'Azure AD', 'SSO & MFA'],
  SECURITY: ['Platform Security', 'Threat Mitigation', 'Incident Command'],
  SOFTWARE: ['Windows 11', 'macOS', 'Microsoft 365']
};

export class RoutingEngine {
  /**
   * Evaluates active technicians and ranks them by skill match, workload, and asset affinity
   */
  static async getRoutingSuggestions(ticketId: string): Promise<TechnicianRoutingRank[]> {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Determine target required skills
    let targetSkills = ticket.aiAnalysis?.suggestedSkills || [];
    if (targetSkills.length === 0) {
      targetSkills = CATEGORY_DEFAULT_SKILLS[ticket.category] || [];
    }

    // Retrieve active technicians and operations managers
    const technicians = await User.find({
      role: { $in: ['TECHNICIAN', 'IT_MANAGER'] },
      active: true
    });

    if (technicians.length === 0) {
      return [];
    }

    const rankings: TechnicianRoutingRank[] = [];

    for (const tech of technicians) {
      const techSkills = tech.skills || [];

      // 1. Skill Match Score (0 - 50 points)
      const matchedSkills = techSkills.filter((s) =>
        targetSkills.some((ts) => ts.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(ts.toLowerCase()) || ts.toLowerCase().includes(s.toLowerCase()))
      );

      let skillScore = 0;
      if (targetSkills.length > 0) {
        skillScore = Math.min(50, Math.round((matchedSkills.length / targetSkills.length) * 50));
      } else {
        skillScore = 25; // Neutral baseline if no specific skills tagged
      }

      // 2. Workload Balancing Score (0 - 35 points)
      const activeTicketCount = await Ticket.countDocuments({
        assigneeId: tech._id,
        status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING'] }
      });

      let workloadScore = 35;
      if (activeTicketCount === 0) {
        workloadScore = 35;
      } else if (activeTicketCount === 1) {
        workloadScore = 28;
      } else if (activeTicketCount === 2) {
        workloadScore = 22;
      } else if (activeTicketCount <= 4) {
        workloadScore = 14;
      } else {
        workloadScore = Math.max(0, 35 - activeTicketCount * 7);
      }

      // 3. Asset & Domain Affinity Score (0 - 15 points)
      let affinityScore = 5;
      let affinityReason = 'Standard domain assignment';

      if (ticket.assetId) {
        const priorAssetResolutions = await Ticket.countDocuments({
          assetId: ticket.assetId,
          assigneeId: tech._id,
          status: { $in: ['RESOLVED', 'CLOSED'] }
        });

        if (priorAssetResolutions > 0) {
          affinityScore = 15;
          affinityReason = `Resolved ${priorAssetResolutions} previous incident(s) on linked asset`;
        } else if (tech.department === 'IT Support') {
          affinityScore = 10;
          affinityReason = 'IT Support primary tier affinity';
        }
      } else if (tech.department === 'IT Support') {
        affinityScore = 10;
        affinityReason = 'IT Support core department';
      }

      const compositeScore = Math.min(100, Math.round(skillScore + workloadScore + affinityScore));

      const rationale = matchedSkills.length > 0
        ? `Matched ${matchedSkills.length} skill(s) (${matchedSkills.join(', ')}). Workload: ${activeTicketCount} active tickets. ${affinityReason}. Composite rating: ${compositeScore}/100.`
        : `Available with ${activeTicketCount} active tickets. ${affinityReason}. Composite rating: ${compositeScore}/100.`;

      rankings.push({
        technicianId: tech._id.toString(),
        name: tech.name,
        email: tech.email,
        department: tech.department,
        skills: techSkills,
        matchedSkills,
        activeTicketCount,
        scores: {
          skillScore,
          workloadScore,
          affinityScore,
          compositeScore
        },
        rationale
      });
    }

    // Sort by composite score descending
    rankings.sort((a, b) => b.scores.compositeScore - a.scores.compositeScore);

    return rankings;
  }

  /**
   * Automatically assigns ticket to the #1 ranked technician
   */
  static async autoRouteTicket(
    ticketId: string,
    manager: AuthUserPayload,
    meta: { ip?: string; userAgent?: string } = {}
  ): Promise<{ assignedTechnician: TechnicianRoutingRank; allRankings: TechnicianRoutingRank[]; ticket: ITicket }> {
    const rankings = await this.getRoutingSuggestions(ticketId);

    if (rankings.length === 0) {
      throw new AppError('No active technicians available for auto-routing', 400, 'NO_ELIGIBLE_TECHNICIANS');
    }

    const topCandidate = rankings[0];

    // Assign via TicketsService
    const ticket = await TicketsService.assignTicket(
      ticketId,
      {
        assigneeId: topCandidate.technicianId,
        notes: `[Auto-Route] Assigned to ${topCandidate.name}: ${topCandidate.rationale}`
      },
      manager,
      meta
    );

    return {
      assignedTechnician: topCandidate,
      allRankings: rankings,
      ticket
    };
  }
}
