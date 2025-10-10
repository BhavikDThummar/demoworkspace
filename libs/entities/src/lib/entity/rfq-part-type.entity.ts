import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';

/**
 * RFQ Part Type Entity
 * Represents functional types/categories for parts
 */
@Entity({ tableName: 'rfq_parttypemst' })
export class RfqPartTypeEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'partTypeName',
    type: 'string',
    length: 255,
    nullable: false,
  })
  partTypeName!: string;

  @Property({
    fieldName: 'displayOrder',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  displayOrder?: string;

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
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

  @Property({
    fieldName: 'isTemperatureSensitive',
    type: 'boolean',
    default: false,
  })
  isTemperatureSensitive = false;

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

  @Property({
    fieldName: 'unqDate',
    type: 'datetime',
    nullable: false,
    default: '2001-01-01 00:00:00',
  })
  unqDate!: Date;

  @Property({
    fieldName: 'sourceName',
    type: 'string',
    length: 100,
    nullable: true,
  })
  sourceName?: string;

  // Relationships
  @OneToMany('ComponentAttributesEntity', 'functionalCategory')
  componentAttributes = new Collection<unknown>(this);
}
