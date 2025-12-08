/**
 * Auth Service - Main Entry Point
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware';
import { authRoutes, userRoutes } from './routes';
import { logger } from '@stock-tracker/shared/utils';

const app = express();
const PORT = process.env.PORT || 3001;

// ============= Middleware =============

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ============= Health Check =============

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============= Routes =============

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// ============= Error Handling =============

app.use(notFoundHandler);
app.use(errorHandler);

// ============= Start Server =============

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection');
  process.exit(1);
});

startServer();

export default app;
