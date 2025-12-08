/**
 * Database Configuration
 */

import mongoose from 'mongoose';
import { logger } from '@stock-tracker/shared/utils';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_analytics';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('MongoDB connected successfully');
    
    mongoose.connection.on('error', (error) => {
      logger.error({ error }, 'MongoDB connection error');
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
};
