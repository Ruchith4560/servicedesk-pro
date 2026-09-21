import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { sendError } from './utils/apiResponse.js';

const app = express();

// Security & Parsing Middlewares
app.use(cors({ origin: env.CLIENT_URL || '*' }));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'servicedesk-pro-core-api',
    timestamp: new Date().toISOString()
  });
});

// Mount Module Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tickets', ticketsRoutes);

// 404 Handler
app.use((_req, res) => {
  sendError(res, 'Requested resource route not found.', 404, 'NOT_FOUND');
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
