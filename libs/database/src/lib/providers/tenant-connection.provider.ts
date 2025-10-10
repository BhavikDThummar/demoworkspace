import { REQUEST } from '@nestjs/core';
import { Scope } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { FastifyRequest } from 'fastify';
import { getMikroORMToken } from '@mikro-orm/nestjs';
import { TENANT_CONNECTION } from '../constants/database.constant';
import { ENV_KEYS } from '../constants/env.constant';

// Helper to build conditional injection tokens
function getDbInjectTokens() {
  const tokens: Array<typeof REQUEST | typeof MikroORM | string> = [REQUEST, MikroORM];

  if (process.env[ENV_KEYS.ENABLE_QA_DATABASES] === 'true') {
    tokens.push(getMikroORMToken('qa'));
  }

  return tokens;
}

export const TenantConnectionProvider = {
  provide: TENANT_CONNECTION,
  scope: Scope.REQUEST,
  inject: getDbInjectTokens(),
  useFactory: async (req: FastifyRequest, defaultOrm: MikroORM, qaOrm: MikroORM) => {
    const isQa = req.headers['x-db-env'] === 'qa';
    return isQa && qaOrm ? qaOrm : defaultOrm;
  },
};
