import mongoose from 'mongoose';
import { Asset, IAsset, AssetStatus, AssetType } from '../../models/Asset.js';
import { AssetEvent } from '../../models/AssetEvent.js';
import { User } from '../../models/User.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthUserPayload } from '../../types/auth.types.js';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export class AssetsService {
  /**
   * Register a new asset in the inventory.
   */
  static async createAsset(
    data: {
      assetTag: string;
      serialNumber: string;
      name: string;
      type: AssetType;
      department: string;
      location: string;
      status?: AssetStatus;
      purchaseDate: string | Date;
      warrantyExpiry: string | Date;
      vendor: string;
      cost?: number;
      isCritical?: boolean;
      specifications?: Record<string, any>;
    },
    actor: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IAsset> {
    const existingTag = await Asset.findOne({ assetTag: data.assetTag.toUpperCase() });
    if (existingTag) {
      throw new AppError(`Asset with tag '${data.assetTag}' already exists.`, 409, 'ASSET_TAG_EXISTS');
    }

    const existingSerial = await Asset.findOne({ serialNumber: data.serialNumber.toUpperCase() });
    if (existingSerial) {
      throw new AppError(`Asset with serial '${data.serialNumber}' already exists.`, 409, 'SERIAL_EXISTS');
    }

    const asset = await Asset.create({
      ...data,
      assetTag: data.assetTag.toUpperCase(),
      serialNumber: data.serialNumber.toUpperCase(),
      purchaseDate: new Date(data.purchaseDate),
      warrantyExpiry: new Date(data.warrantyExpiry),
      status: data.status || 'IN_STOCK',
      isCritical: Boolean(data.isCritical)
    });

    await AssetEvent.create({
      assetId: asset._id,
      actorId: actor.userId,
      eventType: 'PROCURED',
      newStatus: asset.status,
      notes: `Asset procured and added to inventory: ${asset.name}`
    });

    await AuditEvent.create({
      actorId: new mongoose.Types.ObjectId(actor.userId),
      actorEmail: actor.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'ASSET_CREATED',
      resourceType: 'Asset',
      resourceId: asset._id.toString(),
      severity: 'INFO',
      changes: { after: { assetTag: asset.assetTag, name: asset.name, status: asset.status } }
    });

    return asset;
  }

  /**
   * Query assets with role-based scoping, warranty filtering, and pagination.
   */
  static async getAssets(
    query: {
      status?: AssetStatus;
      type?: AssetType;
      department?: string;
      ownerId?: string;
      isCritical?: boolean;
      expiringWithinDays?: number;
      search?: string;
      page?: number;
      limit?: number;
    },
    actor: AuthUserPayload
  ): Promise<{ assets: IAsset[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const filter: Record<string, any> = {};

    // Strict role scoping for Employees: Can only see their assigned assets
    if (actor.role === 'EMPLOYEE') {
      filter.ownerId = actor.userId;
    } else {
      if (query.ownerId) filter.ownerId = query.ownerId;
      if (query.department) filter.department = query.department;
    }

    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (typeof query.isCritical === 'boolean') filter.isCritical = query.isCritical;

    // Warranty expiration filtering
    if (query.expiringWithinDays) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + query.expiringWithinDays * 24 * 60 * 60 * 1000);
      filter.warrantyExpiry = { $gte: now, $lte: futureDate };
    }

    // Text search on name, assetTag, or serialNumber
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { assetTag: searchRegex },
        { serialNumber: searchRegex }
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ownerId', 'name email department'),
      Asset.countDocuments(filter)
    ]);

    return {
      assets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Fetch asset details by ID with incident history and lifecycle event audit trail.
   */
  static async getAssetById(
    assetId: string,
    actor: AuthUserPayload
  ): Promise<{ asset: IAsset; events: any[] }> {
    const asset = await Asset.findById(assetId)
      .populate('ownerId', 'name email department')
      .populate('incidentTicketIds', 'ticketNumber title status priority createdAt');

    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    // Ownership check for employees
    const ownerIdStr = (asset.ownerId as any)?._id?.toString() || asset.ownerId?.toString();
    if (actor.role === 'EMPLOYEE' && ownerIdStr !== actor.userId) {
      throw new AppError('Access denied: You can only view assets assigned to you.', 403, 'FORBIDDEN');
    }

    const events = await AssetEvent.find({ assetId: asset._id })
      .sort({ timestamp: -1 })
      .populate('actorId', 'name email role')
      .populate('newOwnerId', 'name email department')
      .populate('previousOwnerId', 'name email department');

    return { asset, events };
  }

  /**
   * Transition asset lifecycle status (e.g. IN_STOCK -> UNDER_REPAIR -> IN_STOCK -> RETIRED).
   */
  static async updateAssetStatus(
    assetId: string,
    targetStatus: AssetStatus,
    notes?: string,
    actor?: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IAsset> {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    if (asset.status === 'RETIRED') {
      throw new AppError('Asset is permanently RETIRED and its status cannot be changed.', 400, 'ASSET_RETIRED_TERMINAL');
    }

    if (targetStatus === 'ASSIGNED' && !asset.ownerId) {
      throw new AppError('Asset cannot be marked ASSIGNED without specifying an owner.', 400, 'OWNER_REQUIRED');
    }

    const previousStatus = asset.status;
    asset.status = targetStatus;

    // If retiring or sending to repair, unassign current owner if appropriate
    if (targetStatus === 'RETIRED' || targetStatus === 'IN_STOCK') {
      asset.ownerId = undefined;
    }

    await asset.save();

    await AssetEvent.create({
      assetId: asset._id,
      actorId: actor?.userId,
      eventType: targetStatus === 'RETIRED' ? 'RETIRED' : targetStatus === 'UNDER_REPAIR' ? 'REPAIR_STARTED' : 'STATUS_CHANGED',
      previousStatus,
      newStatus: targetStatus,
      notes: notes || `Status transitioned from ${previousStatus} to ${targetStatus}`
    });

    if (actor) {
      await AuditEvent.create({
        actorId: new mongoose.Types.ObjectId(actor.userId),
        actorEmail: actor.email,
        actorIp: meta.ip,
        userAgent: meta.userAgent,
        action: 'ASSET_STATUS_CHANGED',
        resourceType: 'Asset',
        resourceId: asset._id.toString(),
        severity: targetStatus === 'RETIRED' ? 'WARN' : 'INFO',
        changes: { before: { status: previousStatus }, after: { status: targetStatus } }
      });
    }

    return asset;
  }

  /**
   * Assign or unassign an asset to an employee.
   */
  static async assignAsset(
    assetId: string,
    payload: { ownerId?: string | null; location?: string; notes?: string },
    actor: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IAsset> {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    if (asset.status === 'RETIRED') {
      throw new AppError('Cannot assign a retired asset.', 400, 'ASSET_RETIRED_TERMINAL');
    }

    const previousOwnerId = asset.ownerId;
    const previousStatus = asset.status;

    if (payload.ownerId) {
      const user = await User.findById(payload.ownerId);
      if (!user || !user.active) {
        throw new AppError('Target user not found or inactive.', 400, 'INVALID_USER');
      }

      asset.ownerId = user._id;
      asset.department = user.department;
      asset.status = 'ASSIGNED';
      if (payload.location) asset.location = payload.location;

      await asset.save();

      await AssetEvent.create({
        assetId: asset._id,
        actorId: actor.userId,
        eventType: 'ASSIGNED',
        previousOwnerId,
        newOwnerId: user._id,
        previousStatus,
        newStatus: 'ASSIGNED',
        notes: payload.notes || `Assigned to ${user.name} (${user.email})`
      });
    } else {
      // Unassign
      asset.ownerId = undefined;
      asset.status = 'IN_STOCK';
      if (payload.location) asset.location = payload.location;

      await asset.save();

      await AssetEvent.create({
        assetId: asset._id,
        actorId: actor.userId,
        eventType: 'UNASSIGNED',
        previousOwnerId,
        previousStatus,
        newStatus: 'IN_STOCK',
        notes: payload.notes || 'Asset returned to stock'
      });
    }

    await AuditEvent.create({
      actorId: new mongoose.Types.ObjectId(actor.userId),
      actorEmail: actor.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: payload.ownerId ? 'ASSET_ASSIGNED' : 'ASSET_UNASSIGNED',
      resourceType: 'Asset',
      resourceId: asset._id.toString(),
      severity: 'INFO',
      changes: {
        before: { ownerId: previousOwnerId, status: previousStatus },
        after: { ownerId: asset.ownerId, status: asset.status }
      }
    });

    return asset;
  }

  /**
   * Link an incident ticket to an asset and record in history.
   */
  static async linkTicketToAsset(
    assetId: string,
    ticketId: string,
    actorId: string
  ): Promise<void> {
    const asset = await Asset.findById(assetId);
    if (!asset) return;

    const ticketObjId = new mongoose.Types.ObjectId(ticketId);
    if (!asset.incidentTicketIds.some((id) => id.equals(ticketObjId))) {
      asset.incidentTicketIds.push(ticketObjId);
      await asset.save();

      await AssetEvent.create({
        assetId: asset._id,
        actorId,
        eventType: 'INCIDENT_LINKED',
        ticketId: ticketObjId,
        notes: `Linked incident ticket to asset`
      });
    }
  }
}
