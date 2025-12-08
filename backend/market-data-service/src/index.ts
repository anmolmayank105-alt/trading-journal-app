/**
 * Market Data Service Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

// Load environment variables
config();

import { connectDatabase } from './config';
import { marketDataRoutes, watchlistRoutes, priceAlertRoutes } from './routes';
import { webSocketService } from './services';
import { errorHandler, notFoundHandler } from './middleware';
import { logger } from '@stock-tracker/shared/utils';

const app = express();
const PORT = process.env.PORT || 3005;
const WS_PORT = parseInt(process.env.WS_PORT || '3006');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const wsStats = webSocketService.getStats();
  res.json({
    status: 'healthy',
    service: 'market-data-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    websocket: {
      port: WS_PORT,
      connections: wsStats.totalConnections,
    },
  });
});

// Routes
app.use('/api/v1/market', marketDataRoutes);
app.use('/api/v1/watchlists', watchlistRoutes);
app.use('/api/v1/alerts', priceAlertRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    // Initialize WebSocket server
    webSocketService.initialize(WS_PORT);
    
    app.listen(PORT, () => {
      logger.info({ port: PORT, wsPort: WS_PORT }, 'Market data service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start market data service');
    process.exit(1);
  }
};

startServer();
