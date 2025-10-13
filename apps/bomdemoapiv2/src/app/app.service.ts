import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { UomEntity } from '@org/entities';
import { TENANT_ENTITY_MANAGER } from '@org/database';

@Injectable()
export class AppService {
  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async getUomData(): Promise<{ message: string; unitName?: string; found: boolean }> {
    try {
      // Fetch UOM record with id = -1
      const uomRecord = await this.em.findOne(UomEntity, { id: -1 });

      if (uomRecord) {
        return {
          message: 'Hello API',
          unitName: uomRecord.unitName,
          found: true,
        };
      } else {
        return {
          message: 'Hello API',
          unitName: undefined,
          found: false,
        };
      }
    } catch (error) {
      console.error('Error fetching UOM record:', error);
      return {
        message: 'Hello API',
        unitName: undefined,
        found: false,
      };
    }
  }
}
