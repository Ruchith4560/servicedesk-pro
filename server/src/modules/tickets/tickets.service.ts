import mongoose from 'mongoose';
import { Ticket, ITicket, TicketStatus, TicketPriority, TicketCategory } from '../../models/Ticket.js';
import { TicketEvent } from '../../models/TicketEvent.js';
import { WorkLog, WorkLogActivity } from '../../models/WorkLog.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { User } from '../../models/User.js';
import { getNextSequence } from '../../models/Counter.js';
import { TicketStateMachine, TransitionContext } from './tickets.fsm.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthUserPayload } from '../../types/auth.types.js';
import { SLAEngine } from '../sla/sla.engine.js';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export class TicketsService {
  /**
   * Create a new ticket with an atomic sequence number (SDP-XXXX).
   */
  static async createTicket(
    data: {
      title: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
      assetId?: string;
      tags?: string[];
    },
    requester: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<ITicket> {
    const seq = await getNextSequence('ticketNumber');
    const ticketNumber = `SDP-${seq}`;

    const ticket = await Ticket.create({
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category || 'SOFTWARE',
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      requesterId: requester.userId,
      assetId: data.assetId ? new mongoose.Types.ObjectId(data.assetId) : undefined,
      tags: data.tags || [],
      riskScore: {
        score: data.priority === 'CRITICAL' ? 60 : data.priority === 'HIGH' ? 40 : 20,
        calculatedAt: new Date(),
        factors: ['INITIAL_CREATION', `PRIORITY_${data.priority || 'MEDIUM'}`]
      }
    });

    // Automatically bind active SLA policy and calculate deadlines
    await SLAEngine.applySLAPolicyToTicket(ticket);
    await ticket.save();

    // Record creation event in ticket timeline
    await TicketEvent.create({
      ticketId: ticket._id,
      actorId: requester.userId,
      eventType: 'TICKET_CREATED',
      newValue: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category
      },
      note: 'Ticket created by user',
      isInternal: false
    });

    // Record system audit log
    await AuditEvent.create({
      actorId: new mongoose.Types.ObjectId(requester.userId),
      actorEmail: requester.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'TICKET_CREATED',
      resourceType: 'Ticket',
      resourceId: ticket._id.toString(),
      severity: 'INFO',
      changes: { after: { ticketNumber: ticket.ticketNumber, title: ticket.title } }
    });

    return ticket;
  }

  /**
   * Query tickets with server-enforced role filtering and pagination.
   */
  static async getTickets(
    query: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      assigneeId?: string;
      requesterId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    user: AuthUserPayload
  ): Promise<{ tickets: ITicket[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const filter: Record<string, any> = {};

    // Strict Role Scoping
    if (user.role === 'EMPLOYEE') {
      filter.requesterId = user.userId;
    } else if (user.role === 'TECHNICIAN') {
      // Technicians see assigned to them, or unassigned/open in their department or specified
      if (query.assigneeId) {
        filter.assigneeId = query.assigneeId;
      }
    }

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.requesterId && user.role !== 'EMPLOYEE') filter.requesterId = query.requesterId;
    if (query.assigneeId && user.role !== 'EMPLOYEE') filter.assigneeId = query.assigneeId;

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [{ title: searchRegex }, { ticketNumber: searchRegex }];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requesterId', 'name email department')
        .populate('assigneeId', 'name email department skills')
        .populate('assetId', 'assetTag name type status'),
      Ticket.countDocuments(filter)
    ]);

    return {
      tickets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieve ticket by ID with ownership validation and sanitized timeline events.
   */
  static async getTicketById(
    ticketId: string,
    user: AuthUserPayload
  ): Promise<{ ticket: ITicket; events: any[]; workLogs: any[] }> {
    const ticket = await Ticket.findById(ticketId)
      .populate('requesterId', 'name email department')
      .populate('assigneeId', 'name email department skills')
      .populate('assetId', 'assetTag serialNumber name type status location');

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Role-based Ownership Check
    const requesterIdStr = (ticket.requesterId as any)?._id?.toString() || ticket.requesterId.toString();
    if (user.role === 'EMPLOYEE' && requesterIdStr !== user.userId) {
      throw new AppError('Access denied: You can only view your own submitted tickets.', 403, 'FORBIDDEN');
    }

    // Filter internal notes if requester is Employee
    const eventFilter: Record<string, any> = { ticketId: ticket._id };
    if (user.role === 'EMPLOYEE') {
      eventFilter.isInternal = false;
    }

    const [events, workLogs] = await Promise.all([
      TicketEvent.find(eventFilter)
        .sort({ timestamp: 1 })
        .populate('actorId', 'name email role'),
      user.role !== 'EMPLOYEE'
        ? WorkLog.find({ ticketId: ticket._id })
            .sort({ loggedAt: -1 })
            .populate('technicianId', 'name email')
        : Promise.resolve([])
    ]);

    return { ticket, events, workLogs };
  }

  /**
   * Execute a validated FSM state transition.
   */
  static async transitionTicket(
    ticketId: string,
    payload: {
      targetStatus: TicketStatus;
      waitingReason?: string;
      resolutionSummary?: string;
      rootCause?: string;
      reopenReason?: string;
      notes?: string;
    },
    actor: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<ITicket> {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const requesterIdStr = ticket.requesterId.toString();
    const assigneeIdStr = ticket.assigneeId ? ticket.assigneeId.toString() : null;

    const context: TransitionContext = {
      fromStatus: ticket.status,
      toStatus: payload.targetStatus,
      actorRole: actor.role,
      isRequester: requesterIdStr === actor.userId,
      isAssignee: assigneeIdStr === actor.userId,
      hasAssignee: Boolean(ticket.assigneeId),
      waitingReason: payload.waitingReason,
      resolutionSummary: payload.resolutionSummary,
      rootCause: payload.rootCause,
      reopenReason: payload.reopenReason,
      resolvedAt: ticket.slaTimers?.resolvedAt
    };

    // Strict FSM validation
    TicketStateMachine.validateTransition(context);

    const previousStatus = ticket.status;

    // Handle SLA pause / resume logic on WAITING status
    if (payload.targetStatus === 'WAITING') {
      ticket.slaTimers.isPaused = true;
      ticket.slaTimers.pausedAt = new Date();
      ticket.waitingReason = payload.waitingReason;
    } else if (previousStatus === 'WAITING' && ticket.slaTimers.isPaused && ticket.slaTimers.pausedAt) {
      const pausedDuration = Date.now() - new Date(ticket.slaTimers.pausedAt).getTime();
      ticket.slaTimers.totalPausedDurationMs = (ticket.slaTimers.totalPausedDurationMs || 0) + pausedDuration;
      ticket.slaTimers.isPaused = false;
      ticket.slaTimers.pausedAt = undefined;
    }

    // Handle RESOLVED state requirements
    if (payload.targetStatus === 'RESOLVED') {
      ticket.slaTimers.resolvedAt = new Date();
      ticket.resolutionSummary = payload.resolutionSummary;
      ticket.rootCause = payload.rootCause;
    }

    // Handle CLOSED terminal state
    if (payload.targetStatus === 'CLOSED') {
      ticket.closedAt = new Date();
    }

    // Handle REOPENED state
    if (payload.targetStatus === 'REOPENED') {
      ticket.reopenCount += 1;
      ticket.reopenReason = payload.reopenReason;
      ticket.slaTimers.resolvedAt = undefined;
      ticket.closedAt = undefined;
    }

    // Record first response time if actor is IT staff
    if (!ticket.slaTimers.firstRespondedAt && actor.role !== 'EMPLOYEE') {
      ticket.slaTimers.firstRespondedAt = new Date();
    }

    ticket.status = payload.targetStatus;
    await ticket.save();

    // Record Event in Timeline
    await TicketEvent.create({
      ticketId: ticket._id,
      actorId: actor.userId,
      eventType: payload.targetStatus === 'REOPENED' ? 'REOPENED' : 'STATUS_CHANGED',
      previousValue: previousStatus,
      newValue: payload.targetStatus,
      note: payload.notes || payload.waitingReason || payload.resolutionSummary || payload.reopenReason,
      isInternal: false
    });

    // Record Audit Trail
    await AuditEvent.create({
      actorId: new mongoose.Types.ObjectId(actor.userId),
      actorEmail: actor.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'TICKET_STATUS_CHANGED',
      resourceType: 'Ticket',
      resourceId: ticket._id.toString(),
      severity: payload.targetStatus === 'RESOLVED' || payload.targetStatus === 'CLOSED' ? 'INFO' : 'WARN',
      changes: {
        before: { status: previousStatus },
        after: { status: payload.targetStatus }
      }
    });

    return ticket;
  }

  /**
   * Assign ticket to a technician or team.
   */
  static async assignTicket(
    ticketId: string,
    payload: { assigneeId?: string; teamId?: string; notes?: string },
    actor: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<ITicket> {
    if (actor.role === 'EMPLOYEE') {
      throw new AppError('Employees cannot assign tickets.', 403, 'FORBIDDEN');
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.status === 'CLOSED') {
      throw new AppError('Cannot reassign a closed ticket.', 400, 'TICKET_CLOSED_TERMINAL');
    }

    const previousAssigneeId = ticket.assigneeId;

    if (payload.assigneeId) {
      const technician = await User.findById(payload.assigneeId);
      if (!technician || !['TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN'].includes(technician.role)) {
        throw new AppError('Assignee must be a valid IT technician or manager.', 400, 'INVALID_ASSIGNEE');
      }
      ticket.assigneeId = technician._id;
    }

    if (payload.teamId) {
      ticket.teamId = new mongoose.Types.ObjectId(payload.teamId);
    }

    // Auto transition from OPEN or TRIAGED to ASSIGNED
    if (ticket.status === 'OPEN' || ticket.status === 'TRIAGED') {
      ticket.status = 'ASSIGNED';
    }

    // Record first response time (actor already guaranteed non-employee)
    if (!ticket.slaTimers.firstRespondedAt) {
      ticket.slaTimers.firstRespondedAt = new Date();
    }

    await ticket.save();

    await TicketEvent.create({
      ticketId: ticket._id,
      actorId: actor.userId,
      eventType: 'ASSIGNED',
      previousValue: previousAssigneeId,
      newValue: ticket.assigneeId,
      note: payload.notes || 'Technician assignment updated',
      isInternal: false
    });

    await AuditEvent.create({
      actorId: new mongoose.Types.ObjectId(actor.userId),
      actorEmail: actor.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'TICKET_ASSIGNED',
      resourceType: 'Ticket',
      resourceId: ticket._id.toString(),
      severity: 'INFO',
      changes: {
        before: { assigneeId: previousAssigneeId },
        after: { assigneeId: ticket.assigneeId }
      }
    });

    return ticket;
  }

  /**
   * Add a public comment or internal technician note.
   */
  static async addComment(
    ticketId: string,
    payload: { comment: string; isInternal?: boolean },
    actor: AuthUserPayload
  ): Promise<any> {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Role check for internal notes: Only non-employees can create internal notes
    const isInternal = Boolean(payload.isInternal);
    if (isInternal && actor.role === 'EMPLOYEE') {
      throw new AppError('Employees cannot add internal notes.', 403, 'FORBIDDEN');
    }

    // Ownership check for employees
    if (actor.role === 'EMPLOYEE' && ticket.requesterId.toString() !== actor.userId) {
      throw new AppError('Access denied: You cannot comment on tickets you did not request.', 403, 'FORBIDDEN');
    }

    const event = await TicketEvent.create({
      ticketId: ticket._id,
      actorId: actor.userId,
      eventType: isInternal ? 'INTERNAL_NOTE_ADDED' : 'COMMENT_ADDED',
      note: payload.comment,
      isInternal
    });

    // Track first response if actor is IT staff
    if (!ticket.slaTimers.firstRespondedAt && actor.role !== 'EMPLOYEE') {
      ticket.slaTimers.firstRespondedAt = new Date();
      await ticket.save();
    }

    return event;
  }

  /**
   * Record technician work log entry.
   */
  static async addWorkLog(
    ticketId: string,
    payload: { timeSpentMinutes: number; activityType: WorkLogActivity; description: string },
    technician: AuthUserPayload
  ): Promise<any> {
    if (technician.role === 'EMPLOYEE') {
      throw new AppError('Employees cannot log technician work entries.', 403, 'FORBIDDEN');
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const workLog = await WorkLog.create({
      ticketId: ticket._id,
      technicianId: technician.userId,
      timeSpentMinutes: payload.timeSpentMinutes,
      activityType: payload.activityType,
      description: payload.description,
      loggedAt: new Date()
    });

    await TicketEvent.create({
      ticketId: ticket._id,
      actorId: technician.userId,
      eventType: 'WORK_LOG_RECORDED',
      note: `Logged ${payload.timeSpentMinutes} mins: ${payload.activityType} - ${payload.description}`,
      isInternal: true
    });

    return workLog;
  }
}
