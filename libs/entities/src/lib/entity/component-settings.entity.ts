import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

/**
 * Component Settings Entity
 * Represents settings and configuration for electronic components
 */
@Entity({ tableName: 'component_settings' })
export class ComponentSettingsEntity {
  @PrimaryKey()
  @Property({
    fieldName: 'refComponentID',
    type: 'int',
    nullable: false,
  })
  refComponentID!: number;

  @Property({
    fieldName: 'functionalTypePartRequired',
    type: 'boolean',
    default: false,
  })
  functionalTypePartRequired = false;

  @Property({
    fieldName: 'mountingTypePartRequired',
    type: 'boolean',
    default: false,
  })
  mountingTypePartRequired = false;

  @Property({
    fieldName: 'businessRisk',
    type: 'string',
    length: 100,
    nullable: true,
  })
  businessRisk?: string;

  @Property({
    fieldName: 'totalSolderPoints',
    type: 'int',
    nullable: true,
  })
  totalSolderPoints?: number;

  @Property({
    fieldName: 'trackSerialNumber',
    type: 'boolean',
    default: false,
  })
  trackSerialNumber = false;

  @Property({
    fieldName: 'umidVerificationRequire',
    type: 'boolean',
    default: false,
  })
  umidVerificationRequire = false;

  @Property({
    fieldName: 'isAutoVerificationOfAllAssemblyParts',
    type: 'boolean',
    default: false,
  })
  isAutoVerificationOfAllAssemblyParts = false;

  @Property({
    fieldName: 'restrictUSEwithpermission',
    type: 'boolean',
    default: false,
  })
  restrictUSEwithpermission = false;

  @Property({
    fieldName: 'restrictPackagingUseWithpermission',
    type: 'boolean',
    default: false,
  })
  restrictPackagingUseWithpermission = false;

  @Property({
    fieldName: 'restrictUsePermanently',
    type: 'boolean',
    default: false,
  })
  restrictUsePermanently = false;

  @Property({
    fieldName: 'restrictPackagingUsePermanently',
    type: 'boolean',
    default: false,
  })
  restrictPackagingUsePermanently = false;

  @Property({
    fieldName: 'scrapRatePercentagePerBuild',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  scrapRatePercentagePerBuild?: string;

  @Property({
    fieldName: 'scrapValuePerBuild',
    type: 'int',
    nullable: true,
  })
  scrapValuePerBuild?: number;

  @Property({
    fieldName: 'plannedOverRunPercentagePerBuild',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  plannedOverRunPercentagePerBuild?: string;

  @Property({
    fieldName: 'plannedValuePerBuild',
    type: 'int',
    nullable: true,
  })
  plannedValuePerBuild?: number;

  @Property({
    fieldName: 'selfLifeDays',
    type: 'int',
    nullable: true,
  })
  selfLifeDays?: number;

  @Property({
    fieldName: 'shelfLifeAcceptanceDays',
    type: 'int',
    nullable: true,
  })
  shelfLifeAcceptanceDays?: number;

  @Property({
    fieldName: 'shelfListDaysThresholdPercentage',
    type: 'decimal',
    precision: 16,
    scale: 8,
    nullable: true,
  })
  shelfListDaysThresholdPercentage?: string;

  @Property({
    fieldName: 'maxShelfLifeAcceptanceDays',
    type: 'int',
    nullable: true,
  })
  maxShelfLifeAcceptanceDays?: number;

  @Property({
    fieldName: 'maxShelfListDaysThresholdPercentage',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  maxShelfListDaysThresholdPercentage?: string;

  @Property({
    fieldName: 'shelfLifeDateType',
    type: 'string',
    length: 1,
    nullable: true,
  })
  shelfLifeDateType?: string;

  @Property({
    fieldName: 'alertExpiryDays',
    type: 'int',
    nullable: true,
  })
  alertExpiryDays?: number;

  @Property({
    fieldName: 'programingRequired',
    type: 'boolean',
    default: false,
  })
  programingRequired = false;

  @Property({
    fieldName: 'driverToolRequired',
    type: 'boolean',
    default: false,
  })
  driverToolRequired = false;

  @Property({
    fieldName: 'matingPartRquired',
    type: 'boolean',
    default: false,
  })
  matingPartRquired = false;

  @Property({
    fieldName: 'pickupPadRequired',
    type: 'boolean',
    default: false,
  })
  pickupPadRequired = false;

  @Property({
    fieldName: 'functionalTestingRequired',
    type: 'boolean',
    default: false,
  })
  functionalTestingRequired = false;

  @Property({
    fieldName: 'requiredTestTime',
    type: 'int',
    nullable: true,
  })
  requiredTestTime?: number;

  @Property({
    fieldName: 'saftyStock',
    type: 'int',
    nullable: true,
  })
  saftyStock?: number;

  @Property({
    fieldName: 'eau',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  eau?: string;

  @Property({
    fieldName: 'packagingWeight',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  packagingWeight?: string;

  @Property({
    fieldName: 'packagingWeightUom',
    type: 'int',
    nullable: true,
  })
  packagingWeightUom?: number;

  @Property({
    fieldName: 'grossWeight',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  grossWeight?: string;

  @Property({
    fieldName: 'grossWeightUom',
    type: 'int',
    nullable: true,
  })
  grossWeightUom?: number;

  @Property({
    fieldName: 'maxPriceLimit',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  maxPriceLimit?: string;

  @Property({
    fieldName: 'maxQtyonHand',
    type: 'int',
    nullable: true,
  })
  maxQtyonHand?: number;

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
    fieldName: 'createByRoleId',
    type: 'int',
    nullable: false,
  })
  createByRoleId!: number;

  @Property({
    fieldName: 'updatedBy',
    type: 'string',
    length: 10,
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
    fieldName: 'updateByRoleId',
    type: 'int',
    nullable: false,
  })
  updateByRoleId!: number;

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
    fieldName: 'deleteByRoleId',
    type: 'int',
    nullable: true,
  })
  deleteByRoleId?: number;

  @Property({
    fieldName: 'dateCodeFormatID',
    type: 'int',
    nullable: true,
  })
  dateCodeFormatID?: number;

  @Property({
    fieldName: 'isReceiveBulkItem',
    type: 'boolean',
    default: false,
  })
  isReceiveBulkItem = false;

  @Property({
    fieldName: 'isDateCodeFormat',
    type: 'boolean',
    default: false,
  })
  isDateCodeFormat = false;

  @Property({
    fieldName: 'countryOfOrigin',
    type: 'string',
    length: 30,
    nullable: true,
  })
  countryOfOrigin?: string;

  @Property({
    fieldName: 'htsCode',
    type: 'string',
    length: 12,
    nullable: true,
  })
  htsCode?: string;

  @Property({
    fieldName: 'frequency',
    type: 'int',
    nullable: true,
  })
  frequency?: number;

  @Property({
    fieldName: 'frequencyType',
    type: 'int',
    nullable: true,
  })
  frequencyType?: number;

  @Property({
    fieldName: 'supplierShortShipmentAcceptance',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
  })
  supplierShortShipmentAcceptance?: string;

  @Property({
    fieldName: 'supplierOverShipmentAcceptance',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
  })
  supplierOverShipmentAcceptance?: string;

  @Property({
    fieldName: 'shipDateIsDomPerMfr',
    type: 'boolean',
    default: false,
  })
  shipDateIsDomPerMfr = false;

  @Property({
    fieldName: 'hsnSacCode',
    type: 'int',
    nullable: true,
  })
  hsnSacCode?: number;

  @Property({
    fieldName: 'eccn',
    type: 'string',
    length: 10,
    nullable: true,
  })
  eccn?: string;

  @Property({
    fieldName: 'scheduleBCode',
    type: 'string',
    length: 20,
    nullable: true,
  })
  scheduleBCode?: string;

  @Property({
    fieldName: 'cooId',
    type: 'int',
    nullable: true,
  })
  cooId?: number;

  // Relationships
  @ManyToOne('ComponentEntity', { nullable: false })
  component?: any;
}