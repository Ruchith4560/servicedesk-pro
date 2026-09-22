import mongoose from 'mongoose';
import { SLAPolicy, ISLAPolicy } from '../../models/SLAPolicy.js';
import { Ticket, ITicket, TicketPriority, TicketCategory } from '../../models/Ticket.js';
import { TicketEvent } from '../../models/TicketEvent.js';
import { Notification } from '../../models/Notification.js';
import { User } from '../../models/User.js';
import { SLACalculator } from './sla.calculator.js';
import { logger } from '../../utils/logger.js';
import { CacheService } from '../../utils/cache.service.js';

export class SLAEngine {
  /**
   * Find matching SLA policy with in-memory TTL caching
   * (Category-specific policy takes precedence over generic priority policy).
   */
  static async matchPolicy(
    priority: TicketPriority,
    category?: TicketCategory,
    useCache: boolean = process.env.NODE_ENV !== 'test'
  ): Promise<ISLAPolicy | null> {
    if (!useCache) {
      let policy = await SLAPolicy.findOne({ priority, category, active: true });
      if (!policy && category) {
        policy = await SLAPolicy.findOne({ priority, category: { $exists: false }, active: true });
      }
      if (!policy) {
        policy = await SLAPolicy.findOne({ priority, active: true });
      }
      return policy;
    }

    const cacheKey = `sla:policy:${priority}:${category || 'default'}`;
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        // 1. Try category + priority exact match
        let policy = await SLAPolicy.findOne({ priority, category, active: true });
        if (!policy && category) {
          // 2. Fallback to generic priority-only policy
          policy = await SLAPolicy.findOne({ priority, category: { $exists: false }, active: true });
        }
        if (!policy) {
          // 3. Fallback to any active policy with that priority
          policy = await SLAPolicy.findOne({ priority, active: true });
        }
        return policy;
      },
      300000 // 5-minute TTL cache
    );
  }

  /**
   * Apply matching SLA policy to a ticket and compute initial deadlines.
   */
  static async applySLAPolicyToTicket(ticket: ITicket): Promise<ITicket> {
    const policy = await this.matchPolicy(ticket.priority, ticket.category);
    if (!policy) {
      logger.warn(`[SLAEngine] No active SLA policy found for priority ${ticket.priority}`);
      return ticket;
    }

    const now = ticket.createdAt || new Date();

    const responseDeadline = SLACalculator.calculateDeadline(
      now,
      policy.responseTimeHours,
      policy.businessHoursOnly,
      policy.businessHours
    );

    const resolutionDeadline = SLACalculator.calculateDeadline(
      now,
      policy.resolutionTimeHours,
      policy.businessHoursOnly,
      policy.businessHours
    );

    ticket.slaPolicyId = policy._id;
    ticket.slaTimers = {
      responseDeadline,
      resolutionDeadline,
      responseBreached: false,
      resolutionBreached: false,
      isPaused: false,
      totalPausedDurationMs: 0
    };

    return ticket;
  }

  /**
   * Evaluates all active tickets for impending warnings and breaches.
   */
  static async evaluateSLAs(now = new Date()): Promise<{
    evaluatedCount: number;
    warningsTriggered: number;
    breachesTriggered: number;
  }> {
    const activeTickets = await Ticket.find({
      status: { $nin: ['RESOLVED', 'CLOSED'] }
    }).populate('slaPolicyId');

    let warningsTriggered = 0;
    let breachesTriggered = 0;

    // Load managers/admins for escalation notifications
    const itManagers = await User.find({
      role: { $in: ['IT_MANAGER', 'SYSTEM_ADMIN'] },
      active: true
    }).select('_id email');

    for (const ticket of activeTickets) {
      let modified = false;
      const policy = ticket.slaPolicyId as any as ISLAPolicy;
      const warningThreshold = policy?.warningThresholdPercent || 75;

      // 1. Evaluate First Response SLA
      if (
        ticket.slaTimers?.responseDeadline &&
        !ticket.slaTimers.firstRespondedAt &&
        !ticket.slaTimers.responseBreached &&
        now > new Date(ticket.slaTimers.responseDeadline)
      ) {
        ticket.slaTimers.responseBreached = true;
        modified = true;
        breachesTriggered++;

        await TicketEvent.create({
          ticketId: ticket._id,
          actorId: ticket.assigneeId || ticket.requesterId,
          eventType: 'SLA_BREACHED',
          note: `Response SLA breached. Target deadline was ${ticket.slaTimers.responseDeadline.toISOString()}`,
          isInternal: false
        });

        // Notify assignee and managers
        const recipients = [
          ...(ticket.assigneeId ? [ticket.assigneeId] : []),
          ...itManagers.map((m) => m._id)
        ];

        for (const recipientId of recipients) {
          await Notification.create({
            recipientId,
            type: 'SLA_BREACH',
            title: `Response SLA Breached: ${ticket.ticketNumber}`,
            message: `Ticket ${ticket.ticketNumber} ("${ticket.title}") has breached its initial response SLA target.`,
            linkUrl: `/workspace/tickets/${ticket._id}`
          });
        }
      }

      // 2. Evaluate Resolution SLA (Only if not currently PAUSED in WAITING status)
      if (ticket.slaTimers?.resolutionDeadline) {
        const resolutionDeadline = new Date(ticket.slaTimers.resolutionDeadline);
        const createdAt = new Date(ticket.createdAt);
        const pausedMs = ticket.slaTimers.totalPausedDurationMs || 0;

        // If ticket is currently paused in WAITING, we don't breach or warn
        if (ticket.slaTimers.isPaused) {
          continue;
        }

        const totalWindowMs = resolutionDeadline.getTime() - createdAt.getTime();
        const effectiveElapsedMs = now.getTime() - createdAt.getTime() - pausedMs;
        const consumedPercent = totalWindowMs > 0 ? (effectiveElapsedMs / totalWindowMs) * 100 : 100;

        // Check Resolution Breach
        if (now > resolutionDeadline && !ticket.slaTimers.resolutionBreached) {
          ticket.slaTimers.resolutionBreached = true;
          ticket.riskScore.score = 95;
          if (!ticket.riskScore.factors.includes('SLA_BREACHED')) {
            ticket.riskScore.factors.push('SLA_BREACHED');
          }
          modified = true;
          breachesTriggered++;

          await TicketEvent.create({
            ticketId: ticket._id,
            actorId: ticket.assigneeId || ticket.requesterId,
            eventType: 'SLA_BREACHED',
            note: `Resolution SLA breached. Consumed ${Math.round(consumedPercent)}% of target time window.`,
            isInternal: false
          });

          // Escalation notification
          for (const manager of itManagers) {
            await Notification.create({
              recipientId: manager._id,
              type: 'TICKET_ESCALATED',
              title: `Critical SLA Escalation: ${ticket.ticketNumber}`,
              message: `Ticket ${ticket.ticketNumber} [${ticket.priority}] has breached its resolution SLA. Automatic escalation triggered.`,
              linkUrl: `/workspace/tickets/${ticket._id}`
            });
          }
        }
        // Check Warning Threshold (e.g. consumed >= 75%)
        else if (consumedPercent >= warningThreshold && !ticket.slaTimers.resolutionBreached) {
          const hasWarningEvent = await TicketEvent.exists({
            ticketId: ticket._id,
            eventType: 'SLA_WARNING'
          });

          if (!hasWarningEvent) {
            warningsTriggered++;
            ticket.riskScore.score = Math.max(ticket.riskScore.score, 75);
            if (!ticket.riskScore.factors.includes('SLA_WARNING_THRESHOLD')) {
              ticket.riskScore.factors.push('SLA_WARNING_THRESHOLD');
            }
            modified = true;

            await TicketEvent.create({
              ticketId: ticket._id,
              actorId: ticket.assigneeId || ticket.requesterId,
              eventType: 'SLA_WARNING',
              note: `SLA Warning: ${Math.round(consumedPercent)}% of resolution window consumed. Immediate action advised.`,
              isInternal: false
            });

            if (ticket.assigneeId) {
              await Notification.create({
                recipientId: ticket.assigneeId,
                type: 'SLA_WARNING',
                title: `SLA Warning Threshold: ${ticket.ticketNumber}`,
                message: `Ticket ${ticket.ticketNumber} is at ${Math.round(consumedPercent)}% of its SLA deadline.`,
                linkUrl: `/workspace/tickets/${ticket._id}`
              });
            }
          }
        }
      }

      if (modified) {
        await ticket.save();
      }
    }

    return {
      evaluatedCount: activeTickets.length,
      warningsTriggered,
      breachesTriggered
    };
  }
}
