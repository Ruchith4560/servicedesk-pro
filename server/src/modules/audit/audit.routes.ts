import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// Audit trails are restricted strictly to Administrators and IT Managers
router.get(
  '/',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER'),
  AuditController.getAuditEvents
);

export default router;
