import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

/**
 * Rate limiter for authentication endpoints (login, register).
 * Throttles credential stuffing and brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 500 : 30, // Relax in test environment to avoid starving other test suites
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many authentication attempts from this IP address. Please try again in 15 minutes.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
});

/**
 * Dedicated strict rate limiter for rate-limit penetration testing.
 */
export const strictPenetrationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many requests. Rate limit threshold exceeded.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
});

/**
 * General API rate limiter for DDoS and request flooding mitigation.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'API request rate limit exceeded. Please throttle request velocity.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
});
