import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';

const router = Router();

// All analytics endpoints require authenticated session
router.use(authenticate);

// Executive KPI & MTTR Overview
router.get(
  '/overview',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  AnalyticsController.getExecutiveOverview
);

// Technician Capacity & Workload Balance
router.get(
  '/technicians',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'TECHNICIAN'),
  AnalyticsController.getTechnicianWorkloads
);

// Infrastructure Reliability & Asset Failure Heatmap
router.get(
  '/assets',
  authorizeRoles('SYSTEM_ADMIN', 'IT_MANAGER', 'ASSET_MANAGER', 'TECHNICIAN'),
  AnalyticsController.getAssetFailureAnalytics
);

export default router;
