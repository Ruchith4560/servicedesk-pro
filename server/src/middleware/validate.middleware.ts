import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.js';

export type RequestValidationSchema =
  | {
      body?: AnyZodObject;
      query?: AnyZodObject;
      params?: AnyZodObject;
    }
  | AnyZodObject;

export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schema) {
        // Schema is a top-level Zod object: z.object({ body, query, params })
        const parsed = (await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        })) as any;

        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query;
        if (parsed.params) req.params = parsed.params;
      } else {
        // Schema is a dictionary of sub-schemas
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
          req.params = await schema.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', formattedErrors);
        return;
      }
      sendError(res, 'Invalid request data', 400, 'BAD_REQUEST');
    }
  };
};
