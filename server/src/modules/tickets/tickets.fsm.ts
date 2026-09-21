import { TicketStatus } from '../../models/Ticket.js';
import { UserRole } from '../../models/User.js';
import { AppError } from '../../middleware/error.middleware.js';

export const VALID_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ['TRIAGED', 'ASSIGNED'],
  TRIAGED: ['ASSIGNED', 'IN_PROGRESS'],
  ASSIGNED: ['IN_PROGRESS', 'TRIAGED'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'ASSIGNED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: [], // Terminal state
  REOPENED: ['IN_PROGRESS', 'ASSIGNED']
} as const;

export interface TransitionContext {
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  actorRole: UserRole;
  isRequester: boolean;
  isAssignee: boolean;
  hasAssignee: boolean;
  waitingReason?: string;
  resolutionSummary?: string;
  rootCause?: string;
  reopenReason?: string;
  resolvedAt?: Date;
}

export class TicketStateMachine {
  /**
   * Check if a transition is syntactically allowed in the state graph.
   */
  static isAllowedTransition(from: TicketStatus, to: TicketStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Validate business rules and role permissions for a state transition.
   * Throws descriptive AppError on rule violation.
   */
  static validateTransition(context: TransitionContext): void {
    const { fromStatus, toStatus, actorRole, isRequester, hasAssignee } = context;

    // 1. Closed is a terminal state
    if (fromStatus === 'CLOSED') {
      throw new AppError(
        'Ticket is permanently CLOSED and cannot be modified.',
        400,
        'TICKET_CLOSED_TERMINAL'
      );
    }

    // 2. Check State Machine Graph
    if (!this.isAllowedTransition(fromStatus, toStatus)) {
      throw new AppError(
        `Invalid state transition: Cannot move ticket from '${fromStatus}' to '${toStatus}'.`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    // 3. Transition to IN_PROGRESS requires an assigned technician
    if (toStatus === 'IN_PROGRESS' && !hasAssignee) {
      throw new AppError(
        'A ticket must be assigned to a technician before starting investigation (IN_PROGRESS).',
        400,
        'ASSIGNMENT_REQUIRED'
      );
    }

    // 4. Transition to WAITING requires non-empty reason
    if (toStatus === 'WAITING') {
      if (!context.waitingReason || context.waitingReason.trim().length < 5) {
        throw new AppError(
          'Transition to WAITING requires a clear waiting reason (minimum 5 characters).',
          400,
          'WAITING_REASON_REQUIRED'
        );
      }
    }

    // 5. Transition to RESOLVED requires resolution summary and root cause
    if (toStatus === 'RESOLVED') {
      if (actorRole === 'EMPLOYEE') {
        throw new AppError(
          'Employees cannot resolve tickets. Resolution must be provided by a technician or manager.',
          403,
          'RESOLVE_FORBIDDEN'
        );
      }
      if (!context.resolutionSummary || context.resolutionSummary.trim().length < 10) {
        throw new AppError(
          'Resolving a ticket requires a detailed resolution summary (minimum 10 characters).',
          400,
          'RESOLUTION_SUMMARY_REQUIRED'
        );
      }
      if (!context.rootCause || context.rootCause.trim().length < 3) {
        throw new AppError(
          'Resolving a ticket requires classifying the root cause.',
          400,
          'ROOT_CAUSE_REQUIRED'
        );
      }
    }

    // 6. Transition to CLOSED: Requester confirmation or System Admin
    if (toStatus === 'CLOSED') {
      if (!isRequester && actorRole !== 'SYSTEM_ADMIN' && actorRole !== 'IT_MANAGER') {
        throw new AppError(
          'Only the ticket requester or an IT manager can confirm resolution and close the ticket.',
          403,
          'CLOSE_FORBIDDEN'
        );
      }
    }

    // 7. Transition to REOPENED: Only within 14 days of resolution by requester or admin
    if (toStatus === 'REOPENED') {
      if (!isRequester && actorRole !== 'SYSTEM_ADMIN') {
        throw new AppError(
          'Only the requester or a system administrator can reopen a resolved ticket.',
          403,
          'REOPEN_FORBIDDEN'
        );
      }
      if (!context.reopenReason || context.reopenReason.trim().length < 5) {
        throw new AppError(
          'Reopening a ticket requires a valid reason explaining why the resolution was insufficient.',
          400,
          'REOPEN_REASON_REQUIRED'
        );
      }
      if (context.resolvedAt) {
        const daysSinceResolution =
          (Date.now() - new Date(context.resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceResolution > 14) {
          throw new AppError(
            'Cannot reopen a ticket resolved more than 14 days ago. Please file a new ticket.',
            400,
            'REOPEN_WINDOW_EXPIRED'
          );
        }
      }
    }
  }
}
