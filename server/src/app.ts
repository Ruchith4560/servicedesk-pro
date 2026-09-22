import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import slaRoutes from './modules/sla/sla.routes.js';
import assetsRoutes from './modules/assets/assets.routes.js';
import knowledgeRoutes from './modules/knowledge/knowledge.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { sendError } from './utils/apiResponse.js';
import { securityHeaders } from './middleware/securityHeaders.middleware.js';
import { mongoSanitizeMiddleware } from './middleware/sanitize.middleware.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

// Security & Parsing Middlewares
app.use(securityHeaders);
app.use(cors({ origin: env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitizeMiddleware);

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'servicedesk-pro-core-api',
    timestamp: new Date().toISOString()
  });
});

// Apply Rate Limiters
app.use('/api/v1/auth', authRateLimiter, authRoutes);

// General Protected Modules
app.use('/api/v1', apiRateLimiter);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/sla', slaRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/audit', auditRoutes);

// Serve static React client in production when built
if (process.env.NODE_ENV !== 'test' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Handler
app.use((_req, res) => {
  sendError(res, 'Requested resource route not found.', 404, 'NOT_FOUND');
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
