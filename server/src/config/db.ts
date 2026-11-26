import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to connect to MongoDB. Exiting.');
    process.exit(1);
  }
}