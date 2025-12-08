/**
 * Trade Service - Database Configuration
 */

import mongoose from 'mongoose';
import { logger } from '@stock-tracker/shared/utils';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_analytics';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
