import { Response, NextFunction } from 'express';
import { KnowledgeService } from './knowledge.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class KnowledgeController {
  static async createArticle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const article = await KnowledgeService.createArticle(req.body, req.user!, meta);
      sendSuccess(res, { article }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateArticle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const article = await KnowledgeService.updateArticle(req.params.id, req.body, req.user!, meta);
      sendSuccess(res, { article }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async transitionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const article = await KnowledgeService.transitionStatus(
        req.params.id,
        req.body.status,
        req.user!,
        meta
      );
      sendSuccess(res, { article }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getArticles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await KnowledgeService.getArticles(req.query as any, req.user!);
      sendSuccess(res, { articles: result.articles }, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getArticleByIdOrSlug(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const article = await KnowledgeService.getArticleByIdOrSlug(req.params.idOrSlug, req.user!);
      sendSuccess(res, { article }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async voteFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const article = await KnowledgeService.voteFeedback(req.params.id, req.body.isHelpful, req.user!);
      sendSuccess(res, { article }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async deleteArticle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      await KnowledgeService.deleteArticle(req.params.id, req.user!, meta);
      sendSuccess(res, { message: 'Article deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async askAssistant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await KnowledgeService.askKnowledgeAssistant(req.body.query, req.user!);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
