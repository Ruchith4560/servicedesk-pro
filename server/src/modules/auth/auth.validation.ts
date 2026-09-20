import { z } from 'zod';
import { USER_ROLES } from '../../models/User.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    department: z.string().min(2, 'Department is required'),
    role: z.enum(USER_ROLES).optional().default('EMPLOYEE'),
    skills: z.array(z.string()).optional().default([])
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

export const updateRoleSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'Target user ID is required')
  }),
  body: z.object({
    role: z.enum(USER_ROLES, { errorMap: () => ({ message: 'Invalid role specified' }) })
  })
});
