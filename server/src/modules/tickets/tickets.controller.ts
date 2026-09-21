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
}
