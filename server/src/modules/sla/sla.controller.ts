import { Request, Response, NextFunction } from 'express';
import { SLAPolicy } from '../../models/SLAPolicy.js';
import { Ticket } from '../../models/Ticket.js';
import { SLAEngine } from './sla.engine.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middleware/error.middleware.js';
import { CacheService } from '../../utils/cache.service.js';

export class SLAController {
  static async getPolicies(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policies = await SLAPolicy.find().sort({ priority: 1, category: 1 });
      sendSuccess(res, { policies }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async createPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await SLAPolicy.create(req.body);
      CacheService.deletePattern(/^sla:policy:/);
      sendSuccess(res, { policy }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updatePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await SLAPolicy.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
      if (!policy) {
        throw new AppError('SLA policy not found', 404, 'POLICY_NOT_FOUND');
      }
      CacheService.deletePattern(/^sla:policy:/);
      sendSuccess(res, { policy }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async evaluateSLAs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await SLAEngine.evaluateSLAs();
      sendSuccess(res, results, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getAtRiskTickets(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const atRisk = await Ticket.find({
        status: { $nin: ['RESOLVED', 'CLOSED'] },
        'slaTimers.resolutionBreached': false,
        'riskScore.score': { $gte: 70 }
      })
        .sort({ 'slaTimers.resolutionDeadline': 1 })
        .populate('requesterId', 'name email department')
        .populate('assigneeId', 'name email');

      sendSuccess(res, { tickets: atRisk, count: atRisk.length }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getBreachedTickets(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const breaches = await Ticket.find({
        status: { $nin: ['CLOSED'] },
        $or: [
          { 'slaTimers.responseBreached': true },
          { 'slaTimers.resolutionBreached': true }
        ]
      })
        .sort({ updatedAt: -1 })
        .populate('requesterId', 'name email department')
        .populate('assigneeId', 'name email');

      sendSuccess(res, { tickets: breaches, count: breaches.length }, 200);
    } catch (error) {
      next(error);
    }
  }
}
