import { ITicket, RiskLevel } from '../../models/Ticket.js';
import { Asset } from '../../models/Asset.js';

export interface CalculatedRisk {
  score: number;
  level: RiskLevel;
  factors: string[];
  calculatedAt: Date;
}

export class RiskEngine {
  /**
   * Deterministic Multi-Factor Risk Calculation Engine
   * Returns calculated risk score (0-100), risk level, and contributing factors.
   */
  static async calculateRiskScore(ticket: ITicket): Promise<CalculatedRisk> {
    let score = 0;
    const factors: string[] = [];

    // 1. Priority Baseline Weight
    switch (ticket.priority) {
      case 'CRITICAL':
        score += 50;
        factors.push('PRIORITY_CRITICAL');
        break;
      case 'HIGH':
        score += 30;
        factors.push('PRIORITY_HIGH');
        break;
      case 'MEDIUM':
        score += 15;
        factors.push('PRIORITY_MEDIUM');
        break;
      case 'LOW':
      default:
        score += 5;
        factors.push('PRIORITY_LOW');
        break;
    }

    // 2. Category Sensitivity (Security Incidents)
    if (ticket.category === 'SECURITY') {
      score += 30;
      factors.push('SECURITY_INCIDENT');
    }

    // 3. Asset Infrastructure Criticality & Incident History
    if (ticket.assetId) {
      try {
        const asset = await Asset.findById(ticket.assetId);
        if (asset) {
          if (asset.isCritical) {
            score += 25;
            factors.push('CRITICAL_INFRASTRUCTURE_ASSET');
          }
          if (asset.incidentTicketIds && asset.incidentTicketIds.length >= 3) {
            score += 15;
            factors.push('REPEATED_ASSET_FAILURES');
          }
        }
      } catch {
        // Asset lookup resilience
      }
    }

    // 4. SLA Timers & Breach Status
    if (ticket.slaTimers) {
      if (ticket.slaTimers.responseBreached || ticket.slaTimers.resolutionBreached) {
        score += 25;
        factors.push('SLA_BREACHED');
      } else if (ticket.slaTimers.resolutionDeadline && !ticket.slaTimers.resolvedAt) {
        const now = Date.now();
        const deadline = new Date(ticket.slaTimers.resolutionDeadline).getTime();
        const remainingMs = deadline - now;

        // Less than 2 hours remaining
        if (remainingMs > 0 && remainingMs <= 2 * 60 * 60 * 1000) {
          score += 15;
          factors.push('SLA_BREACH_IMMINENT');
        }
      }
    }

    // 5. Reopen Frequency (Chronic Unresolved Issue)
    if (ticket.reopenCount >= 2) {
      score += 20;
      factors.push('CHRONIC_REOPEN_LOOP');
    } else if (ticket.reopenCount === 1) {
      score += 10;
      factors.push('TICKET_REOPENED');
    }

    // 6. Major Incident & Duplicate Cluster Blast Radius
    if (ticket.isMajorIncident) {
      score += 25;
      factors.push('MAJOR_INCIDENT_DECLARED');
    }
    if (ticket.duplicateTickets && ticket.duplicateTickets.length > 0) {
      const clusterBoost = Math.min(30, ticket.duplicateTickets.length * 10);
      score += clusterBoost;
      factors.push(`INCIDENT_CLUSTER_${ticket.duplicateTickets.length}_REPORTERS`);
    }

    // Cap between 0 and 100
    const finalScore = Math.min(100, Math.max(0, score));

    // Determine Risk Level
    let level: RiskLevel = 'LOW';
    if (finalScore >= 75) {
      level = 'CRITICAL';
    } else if (finalScore >= 50) {
      level = 'HIGH';
    } else if (finalScore >= 25) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    return {
      score: finalScore,
      level,
      factors,
      calculatedAt: new Date()
    };
  }

  /**
   * Evaluates and mutates ticket's riskScore object
   */
  static async applyRiskScoreToTicket(ticket: ITicket): Promise<void> {
    const calculated = await this.calculateRiskScore(ticket);
    ticket.riskScore = {
      score: calculated.score,
      level: calculated.level,
      factors: calculated.factors,
      calculatedAt: calculated.calculatedAt
    };
  }
}
