import { z } from 'zod';
import { ASSET_STATUSES, ASSET_TYPES } from '../../models/Asset.js';

export const createAssetSchema = z.object({
  body: z.object({
    assetTag: z.string().min(3, 'Asset tag must be at least 3 characters').max(30),
    serialNumber: z.string().min(3, 'Serial number must be at least 3 characters').max(50),
    name: z.string().min(2, 'Asset name is required').max(100),
    type: z.enum(ASSET_TYPES),
    department: z.string().min(2, 'Department is required'),
    location: z.string().min(2, 'Location is required'),
    status: z.enum(ASSET_STATUSES).optional().default('IN_STOCK'),
    purchaseDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    warrantyExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    vendor: z.string().min(2, 'Vendor name is required'),
    cost: z.number().min(0).optional(),
    isCritical: z.boolean().optional().default(false),
    specifications: z.record(z.any()).optional().default({})
  })
});

export const updateAssetStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Asset ID format')
  }),
  body: z.object({
    status: z.enum(ASSET_STATUSES),
    notes: z.string().optional()
  })
});

export const assignAssetSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Asset ID format')
  }),
  body: z.object({
    ownerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format').nullable().optional(),
    location: z.string().optional(),
    notes: z.string().optional()
  })
});

export const getAssetsQuerySchema = z.object({
  query: z.object({
    status: z.enum(ASSET_STATUSES).optional(),
    type: z.enum(ASSET_TYPES).optional(),
    department: z.string().optional(),
    ownerId: z.string().optional(),
    isCritical: z.coerce.boolean().optional(),
    expiringWithinDays: z.coerce.number().int().min(1).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
  }).optional()
});
