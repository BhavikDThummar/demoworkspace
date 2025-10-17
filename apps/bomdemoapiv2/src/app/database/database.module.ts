import { Module, Global, Scope } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  TenantConnectionProvider,
  MongoConnectionProvider,
  MONGO_CONNECTION,
  MONGO_ENTITY_MANAGER,
  TENANT_CONNECTION,
  TENANT_ENTITY_MANAGER,
} from '@org/database';
import { mongoMikroOrmImports } from './config/mongodb.config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { mikroOrmImports } from './config/mysql-config';
import {
  TestDocumentEntity,
  UomEntity,
  ComponentEntity,
  MfgCodeMasterEntity,
  MfgCodeAliasEntity,
  ComponentAttributesEntity,
  ComponentSettingsEntity,
  RfqRohsEntity,
  RfqRohsMainCategoryEntity,
  RfqPartTypeEntity,
  RfqMountingTypeEntity,
} from '@org/entities';

/**
 * Dynamically build MikroORM imports array
 */
@Global()
@Module({
  imports: [
    ...mikroOrmImports,
    ...mongoMikroOrmImports,
    // Register SQL entities for dependency injection -- This is only for testing purposes; we will move it to the appropriate module level.
    MikroOrmModule.forFeature([
      UomEntity,
      ComponentEntity,
      MfgCodeMasterEntity,
      MfgCodeAliasEntity,
      ComponentAttributesEntity,
      ComponentSettingsEntity,
      RfqRohsEntity,
      RfqRohsMainCategoryEntity,
      RfqPartTypeEntity,
      RfqMountingTypeEntity,
    ]),
    // Register MongoDB entities
    MikroOrmModule.forFeature([TestDocumentEntity], 'mongo'),
  ],
  providers: [
    TenantConnectionProvider,
    MongoConnectionProvider,
    {
      provide: TENANT_ENTITY_MANAGER,
      scope: Scope.REQUEST,
      inject: [TENANT_CONNECTION],
      useFactory: (orm: any): EntityManager => {
        return orm.em;
      },
    },
    {
      provide: MONGO_ENTITY_MANAGER,
      scope: Scope.REQUEST,
      inject: [MONGO_CONNECTION],
      useFactory: (orm: unknown): EntityManager => {
        return orm.em;
      },
    },
  ],
  exports: [
    MikroOrmModule,
    TENANT_ENTITY_MANAGER,
    MONGO_ENTITY_MANAGER,
    TENANT_CONNECTION,
    MONGO_CONNECTION,
  ],
})
export class DatabaseModule {}
