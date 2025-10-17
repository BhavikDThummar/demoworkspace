import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

/**
 * Component Attributes Entity
 * Represents attributes for electronic components
 */
@Entity({ tableName: 'component_attributes' })
export class ComponentAttributesEntity {
  @PrimaryKey()
  @Property({
    fieldName: 'refComponentID',
    type: 'int',
    nullable: false,
  })
  refComponentID!: number;

  @Property({
    fieldName: 'packaginggroupID',
    type: 'int',
    nullable: true,
  })
  packaginggroupID?: number;

  @Property({
    fieldName: 'isCloudApiUpdateAttribute',
    type: 'boolean',
    default: true,
  })
  isCloudApiUpdateAttribute = true;

  @Property({
    fieldName: 'functionalCategoryID',
    type: 'int',
    nullable: true,
  })
  functionalCategoryID?: number;

  @Property({
    fieldName: 'functionalCategoryText',
    type: 'string',
    length: 255,
    nullable: true,
  })
  functionalCategoryText?: string;

  @Property({
    fieldName: 'mountingTypeID',
    type: 'int',
    nullable: true,
  })
  mountingTypeID?: number;

  @Property({
    fieldName: 'mountingTypeText',
    type: 'string',
    length: 255,
    nullable: true,
  })
  mountingTypeText?: string;

  @Property({
    fieldName: 'isEpoxyMount',
    type: 'boolean',
    default: false,
  })
  isEpoxyMount = false;

  @Property({
    fieldName: 'partPackageID',
    type: 'int',
    nullable: true,
  })
  partPackageID?: number;

  @Property({
    fieldName: 'partPackage',
    type: 'string',
    length: 200,
    nullable: true,
  })
  partPackage?: string;

  @Property({
    fieldName: 'connecterTypeID',
    type: 'int',
    nullable: true,
  })
  connecterTypeID?: number;

  @Property({
    fieldName: 'connectorTypeText',
    type: 'string',
    length: 100,
    nullable: true,
  })
  connectorTypeText?: string;

  @Property({
    fieldName: 'feature',
    type: 'string',
    length: 255,
    nullable: true,
  })
  feature?: string;

  @Property({
    fieldName: 'noOfPosition',
    type: 'int',
    nullable: true,
  })
  noOfPosition?: number;

  @Property({
    fieldName: 'noOfPositionText',
    type: 'string',
    length: 100,
    nullable: true,
  })
  noOfPositionText?: string;

  @Property({
    fieldName: 'noOfRows',
    type: 'int',
    nullable: true,
  })
  noOfRows?: number;

  @Property({
    fieldName: 'noOfRowsText',
    type: 'string',
    length: 100,
    nullable: true,
  })
  noOfRowsText?: string;

  @Property({
    fieldName: 'operatingTemp',
    type: 'string',
    length: 50,
    nullable: true,
  })
  operatingTemp?: string;

  @Property({
    fieldName: 'minOperatingTemp',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  minOperatingTemp?: string;

  @Property({
    fieldName: 'maxOperatingTemp',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  maxOperatingTemp?: string;

  @Property({
    fieldName: 'temperatureCoefficient',
    type: 'string',
    length: 100,
    nullable: true,
  })
  temperatureCoefficient?: string;

  @Property({
    fieldName: 'temperatureCoefficientValue',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  temperatureCoefficientValue?: string;

  @Property({
    fieldName: 'temperatureCoefficientUnit',
    type: 'string',
    length: 50,
    nullable: true,
  })
  temperatureCoefficientUnit?: string;

  @Property({
    fieldName: 'pitch',
    type: 'string',
    length: 50,
    nullable: true,
  })
  pitch?: string;

  @Property({
    fieldName: 'pitchMating',
    type: 'string',
    length: 50,
    nullable: true,
  })
  pitchMating?: string;

  @Property({
    fieldName: 'sizeDimension',
    type: 'string',
    length: 150,
    nullable: true,
  })
  sizeDimension?: string;

  @Property({
    fieldName: 'length',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  length?: string;

  @Property({
    fieldName: 'width',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  width?: string;

  @Property({
    fieldName: 'height',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  height?: string;

  @Property({
    fieldName: 'heightText',
    type: 'string',
    length: 50,
    nullable: true,
  })
  heightText?: string;

  @Property({
    fieldName: 'tolerance',
    type: 'string',
    length: 50,
    nullable: true,
  })
  tolerance?: string;

  @Property({
    fieldName: 'voltage',
    type: 'string',
    length: 50,
    nullable: true,
  })
  voltage?: string;

  @Property({
    fieldName: 'value',
    type: 'string',
    length: 50,
    nullable: true,
  })
  value?: string;

  @Property({
    fieldName: 'powerRating',
    type: 'string',
    length: 50,
    nullable: true,
  })
  powerRating?: string;

  @Property({
    fieldName: 'weight',
    type: 'string',
    length: 50,
    nullable: true,
  })
  weight?: string;

  @Property({
    fieldName: 'color',
    type: 'string',
    length: 100,
    nullable: true,
  })
  color?: string;

  @Property({
    fieldName: 'isTemperatureSensitive',
    type: 'boolean',
    default: false,
  })
  isTemperatureSensitive = false;

  @Property({
    fieldName: 'isDeleted',
    type: 'boolean',
    default: false,
  })
  isDeleted = false;

  @Property({
    fieldName: 'createdBy',
    type: 'int',
    nullable: false,
  })
  createdBy!: number;

  @Property({
    fieldName: 'createdAt',
    type: 'datetime',
    nullable: false,
  })
  createdAt!: Date;

  @Property({
    fieldName: 'createByRoleId',
    type: 'int',
    nullable: false,
  })
  createByRoleId!: number;

  @Property({
    fieldName: 'updatedBy',
    type: 'int',
    nullable: false,
  })
  updatedBy!: number;

  @Property({
    fieldName: 'updatedAt',
    type: 'datetime',
    nullable: false,
  })
  updatedAt!: Date;

  @Property({
    fieldName: 'updateByRoleId',
    type: 'int',
    nullable: false,
  })
  updateByRoleId!: number;

  @Property({
    fieldName: 'deletedBy',
    type: 'int',
    nullable: true,
  })
  deletedBy?: number;

  @Property({
    fieldName: 'deletedAt',
    type: 'datetime',
    nullable: true,
  })
  deletedAt?: Date;

  @Property({
    fieldName: 'deleteByRoleId',
    type: 'int',
    nullable: true,
  })
  deleteByRoleId?: number;

  @Property({
    fieldName: 'isHeaderBreakaway',
    type: 'boolean',
    default: false,
  })
  isHeaderBreakaway = false;

  // Relationships
  @ManyToOne('ComponentEntity', { nullable: false })
  component?: any;

  @ManyToOne('RfqMountingTypeEntity', { nullable: true })
  mountingType?: any;

  @ManyToOne('RfqPartTypeEntity', { nullable: true })
  functionalCategory?: unknown;
}