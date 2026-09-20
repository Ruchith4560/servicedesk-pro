import { Request } from 'express';
import { UserRole } from '../models/User.js';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  department: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
