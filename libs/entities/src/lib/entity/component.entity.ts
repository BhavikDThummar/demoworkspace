import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';

/**
 * Component Entity
 * Represents electronic components/parts in the system
 */
@Entity({ tableName: 'component' })
export class ComponentEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'imageURL',
    type: 'string',
    length: 500,
    nullable: true,
  })
  imageURL?: string;

  @Property({
    fieldName: 'mfgPN',
    type: 'string',
    length: 100,
    nullable: false,
  })
  mfgPN!: string;

  @Property({
    fieldName: 'mfgcodeID',
    type: 'int',
    nullable: false,
  })
  mfgcodeID!: number;

  @Property({
    fieldName: 'mfgPNDescription',
    type: 'string',
    length: 2000,
    nullable: false,
    default: '-',
  })
  mfgPNDescription = '-';

  @Property({
    fieldName: 'packageQty',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  packageQty?: string;

  @Property({
    fieldName: 'partStatus',
    type: 'int',
    nullable: false,
  })
  partStatus!: number;

  @Property({
    fieldName: 'ltbDate',
    type: 'date',
    nullable: true,
  })
  ltbDate?: Date;

  @Property({
    fieldName: 'RoHSStatusID',
    type: 'int',
    nullable: false,
  })
  RoHSStatusID!: number;

  @Property({
    fieldName: 'isDeleted',
    type: 'boolean',
    default: false,
  })
  isDeleted = false;

  @Property({
    fieldName: 'CreatedBy',
    type: 'int',
    nullable: false,
  })
  CreatedBy!: number;

  @Property({
    fieldName: 'createdAt',
    type: 'datetime',
    nullable: false,
  })
  createdAt!: Date;

  @Property({
    fieldName: 'UpdatedBy',
    type: 'int',
    nullable: false,
  })
  UpdatedBy!: number;

  @Property({
    fieldName: 'updatedAt',
    type: 'datetime',
    nullable: false,
  })
  updatedAt!: Date;

  @Property({
    fieldName: 'DeletedBy',
    type: 'int',
    nullable: true,
  })
  DeletedBy?: number;

  @Property({
    fieldName: 'deletedAt',
    type: 'datetime',
    nullable: true,
  })
  deletedAt?: Date;

  @Property({
    fieldName: 'PIDCode',
    type: 'string',
    length: 109,
    nullable: false,
  })
  PIDCode!: string;

  @Property({
    fieldName: 'isGoodPart',
    type: 'int',
    nullable: true,
    default: 1,
    comment: '1. Good Part, 2. Bad Part, 3. TBD Part',
  })
  isGoodPart?: number;

  @Property({
    fieldName: 'leadTime',
    type: 'int',
    nullable: true,
  })
  leadTime?: number;

  @Property({
    fieldName: 'packaging',
    type: 'string',
    length: 60,
    nullable: true,
  })
  packaging?: string;

  @Property({
    fieldName: 'uom',
    type: 'int',
    nullable: false,
  })
  uom!: number;

  @Property({
    fieldName: 'deviceMarking',
    type: 'text',
    nullable: true,
  })
  deviceMarking?: string;

  @Property({
    fieldName: 'minimum',
    type: 'string',
    length: 20,
    nullable: true,
  })
  minimum?: string;

  @Property({
    fieldName: 'mult',
    type: 'string',
    length: 20,
    nullable: true,
  })
  mult?: string;

  @Property({
    fieldName: 'uomText',
    type: 'string',
    length: 50,
    nullable: true,
  })
  uomText?: string;

  @Property({
    fieldName: 'category',
    type: 'int',
    nullable: false,
  })
  category!: number;

  @Property({
    fieldName: 'rohsText',
    type: 'string',
    length: 50,
    nullable: true,
  })
  rohsText?: string;

  @Property({
    fieldName: 'dataSheetLink',
    type: 'string',
    length: 1000,
    nullable: true,
  })
  dataSheetLink?: string;

  @Property({
    fieldName: 'replacementPartID',
    type: 'int',
    nullable: true,
  })
  replacementPartID?: number;

  @Property({
    fieldName: 'eolDate',
    type: 'date',
    nullable: true,
  })
  eolDate?: Date;

  @Property({
    fieldName: 'specialNote',
    type: 'text',
    nullable: true,
  })
  specialNote?: string;

  @Property({
    fieldName: 'partStatusText',
    type: 'string',
    length: 50,
    nullable: true,
  })
  partStatusText?: string;

  @Property({
    fieldName: 'isPIDManual',
    type: 'boolean',
    default: false,
  })
  isPIDManual = false;

  @Property({
    fieldName: 'isCustom',
    type: 'boolean',
    default: false,
  })
  isCustom = false;

  @Property({
    fieldName: 'rev',
    type: 'string',
    length: 50,
    nullable: true,
  })
  rev?: string;

  @Property({
    fieldName: 'mslID',
    type: 'int',
    nullable: true,
  })
  mslID?: number;

  @Property({
    fieldName: 'costCategoryID',
    type: 'int',
    nullable: true,
  })
  costCategoryID?: number;

  @Property({
    fieldName: 'nickName',
    type: 'string',
    length: 50,
    nullable: true,
  })
  nickName?: string;

  @Property({
    fieldName: 'rfqOnly',
    type: 'boolean',
    default: false,
  })
  rfqOnly = false;

  @Property({
    fieldName: 'assyCode',
    type: 'string',
    length: 20,
    nullable: true,
  })
  assyCode?: string;

  @Property({
    fieldName: 'pcbPerArray',
    type: 'int',
    nullable: true,
  })
  pcbPerArray?: number;

  @Property({
    fieldName: 'isCPN',
    type: 'boolean',
    default: false,
  })
  isCPN = false;

  @Property({
    fieldName: 'custAssyPN',
    type: 'string',
    length: 100,
    nullable: true,
  })
  custAssyPN?: string;

  @Property({
    fieldName: 'partType',
    type: 'int',
    nullable: false,
  })
  partType!: number;

  @Property({
    fieldName: 'refSupplierMfgpnComponentID',
    type: 'int',
    nullable: true,
  })
  refSupplierMfgpnComponentID?: number;

  @Property({
    fieldName: 'packagingID',
    type: 'int',
    nullable: true,
  })
  packagingID?: number;

  @Property({
    fieldName: 'unit',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: false,
  })
  unit!: string;

  @Property({
    fieldName: 'epicorType',
    type: 'string',
    length: 30,
    nullable: false,
  })
  epicorType!: string;

  @Property({
    fieldName: 'price',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  price?: string;

  @Property({
    fieldName: 'uomClassID',
    type: 'int',
    nullable: true,
  })
  uomClassID?: number;

  @Property({
    fieldName: 'rohsDeviation',
    type: 'int',
    nullable: true,
  })
  rohsDeviation?: number;

  @Property({
    fieldName: 'reversalDate',
    type: 'date',
    nullable: true,
  })
  reversalDate?: Date;

  @Property({
    fieldName: 'serialNumber',
    type: 'string',
    length: 20,
    nullable: false,
  })
  serialNumber!: string;

  @Property({
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

  @Property({
    fieldName: 'purchasingComment',
    type: 'text',
    nullable: true,
  })
  purchasingComment?: string;

  @Property({
    fieldName: 'isReversal',
    type: 'boolean',
    default: false,
  })
  isReversal = false;

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
    fieldName: 'predictedObsolescenceYear',
    type: 'int',
    nullable: true,
  })
  predictedObsolescenceYear?: number;

  @Property({
    fieldName: 'detailDescription',
    type: 'text',
    nullable: true,
  })
  detailDescription?: string;

  @Property({
    fieldName: 'documentPath',
    type: 'string',
    length: 300,
    nullable: true,
  })
  documentPath?: string;

  @Property({
    fieldName: 'obsoleteDate',
    type: 'date',
    nullable: true,
  })
  obsoleteDate?: Date;

  @Property({
    fieldName: 'assemblyType',
    type: 'int',
    nullable: true,
  })
  assemblyType?: number;

  @Property({
    fieldName: 'refMfgPNMfgCodeId',
    type: 'int',
    nullable: true,
  })
  refMfgPNMfgCodeId?: number;

  @Property({
    fieldName: 'productionPN',
    type: 'string',
    length: 100,
    nullable: true,
  })
  productionPN?: string;

  @Property({
    fieldName: 'isWaterSoluble',
    type: 'boolean',
    default: false,
  })
  isWaterSoluble = false;

  @Property({
    fieldName: 'isNoClean',
    type: 'boolean',
    default: false,
  })
  isNoClean = false;

  @Property({
    fieldName: 'mfrNameText',
    type: 'string',
    length: 200,
    nullable: true,
  })
  mfrNameText?: string;

  @Property({
    fieldName: 'isFluxNotApplicable',
    type: 'boolean',
    default: false,
  })
  isFluxNotApplicable = false;

  @Property({
    fieldName: 'isHazmatMaterial',
    type: 'boolean',
    default: false,
  })
  isHazmatMaterial = false;

  @Property({
    fieldName: 'rfqNumber',
    type: 'string',
    length: 50,
    nullable: true,
  })
  rfqNumber?: string;

  @Property({
    fieldName: 'salesacctId',
    type: 'int',
    nullable: true,
  })
  salesacctId?: number;

  @Property({
    fieldName: 'purchaseacctId',
    type: 'int',
    nullable: true,
  })
  purchaseacctId?: number;

  @Property({
    fieldName: 'umidSPQ',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  umidSPQ?: string;

  @Property({
    fieldName: 'internalReference',
    type: 'string',
    length: 50,
    nullable: true,
  })
  internalReference?: string;

  @Property({
    fieldName: 'unqDate',
    type: 'datetime',
    nullable: false,
    default: '2001-01-01 00:00:00',
  })
  unqDate!: Date;

  @Property({
    fieldName: 'quoteValidTillDate',
    type: 'date',
    nullable: true,
  })
  quoteValidTillDate?: Date;

  @Property({
    fieldName: 'mfgType',
    type: 'string',
    length: 5,
    nullable: false,
  })
  mfgType!: string;

  @Property({
    fieldName: 'pictureAcceptanceStatus',
    type: 'string',
    length: 2,
    nullable: true,
    comment: 'NT - Not Taken, AP - Acceptable, RP - Retake Picture',
  })
  pictureAcceptanceStatus?: string;

  @Property({
    fieldName: 'ActionBy',
    type: 'int',
    nullable: false,
  })
  ActionBy!: number;

  @Property({
    fieldName: 'engPartNo',
    type: 'string',
    length: 100,
    nullable: true,
  })
  engPartNo?: string;

  @Property({
    fieldName: 'engPartRev',
    type: 'string',
    length: 15,
    nullable: true,
  })
  engPartRev?: string;

  @Property({
    fieldName: 'bomNumber',
    type: 'string',
    length: 100,
    nullable: true,
  })
  bomNumber?: string;

  @Property({
    fieldName: 'bomRev',
    type: 'string',
    length: 15,
    nullable: true,
  })
  bomRev?: string;

  @Property({
    fieldName: 'bomNotRequired',
    type: 'boolean',
    default: true,
  })
  bomNotRequired = true;

  @Property({
    fieldName: 'linkComponentID',
    type: 'int',
    nullable: true,
  })
  linkComponentID?: number;

  @Property({
    fieldName: 'linkComponentIDReason',
    type: 'string',
    length: 3000,
    nullable: true,
  })
  linkComponentIDReason?: string;

  @Property({
    fieldName: 'fluxTypeReason',
    type: 'string',
    length: 3000,
    nullable: true,
  })
  fluxTypeReason?: string;

  @Property({
    fieldName: 'isNonInventoryItem',
    type: 'boolean',
    default: false,
  })
  isNonInventoryItem = false;

  @Property({
    fieldName: 'isDoNotCreateUmid',
    type: 'boolean',
    default: false,
  })
  isDoNotCreateUmid = false;

  @Property({
    fieldName: 'isDoNotIssueCofc',
    type: 'boolean',
    default: false,
  })
  isDoNotIssueCofc = false;

  @Property({
    fieldName: 'isNonKittingItem',
    type: 'boolean',
    default: false,
  })
  isNonKittingItem = false;

  @Property({
    fieldName: 'numberOfIdenticalUMIDLabelsToPrint',
    type: 'int',
    nullable: false,
    default: 1,
  })
  numberOfIdenticalUMIDLabelsToPrint = 1;

  // Relationships
  @ManyToOne('MfgCodeMasterEntity', { nullable: false })
  mfgCode?: any;

  @ManyToOne('UomEntity', { nullable: false })
  uomEntity?: any;

  @ManyToOne('ComponentEntity', { nullable: true })
  replacementPart?: any;

  @OneToMany('ComponentAttributesEntity', 'component')
  attributes = new Collection<any>(this);

  @OneToMany('ComponentSettingsEntity', 'component')
  settings = new Collection<any>(this);
}