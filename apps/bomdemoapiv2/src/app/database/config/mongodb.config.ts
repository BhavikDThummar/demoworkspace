import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig } from '@mikro-orm/mongodb';
import { MongoDriver } from '@mikro-orm/mongodb';
import { TestDocumentEntity } from '@org/entities';

import * as dotenv from 'dotenv';

// Remove this if it's not required.
dotenv.config();

// Base configuration shared between default and QA
const baseConfig = {
  driver: MongoDriver,
  entities: [TestDocumentEntity],
  pool: {
    max: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
    min: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '1', 10),
  },
  driverOptions: {
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
    heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY || '10000', 10),
  },
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
  discovery: {
    warnWhenNoEntities: true,
    requireEntitiesArray: false,
    alwaysAnalyseProperties: true,
  },
  ensureIndexes: true,
  cache: {
    enabled: true,
    pretty: process.env.NODE_ENV === 'development',
  },
};

// Default database configuration
const defaultDbConfig = defineConfig({
  ...baseConfig,
  clientUrl: process.env.MONGODB_URI,
});

// QA database configuration
const qaDbConfig = defineConfig({
  ...baseConfig,
  clientUrl: process.env.MONGODB_URI_QA,
});

export const mongoMikroOrmImports = [
  MikroOrmModule.forRoot({
    ...defaultDbConfig,
    contextName: 'mongo',
  }),
];

if (process.env.ENABLE_QA_DATABASES === 'true') {
  mongoMikroOrmImports.push(
    MikroOrmModule.forRoot({
      ...qaDbConfig,
      contextName: 'mongo_qa',
    }),
  );
}
