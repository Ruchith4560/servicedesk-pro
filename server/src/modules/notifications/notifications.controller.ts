import { Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class NotificationsController {
  static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unreadOnly = req.query.unread === 'true';
      const result = await NotificationsService.getUserNotifications(req.user!.userId, unreadOnly);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await NotificationsService.markAsRead(req.params.id, req.user!.userId);
      sendSuccess(res, { notification }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NotificationsService.markAllAsRead(req.user!.userId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
