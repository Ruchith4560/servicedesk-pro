import { Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class AuditController {
  static async getAuditEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuditService.getAuditEvents(req.query as any);
      sendSuccess(res, { events: result.events }, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}
