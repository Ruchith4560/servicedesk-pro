import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser, UserRole } from '../../models/User.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthUserPayload } from '../../types/auth.types.js';

interface RequestMetadata {
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload: AuthUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any
    });

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  static async register(
    data: {
      name: string;
      email: string;
      password: string;
      department: string;
      role?: UserRole;
      skills?: string[];
    },
    meta: RequestMetadata = {}
  ): Promise<IUser> {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      department: data.department,
      role: data.role || 'EMPLOYEE',
      skills: data.skills || []
    });

    await AuditEvent.create({
      actorId: user._id,
      actorEmail: user.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'AUTH_REGISTER_SUCCESS',
      resourceType: 'User',
      resourceId: user._id.toString(),
      severity: 'INFO',
      changes: {
        after: {
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });

    return user;
  }

  static async login(
    email: string,
    password: string,
    meta: RequestMetadata = {}
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      await AuditEvent.create({
        actorEmail: normalizedEmail,
        actorIp: meta.ip,
        userAgent: meta.userAgent,
        action: 'AUTH_LOGIN_FAILED_UNKNOWN_USER',
        resourceType: 'User',
        severity: 'WARN'
      });
      throw new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active) {
      await AuditEvent.create({
        actorId: user._id,
        actorEmail: user.email,
        actorIp: meta.ip,
        userAgent: meta.userAgent,
        action: 'AUTH_LOGIN_FAILED_DEACTIVATED',
        resourceType: 'User',
        resourceId: user._id.toString(),
        severity: 'WARN'
      });
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await AuditEvent.create({
        actorId: user._id,
        actorEmail: user.email,
        actorIp: meta.ip,
        userAgent: meta.userAgent,
        action: 'AUTH_LOGIN_FAILED_BAD_PASSWORD',
        resourceType: 'User',
        resourceId: user._id.toString(),
        severity: 'WARN'
      });
      throw new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = this.generateTokens(user);

    await AuditEvent.create({
      actorId: user._id,
      actorEmail: user.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user._id.toString(),
      severity: 'INFO'
    });

    return { user, accessToken, refreshToken };
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);

      if (!user || !user.active) {
        throw new AppError('Invalid refresh token or inactive account.', 401, 'INVALID_REFRESH_TOKEN');
      }

      const payload: AuthUserPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        department: user.department,
        name: user.name
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as any
      });

      return { accessToken };
    } catch (error: any) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  static async updateUserRole(
    adminUser: AuthUserPayload,
    targetUserId: string,
    newRole: UserRole,
    meta: RequestMetadata = {}
  ): Promise<IUser> {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('Target user not found.', 404, 'USER_NOT_FOUND');
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;
    await targetUser.save();

    await AuditEvent.create({
      actorId: adminUser.userId,
      actorEmail: adminUser.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      action: 'USER_ROLE_CHANGED',
      resourceType: 'User',
      resourceId: targetUser._id.toString(),
      severity: 'CRITICAL',
      changes: {
        before: { role: previousRole },
        after: { role: newRole }
      }
    });

    return targetUser;
  }
}
