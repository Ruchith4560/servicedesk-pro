import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise security response headers middleware adhering to OWASP recommendations.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by denying framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Cross-Site Scripting (XSS) filter defense
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HTTP Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy restricting sources and frame ancestors while allowing React assets and fonts
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https: ws: wss:; frame-ancestors 'none';"
  );

  // Remove Express fingerprint header
  res.removeHeader('X-Powered-By');

  next();
};
