import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Unit of Measurement (UOM) Entity
 * Represents different units of measurement used in the system
 */

@Entity({ tableName: 'uoms' })
export class UomEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'measurementTypeID',
    type: 'int',
    nullable: false,
    comment: 'Reference to measurement type',
  })
  measurementTypeID!: number;

  @Property({
    fieldName: 'unitName',
    type: 'string',
    length: 100,
    nullable: false,
  })
  unitName!: string;

  @Property({
    fieldName: 'abbreviation',
    type: 'string',
    length: 10,
    nullable: true,
  })
  abbreviation?: string;

  @Property({
    fieldName: 'perUnit',
    type: 'int',
    nullable: true,
  })
  perUnit?: number;

  @Property({
    fieldName: 'baseUnitID',
    type: 'int',
    nullable: true,
    comment: 'Reference to base UOM',
  })
  baseUnitID?: number;

  @Property({
    fieldName: 'baseUnitConvertValue',
    type: 'decimal',
    precision: 50,
    scale: 30,
    nullable: true,
  })
  baseUnitConvertValue?: string;

  @Property({
    fieldName: 'isFormula',
    type: 'boolean',
    default: false,
  })
  isFormula = false;

  @Property({
    fieldName: 'description',
    type: 'string',
    length: 2000,
    nullable: true,
  })
  description?: string;

  @Property({
    fieldName: 'isDefault',
    type: 'boolean',
    default: false,
  })
  isDefault = false;

  @Property({
    fieldName: 'isSystemDefault',
    type: 'boolean',
    default: false,
  })
  isSystemDefault = false;

  @Property({
    fieldName: 'isDeleted',
    type: 'boolean',
    default: false,
  })
  isDeleted = false;

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
    fieldName: 'ord',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  ord?: string;

  @Property({
    fieldName: 'defaultUOM',
    type: 'boolean',
    default: false,
  })
  defaultUOM = false;

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
    fieldName: 'operator',
    type: 'string',
    length: 30,
    nullable: true,
  })
  operator?: string;

  @Property({
    fieldName: 'orgBaseUnitValue',
    type: 'double',
    nullable: true,
  })
  orgBaseUnitValue?: number;

  @Property({
    fieldName: 'sourceName',
    type: 'string',
    length: 100,
    nullable: true,
  })
  sourceName?: string;
}
