import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES
} from '../../models/Ticket.js';
import { WORKLOG_ACTIVITIES } from '../../models/WorkLog.js';

export const createTicketSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.enum(TICKET_CATEGORIES).optional().default('SOFTWARE'),
    priority: z.enum(TICKET_PRIORITIES).optional().default('MEDIUM'),
    assetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Asset ID format').optional(),
    tags: z.array(z.string()).optional().default([])
  })
});

export const transitionTicketSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ticket ID format')
  }),
  body: z.object({
    targetStatus: z.enum(TICKET_STATUSES),
    waitingReason: z.string().optional(),
    resolutionSummary: z.string().optional(),
    rootCause: z.string().optional(),
    reopenReason: z.string().optional(),
    notes: z.string().optional()
  })
});

export const assignTicketSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ticket ID format')
  }),
  body: z.object({
    assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Assignee ID format').optional(),
    teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID format').optional(),
    notes: z.string().optional()
  }).refine((data) => data.assigneeId || data.teamId, {
    message: 'Either assigneeId or teamId must be provided'
  })
});

export const addCommentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ticket ID format')
  }),
  body: z.object({
    comment: z.string().min(1, 'Comment cannot be empty'),
    isInternal: z.boolean().optional().default(false)
  })
});

export const addWorkLogSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ticket ID format')
  }),
  body: z.object({
    timeSpentMinutes: z.number().int().min(1, 'Time spent must be at least 1 minute'),
    activityType: z.enum(WORKLOG_ACTIVITIES),
    description: z.string().min(5, 'Work log description must be at least 5 characters')
  })
});

export const getTicketsQuerySchema = z.object({
  query: z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    assigneeId: z.string().optional(),
    requesterId: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
  }).optional()
});
