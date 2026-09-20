import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { UserRole } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required before authorization', 401, 'UNAUTHORIZED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
};

export const authorizeSelfOrRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    const targetUserId = req.params.id || req.params.userId;
    const isSelf = targetUserId && req.user.userId === targetUserId;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isSelf && !hasRole) {
      sendError(
        res,
        'Access denied. You can only access your own profile or require administrative elevation.',
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
};

export const authorizeDepartment = (paramKey = 'department') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    // Admins and IT Managers have global cross-department privileges
    if (req.user.role === 'SYSTEM_ADMIN' || req.user.role === 'IT_MANAGER') {
      return next();
    }

    const requestedDept = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];

    if (requestedDept && requestedDept !== req.user.department) {
      sendError(
        res,
        `Access denied. Your departmental scope is limited to '${req.user.department}'.`,
        403,
        'DEPARTMENT_RESTRICTED'
      );
      return;
    }

    next();
  };
};
