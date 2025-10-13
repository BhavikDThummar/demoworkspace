import { defineConfig } from '@mikro-orm/mysql';
import { MySqlDriver } from '@mikro-orm/mysql';
import { LoadStrategy } from '@mikro-orm/core';
import * as dotenv from 'dotenv';
// Import only SQL entities, not MongoDB entities
import {
  ComponentAttributesEntity,
  ComponentSettingsEntity,
  ComponentEntity,
  MfgCodeAliasEntity,
  MfgCodeMasterEntity,
  RfqMountingTypeEntity,
  RfqPartTypeEntity,
  RfqRohsMainCategoryEntity,
  RfqRohsEntity,
  UomEntity,
} from '@org/entities';
import { MikroOrmModule } from '@mikro-orm/nestjs';

dotenv.config();

// Base configuration shared between default and QA
const baseConfig = {
  driver: MySqlDriver,
  debug: process.env.NODE_ENV === 'development',
  // namingStrategy: EntityCaseNamingStrategy,
  allowGlobalContext: true,
  discovery: {
    warnWhenNoEntities: true,
    requireEntitiesArray: false,
    alwaysAnalyseProperties: true,
  },
  // Explicitly specify entities
  entities: [
    ComponentAttributesEntity,
    ComponentSettingsEntity,
    ComponentEntity,
    MfgCodeAliasEntity,
    MfgCodeMasterEntity,
    RfqMountingTypeEntity,
    RfqPartTypeEntity,
    RfqRohsMainCategoryEntity,
    RfqRohsEntity,
    UomEntity,
  ],
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  },
  loadStrategy: LoadStrategy.JOINED,
  cache: {
    enabled: true,
    pretty: process.env.NODE_ENV === 'development',
  },
};

// Default database configuration
const defaultDbConfig = defineConfig({
  ...baseConfig,
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'bomdemodb',
});

// QA database configuration
const qaDbConfig = defineConfig({
  ...baseConfig,
  host: process.env.DB_HOST_QA || process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT_QA || process.env.DB_PORT || '3306'),
  user: process.env.DB_USER_QA || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD_QA || process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME_QA || `${process.env.DB_NAME || 'bomdemodb'}_qa`,
});

export const mikroOrmImports = [
  MikroOrmModule.forRoot({
    ...defaultDbConfig,
  }),
];

if (process.env.ENABLE_QA_DATABASES === 'true') {
  mikroOrmImports.push(
    MikroOrmModule.forRoot({
      ...qaDbConfig,
      contextName: 'qa',
    }),
  );
}
