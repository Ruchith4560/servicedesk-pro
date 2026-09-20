import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest, AuthUserPayload } from '../types/auth.types.js';
import { User } from '../models/User.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token missing or malformed', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;

    const user = await User.findById(decoded.userId).select('+active');
    if (!user || !user.active) {
      sendError(res, 'Account not found or deactivated', 401, 'ACCOUNT_INACTIVE');
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name
    };

    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Access token has expired', 401, 'TOKEN_EXPIRED');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid access token signature', 401, 'INVALID_TOKEN');
      return;
    }
    sendError(res, 'Authentication failed', 401, 'AUTHENTICATION_FAILED');
  }
};
