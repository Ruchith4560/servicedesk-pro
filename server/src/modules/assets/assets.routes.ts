import { Router } from 'express';
import { AssetsController } from './assets.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  createAssetSchema,
  updateAssetStatusSchema,
  assignAssetSchema,
  getAssetsQuerySchema
} from './assets.validation.js';

const router = Router();

// All asset routes require authentication
router.use(authenticate);

// Inventory queries
router.get('/', validateRequest(getAssetsQuerySchema), AssetsController.getAssets);
router.get('/:id', AssetsController.getAssetById);

// Asset Management (Asset Manager, IT Manager, System Admin)
router.post(
  '/',
  authorizeRoles('ASSET_MANAGER', 'IT_MANAGER', 'SYSTEM_ADMIN'),
  validateRequest(createAssetSchema),
  AssetsController.createAsset
);

router.patch(
  '/:id/status',
  authorizeRoles('ASSET_MANAGER', 'IT_MANAGER', 'SYSTEM_ADMIN'),
  validateRequest(updateAssetStatusSchema),
  AssetsController.updateAssetStatus
);

router.post(
  '/:id/assign',
  authorizeRoles('ASSET_MANAGER', 'IT_MANAGER', 'SYSTEM_ADMIN'),
  validateRequest(assignAssetSchema),
  AssetsController.assignAsset
);

export default router;
