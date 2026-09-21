import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../models/Ticket.js';

export const createPolicySchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Policy name must be at least 3 characters'),
    description: z.string().optional(),
    priority: z.enum(TICKET_PRIORITIES),
    category: z.enum(TICKET_CATEGORIES).optional(),
    responseTimeHours: z.number().min(0.1, 'Response time must be at least 0.1 hours'),
    resolutionTimeHours: z.number().min(0.2, 'Resolution time must be at least 0.2 hours'),
    warningThresholdPercent: z.number().min(10).max(95).optional().default(75),
    escalationRole: z.enum(['IT_MANAGER', 'SYSTEM_ADMIN']).optional().default('IT_MANAGER'),
    businessHoursOnly: z.boolean().optional().default(false),
    businessHours: z
      .object({
        startHour: z.number().min(0).max(23).default(9),
        endHour: z.number().min(1).max(24).default(17),
        timezone: z.string().default('UTC')
      })
      .optional()
      .default({ startHour: 9, endHour: 17, timezone: 'UTC' })
  })
});

export const updatePolicySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Policy ID format')
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    responseTimeHours: z.number().min(0.1).optional(),
    resolutionTimeHours: z.number().min(0.2).optional(),
    warningThresholdPercent: z.number().min(10).max(95).optional(),
    businessHoursOnly: z.boolean().optional(),
    active: z.boolean().optional()
  })
});
