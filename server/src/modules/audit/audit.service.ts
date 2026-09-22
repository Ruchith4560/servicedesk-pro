import { AuditEvent, IAuditEvent, AuditSeverity } from '../../models/AuditEvent.js';

export interface AuditQueryParams {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorEmail?: string;
  severity?: AuditSeverity;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Query immutable system audit events with server-enforced pagination and filters
   */
  static async getAuditEvents(query: AuditQueryParams = {}): Promise<{
    events: IAuditEvent[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const filter: any = {};

    if (query.action) filter.action = new RegExp(`^${query.action}$`, 'i');
    if (query.resourceType) filter.resourceType = new RegExp(`^${query.resourceType}$`, 'i');
    if (query.resourceId) filter.resourceId = query.resourceId;
    if (query.actorEmail) filter.actorEmail = new RegExp(query.actorEmail, 'i');
    if (query.severity) filter.severity = query.severity;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AuditEvent.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditEvent.countDocuments(filter)
    ]);

    return {
      events: events as unknown as IAuditEvent[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
