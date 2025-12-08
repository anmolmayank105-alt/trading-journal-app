/**
 * Analytics Service Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

// Load environment variables
config();

import { connectDatabase } from './config';
import { analyticsRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { logger } from '@stock-tracker/shared/utils';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/v1/analytics', analyticsRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Analytics service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start analytics service');
    process.exit(1);
  }
};

startServer();
