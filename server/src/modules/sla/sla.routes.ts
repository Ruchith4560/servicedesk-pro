import { Router } from 'express';
import { SLAController } from './sla.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { createPolicySchema, updatePolicySchema } from './sla.validation.js';

const router = Router();

router.use(authenticate);

// Policy Management
router.get('/policies', SLAController.getPolicies);
router.post(
  '/policies',
  authorizeRoles('SYSTEM_ADMIN'),
  validateRequest(createPolicySchema),
  SLAController.createPolicy
);
router.patch(
  '/policies/:id',
  authorizeRoles('SYSTEM_ADMIN'),
  validateRequest(updatePolicySchema),
  SLAController.updatePolicy
);

// Engine Evaluation Trigger & Dashboard Endpoints
router.post(
  '/evaluate',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER'),
  SLAController.evaluateSLAs
);
router.get(
  '/at-risk',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  SLAController.getAtRiskTickets
);
router.get(
  '/breaches',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  SLAController.getBreachedTickets
);

export default router;
