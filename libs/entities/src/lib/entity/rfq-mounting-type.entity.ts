import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';

/**
 * RFQ Mounting Type Entity
 * Represents mounting types for electronic components
 */
@Entity({ tableName: 'rfq_mountingtypemst' })
export class RfqMountingTypeEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'name',
    type: 'string',
    length: 255,
    nullable: false,
  })
  name!: string;

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
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

  @Property({
    fieldName: 'colorCode',
    type: 'string',
    length: 100,
    nullable: true,
  })
  colorCode?: string;

  @Property({
    fieldName: 'isCountTypeEach',
    type: 'boolean',
    default: false,
  })
  isCountTypeEach = false;

  @Property({
    fieldName: 'numberOfPrintForUMID',
    type: 'int',
    nullable: false,
    default: 1,
  })
  numberOfPrintForUMID = 1;

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
    fieldName: 'displayOrder',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  displayOrder?: string;

  @Property({
    fieldName: 'unqDate',
    type: 'datetime',
    nullable: false,
    default: '2001-01-01 00:00:00',
  })
  unqDate!: Date;

  @Property({
    fieldName: 'hasLimitedShelfLife',
    type: 'boolean',
    default: false,
  })
  hasLimitedShelfLife = false;

  @Property({
    fieldName: 'sourceName',
    type: 'string',
    length: 100,
    nullable: true,
  })
  sourceName?: string;

  // Relationships
  @OneToMany('ComponentAttributesEntity', 'mountingType')
  componentAttributes = new Collection<any>(this);
}