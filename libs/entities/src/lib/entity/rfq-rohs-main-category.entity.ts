import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';

/**
 * RFQ RoHS Main Category Entity
 * Represents main categories for RoHS status classification
 */
@Entity({ tableName: 'rfq_rohs_main_categorymst' })
export class RfqRohsMainCategoryEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'name',
    type: 'string',
    length: 50,
    nullable: true,
  })
  name?: string;

  @Property({
    fieldName: 'description',
    type: 'string',
    length: 250,
    nullable: true,
  })
  description?: string;

  @Property({
    fieldName: 'isActive',
    type: 'boolean',
    default: true,
  })
  isActive = true;

  @Property({
    fieldName: 'createdBy',
    type: 'string',
    length: 255,
    nullable: false,
  })
  createdBy!: string;

  @Property({
    fieldName: 'createdAt',
    type: 'datetime',
    nullable: false,
  })
  createdAt!: Date;

  @Property({
    fieldName: 'updatedBy',
    type: 'string',
    length: 255,
    nullable: false,
  })
  updatedBy!: string;

  @Property({
    fieldName: 'updatedAt',
    type: 'datetime',
    nullable: false,
  })
  updatedAt!: Date;

  @Property({
    fieldName: 'deletedBy',
    type: 'string',
    length: 255,
    nullable: true,
  })
  deletedBy?: string;

  @Property({
    fieldName: 'deletedAt',
    type: 'datetime',
    nullable: true,
  })
  deletedAt?: Date;

  @Property({
    fieldName: 'isDeleted',
    type: 'boolean',
    default: false,
  })
  isDeleted = false;

  @Property({
    fieldName: 'createByRoleId',
    type: 'int',
    nullable: false,
  })
  createByRoleId!: number;

  @Property({
    fieldName: 'updateByRoleId',
    type: 'int',
    nullable: false,
  })
  updateByRoleId!: number;

  @Property({
    fieldName: 'deleteByRoleId',
    type: 'int',
    nullable: true,
  })
  deleteByRoleId?: number;

  // Relationships
  @OneToMany('RfqRohsEntity', 'mainCategory')
  rohsStatuses = new Collection<any>(this);
}
