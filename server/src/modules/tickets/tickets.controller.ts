import { Response, NextFunction } from 'express';
import { TicketsService } from './tickets.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class TicketsController {
  static async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const ticket = await TicketsService.createTicket(req.body, req.user!, meta);
      sendSuccess(res, { ticket }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketsService.getTickets(req.query as any, req.user!);
      sendSuccess(res, { tickets: result.tickets }, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketsService.getTicketById(req.params.id, req.user!);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async transitionTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const ticket = await TicketsService.transitionTicket(req.params.id, req.body, req.user!, meta);
      sendSuccess(res, { ticket }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async assignTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const ticket = await TicketsService.assignTicket(req.params.id, req.body, req.user!, meta);
      sendSuccess(res, { ticket }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await TicketsService.addComment(req.params.id, req.body, req.user!);
      sendSuccess(res, { event }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async addWorkLog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workLog = await TicketsService.addWorkLog(req.params.id, req.body, req.user!);
      sendSuccess(res, { workLog }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async classifyPreview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const prediction = await TicketsService.classifyPreview(req.body.title, req.body.description);
      sendSuccess(res, { prediction }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getRoutingSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { RoutingEngine } = await import('./routing.engine.js');
      const suggestions = await RoutingEngine.getRoutingSuggestions(req.params.id);
      sendSuccess(res, { suggestions }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async autoRouteTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { RoutingEngine } = await import('./routing.engine.js');
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const result = await RoutingEngine.autoRouteTicket(req.params.id, req.user!, meta);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async recalculateRisk(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const riskScore = await TicketsService.recalculateRiskScore(req.params.id);
      sendSuccess(res, { riskScore }, 200);
    } catch (error) {
      next(error);
    }
  }
}
