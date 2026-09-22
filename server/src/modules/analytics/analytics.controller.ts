import { Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class AnalyticsController {
  static async getExecutiveOverview(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getExecutiveOverview();
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getTechnicianWorkloads(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getTechnicianWorkloads();
      sendSuccess(res, { technicians: data }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getAssetFailureAnalytics(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getAssetFailureAnalytics();
      sendSuccess(res, { assets: data }, 200);
    } catch (error) {
      next(error);
    }
  }
}
