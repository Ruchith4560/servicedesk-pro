import { Response, NextFunction } from 'express';
import { AssetsService } from './assets.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AuthenticatedRequest } from '../../types/auth.types.js';

export class AssetsController {
  static async createAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const asset = await AssetsService.createAsset(req.body, req.user!, meta);
      sendSuccess(res, { asset }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getAssets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AssetsService.getAssets(req.query as any, req.user!);
      sendSuccess(res, { assets: result.assets }, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getAssetById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AssetsService.getAssetById(req.params.id, req.user!);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateAssetStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const asset = await AssetsService.updateAssetStatus(
        req.params.id,
        req.body.status,
        req.body.notes,
        req.user!,
        meta
      );
      sendSuccess(res, { asset }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async assignAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const asset = await AssetsService.assignAsset(
        req.params.id,
        req.body,
        req.user!,
        meta
      );
      sendSuccess(res, { asset }, 200);
    } catch (error) {
      next(error);
    }
  }
}
