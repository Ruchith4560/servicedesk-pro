import { z } from 'zod';
import { ARTICLE_STATUSES } from '../../models/KnowledgeArticle.js';
import { TICKET_CATEGORIES } from '../../models/Ticket.js';
import { USER_ROLES } from '../../models/User.js';

export const createArticleSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    contentMarkdown: z.string().min(20, 'Article content must be at least 20 characters'),
    category: z.enum(TICKET_CATEGORIES),
    tags: z.array(z.string()).optional().default([]),
    accessRoles: z.array(z.enum(USER_ROLES)).optional().default([
      'EMPLOYEE',
      'TECHNICIAN',
      'IT_MANAGER',
      'SYSTEM_ADMIN',
      'ASSET_MANAGER'
    ])
  })
});

export const updateArticleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Article ID format')
  }),
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    contentMarkdown: z.string().min(20).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    tags: z.array(z.string()).optional(),
    accessRoles: z.array(z.enum(USER_ROLES)).optional()
  })
});

export const transitionArticleStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Article ID format')
  }),
  body: z.object({
    status: z.enum(ARTICLE_STATUSES)
  })
});

export const articleFeedbackSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Article ID format')
  }),
  body: z.object({
    isHelpful: z.boolean()
  })
});

export const getArticlesQuerySchema = z.object({
  query: z.object({
    category: z.enum(TICKET_CATEGORIES).optional(),
    status: z.enum(ARTICLE_STATUSES).optional(),
    tag: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
  }).optional()
});
