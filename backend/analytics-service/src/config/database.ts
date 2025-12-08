/**
 * Database Configuration
 */

import mongoose from 'mongoose';
import { logger } from '@stock-tracker/shared/utils';

export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
    
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
