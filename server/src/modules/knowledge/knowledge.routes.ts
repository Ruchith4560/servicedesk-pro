import { Router } from 'express';
import { KnowledgeController } from './knowledge.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  createArticleSchema,
  updateArticleSchema,
  transitionArticleStatusSchema,
  articleFeedbackSchema,
  getArticlesQuerySchema,
  askAssistantSchema
} from './knowledge.validation.js';

const router = Router();

// All knowledge base routes require authentication
router.use(authenticate);

// AI RAG Knowledge Assistant (Role-filtered semantic search & grounded answering)
router.post('/ask', validateRequest(askAssistantSchema), KnowledgeController.askAssistant);

// Public/Internal article browsing & retrieval
router.get('/', validateRequest(getArticlesQuerySchema), KnowledgeController.getArticles);
router.get('/:idOrSlug', KnowledgeController.getArticleByIdOrSlug);

// User feedback (Helpful / Unhelpful voting)
router.post('/:id/feedback', validateRequest(articleFeedbackSchema), KnowledgeController.voteFeedback);

// Authoring & Editorial Workflow
router.post(
  '/',
  authorizeRoles('TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'),
  validateRequest(createArticleSchema),
  KnowledgeController.createArticle
);

router.put(
  '/:id',
  authorizeRoles('TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'),
  validateRequest(updateArticleSchema),
  KnowledgeController.updateArticle
);

router.patch(
  '/:id/status',
  authorizeRoles('TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'),
  validateRequest(transitionArticleStatusSchema),
  KnowledgeController.transitionStatus
);

router.delete(
  '/:id',
  authorizeRoles('IT_MANAGER', 'SYSTEM_ADMIN'),
  KnowledgeController.deleteArticle
);

export default router;
