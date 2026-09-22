import { Router } from 'express';
import { TicketsController } from './tickets.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  createTicketSchema,
  transitionTicketSchema,
  assignTicketSchema,
  addCommentSchema,
  addWorkLogSchema,
  getTicketsQuerySchema,
  classifyPreviewSchema
} from './tickets.validation.js';

const router = Router();

// All ticket routes require a valid authenticated session
router.use(authenticate);

// AI Classifier Preview (Real-time auto-categorization preview)
router.post('/classify-preview', validateRequest(classifyPreviewSchema), TicketsController.classifyPreview);

// Ticket CRUD and Querying
router.post('/', validateRequest(createTicketSchema), TicketsController.createTicket);
router.get('/', validateRequest(getTicketsQuerySchema), TicketsController.getTickets);
router.get('/:id', TicketsController.getTicketById);

// State Machine Transition
router.post('/:id/transition', validateRequest(transitionTicketSchema), TicketsController.transitionTicket);

// Intelligent Routing & Risk Scoring
router.get(
  '/:id/routing-suggestions',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  TicketsController.getRoutingSuggestions
);

router.post(
  '/:id/auto-route',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER'),
  TicketsController.autoRouteTicket
);

router.post(
  '/:id/recalculate-risk',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  TicketsController.recalculateRisk
);

// Assignment (Technicians, Managers, Admins)
router.post(
  '/:id/assign',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  validateRequest(assignTicketSchema),
  TicketsController.assignTicket
);

// Communication & Work Logs
router.post('/:id/comments', validateRequest(addCommentSchema), TicketsController.addComment);
router.post(
  '/:id/work-logs',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  validateRequest(addWorkLogSchema),
  TicketsController.addWorkLog
);

export default router;
