import { INestApplication, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { getMikroORMToken } from '@mikro-orm/nestjs';

const logger = new Logger('Bootstrap');

/**
 * Initialize and verify MikroORM connections
 * @param app NestJS application instance
 */
export async function initializeMikroORM(app: INestApplication): Promise<void> {
  // Get ORM instances
  const defaultOrm = app.get(MikroORM); // MySQL default
  const mongoOrm = app.get<MikroORM>(getMikroORMToken('mongo')); // MongoDB default

  try {
    // Check MySQL default connection
    const isDefaultConnected = await defaultOrm.isConnected();
    if (isDefaultConnected) {
      logger.log('MySQL default database connection established successfully');
    } else {
      logger.error('Failed to connect to MySQL database');
      throw new Error('MySQL database connection failed');
    }

    // Check MongoDB connection
    const isMongoConnected = await mongoOrm.isConnected();
    if (isMongoConnected) {
      logger.log('MongoDB connection established successfully');
    } else {
      logger.error('Failed to connect to MongoDB');
      throw new Error('MongoDB connection failed');
    }

    // Check QA database connection if enabled
    if (process.env['ENABLE_QA_DATABASES'] === 'true') {
      try {
        const qaOrm = app.get<MikroORM>(getMikroORMToken('qa'));
        const isQaConnected = await qaOrm.isConnected();

        if (isQaConnected) {
          logger.log('QA database connection established successfully');
        } else {
          logger.warn('Failed to connect to QA database');
        }
      } catch (err) {
        logger.warn(
          'QA database connection not configured or failed to initialize',
          err instanceof Error ? err.stack : String(err),
        );
      }

      try {
        const mongoQaOrm = app.get<MikroORM>(getMikroORMToken('mongo_qa'));
        const ismongoQaConnected = await mongoQaOrm.isConnected();

        if (ismongoQaConnected) {
          logger.log('MongoDB QA database connection established successfully');
        } else {
          logger.warn('Failed to connect to MongoDB QA database');
        }
      } catch (err) {
        logger.warn(
          'MongoDB QA database connection not configured or failed to initialize',
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  } catch (err) {
    logger.error(
      'Critical database initialization error',
      err instanceof Error ? err.stack : String(err),
    );
    throw err; // Re-throw to prevent app startup with failed DB connection
  }
}
