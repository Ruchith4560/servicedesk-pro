import { Request, Response, NextFunction } from 'express';

/**
 * Recursively strips MongoDB query selectors starting with '$' or containing '.'
 * to prevent blind NoSQL injection and prototype tampering.
 */
function sanitizeValue(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      // Prohibit keys starting with '$' (NoSQL operators) or containing '.' (deep path injection)
      if (k.startsWith('$') || k.includes('.')) {
        continue;
      }
      cleanObj[k] = sanitizeValue(v);
    }
    return cleanObj;
  }
  return value;
}

export const mongoSanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};
