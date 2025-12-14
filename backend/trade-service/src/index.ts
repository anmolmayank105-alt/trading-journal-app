/**
 * Trade Service Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { connectDatabase } from './config';
import { tradeRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { logger } from '../../shared/dist/utils';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());

// CORS configuration for production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3002', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview URLs
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === '*')) {
      return callback(null, true);
    }
    
    // In development, allow all localhost
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));

// Disable caching for all API responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'trade-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1/trades', tradeRoutes);

// Error handling
app.use(notFoundHandler as any);
app.use(errorHandler as any);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`Trade Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Service ready to accept requests');
    });
    
    //Keep the process alive
    server.on('close', () => {
      logger.info('Server closed');
    });
    
    // Prevent process from exiting
    setInterval(() => {
      // Keep alive
    }, 1000 * 60 * 60); // Every hour
    
  } catch (error) {
    logger.error({ error }, 'Failed to start Trade Service');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection - Keeping process alive for debugging');
  // Don't exit - let's see what's happening
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception - Keeping process alive for debugging');
  // Don't exit immediately
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
