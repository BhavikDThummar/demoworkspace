import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import type { MfgCodeAliasEntity } from './mfg-code-alias.entity';

/**
 * Manufacturing Code Master Entity
 * Represents manufacturing codes and supplier information
 */
@Entity({ tableName: 'mfgcodemst' })
export class MfgCodeMasterEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    fieldName: 'mfgCode',
    type: 'string',
    length: 255,
    nullable: false,
  })
  mfgCode!: string;

  @Property({
    fieldName: 'isDeleted',
    type: 'boolean',
    default: false,
  })
  isDeleted = false;

  @Property({
    fieldName: 'createdAt',
    type: 'datetime',
    nullable: false,
  })
  createdAt!: Date;

  @Property({
    fieldName: 'createdBy',
    type: 'string',
    length: 255,
    nullable: false,
  })
  createdBy!: string;

  @Property({
    fieldName: 'updatedAt',
    type: 'datetime',
    nullable: false,
  })
  updatedAt!: Date;

  @Property({
    fieldName: 'updatedBy',
    type: 'string',
    length: 255,
    nullable: false,
  })
  updatedBy!: string;

  @Property({
    fieldName: 'deletedAt',
    type: 'datetime',
    nullable: true,
  })
  deletedAt?: Date;

  @Property({
    fieldName: 'deletedBy',
    type: 'string',
    length: 255,
    nullable: true,
  })
  deletedBy?: string;

  @Property({
    fieldName: 'mfgType',
    type: 'string',
    length: 5,
    nullable: false,
  })
  mfgType!: string;

  @Property({
    fieldName: 'mfgName',
    type: 'string',
    length: 255,
    nullable: true,
  })
  mfgName?: string;

  @Property({
    fieldName: 'customerID',
    type: 'int',
    nullable: true,
  })
  customerID?: number;

  @Property({
    fieldName: 'dateCodeFormatID',
    type: 'int',
    nullable: true,
  })
  dateCodeFormatID?: number;

  @Property({
    fieldName: 'isPricingApi',
    type: 'boolean',
    default: false,
  })
  isPricingApi = false;

  @Property({
    fieldName: 'primaryContactName',
    type: 'string',
    length: 255,
    nullable: true,
  })
  primaryContactName?: string;

  @Property({
    fieldName: 'email',
    type: 'string',
    length: 255,
    nullable: true,
  })
  email?: string;

  @Property({
    fieldName: 'website',
    type: 'string',
    length: 255,
    nullable: true,
  })
  website?: string;

  @Property({
    fieldName: 'contact',
    type: 'string',
    length: 255,
    nullable: true,
  })
  contact?: string;

  @Property({
    fieldName: 'comments',
    type: 'text',
    nullable: true,
  })
  comments?: string;

  @Property({
    fieldName: 'phExtension',
    type: 'string',
    length: 8,
    nullable: true,
  })
  phExtension?: string;

  @Property({
    fieldName: 'contactCountryCode',
    type: 'string',
    length: 5,
    nullable: true,
  })
  contactCountryCode?: string;

  @Property({
    fieldName: 'faxNumber',
    type: 'string',
    length: 255,
    nullable: true,
  })
  faxNumber?: string;

  @Property({
    fieldName: 'faxCountryCode',
    type: 'string',
    length: 5,
    nullable: true,
  })
  faxCountryCode?: string;

  @Property({
    fieldName: 'isActive',
    type: 'boolean',
    default: true,
  })
  isActive = true;

  @Property({
    fieldName: 'isCustOrDisty',
    type: 'boolean',
    default: false,
  })
  isCustOrDisty = false;

  @Property({
    fieldName: 'custTermsID',
    type: 'int',
    nullable: true,
  })
  custTermsID?: number;

  @Property({
    fieldName: 'acquisitionDetail',
    type: 'text',
    nullable: true,
  })
  acquisitionDetail?: string;

  @Property({
    fieldName: 'paymentTermsID',
    type: 'int',
    nullable: true,
  })
  paymentTermsID?: number;

  @Property({
    fieldName: 'territory',
    type: 'string',
    length: 255,
    nullable: true,
  })
  territory?: string;

  @Property({
    fieldName: 'shippingMethodID',
    type: 'int',
    nullable: true,
  })
  shippingMethodID?: number;

  @Property({
    fieldName: 'isCompany',
    type: 'boolean',
    default: false,
  })
  isCompany = false;

  @Property({
    fieldName: 'scanDocumentSide',
    type: 'string',
    length: 2,
    nullable: true,
  })
  scanDocumentSide?: string;

  @Property({
    fieldName: 'authorizeType',
    type: 'int',
    nullable: true,
  })
  authorizeType?: number;

  @Property({
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

  @Property({
    fieldName: 'isOrderQtyRequiredInPackingSlip',
    type: 'boolean',
    default: false,
  })
  isOrderQtyRequiredInPackingSlip = false;

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
    fieldName: 'customerType',
    type: 'string',
    length: 2,
    nullable: true,
  })
  customerType?: string;

  @Property({
    fieldName: 'displayOrder',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  displayOrder?: string;

  @Property({
    fieldName: 'salesCommissionTo',
    type: 'int',
    nullable: true,
  })
  salesCommissionTo?: number;

  @Property({
    fieldName: 'freeOnBoardId',
    type: 'int',
    nullable: true,
  })
  freeOnBoardId?: number;

  @Property({
    fieldName: 'supplierMFRMappingType',
    type: 'string',
    length: 2,
    nullable: true,
  })
  supplierMFRMappingType?: string;

  @Property({
    fieldName: 'taxID',
    type: 'string',
    length: 20,
    nullable: true,
  })
  taxID?: string;

  @Property({
    fieldName: 'accountRef',
    type: 'string',
    length: 100,
    nullable: true,
  })
  accountRef?: string;

  @Property({
    fieldName: 'paymentMethodID',
    type: 'int',
    nullable: true,
  })
  paymentMethodID?: number;

  @Property({
    fieldName: 'bankID',
    type: 'int',
    nullable: true,
  })
  bankID?: number;

  @Property({
    fieldName: 'carrierID',
    type: 'int',
    nullable: true,
  })
  carrierID?: number;

  @Property({
    fieldName: 'rmaCarrierID',
    type: 'int',
    nullable: true,
  })
  rmaCarrierID?: number;

  @Property({
    fieldName: 'rmashippingMethodId',
    type: 'int',
    nullable: true,
  })
  rmashippingMethodId?: number;

  @Property({
    fieldName: 'carrierAccount',
    type: 'string',
    length: 50,
    nullable: true,
  })
  carrierAccount?: string;

  @Property({
    fieldName: 'rmaCarrierAccount',
    type: 'string',
    length: 50,
    nullable: true,
  })
  rmaCarrierAccount?: string;

  @Property({
    fieldName: 'shippingInsurenc',
    type: 'boolean',
    default: false,
  })
  shippingInsurenc = false;

  @Property({
    fieldName: 'rmaShippingInsurenc',
    type: 'boolean',
    default: false,
  })
  rmaShippingInsurenc = false;

  @Property({
    fieldName: 'poComment',
    type: 'text',
    nullable: true,
  })
  poComment?: string;

  @Property({
    fieldName: 'documentPath',
    type: 'string',
    length: 500,
    nullable: true,
  })
  documentPath?: string;

  @Property({
    fieldName: 'systemID',
    type: 'string',
    length: 30,
    nullable: true,
  })
  systemID?: string;

  @Property({
    fieldName: 'customerSystemID',
    type: 'string',
    length: 30,
    nullable: true,
  })
  customerSystemID?: string;

  @Property({
    fieldName: 'invoicesRequireManagementApproval',
    type: 'boolean',
    default: false,
  })
  invoicesRequireManagementApproval = false;

  @Property({
    fieldName: 'acctId',
    type: 'int',
    nullable: true,
  })
  acctId?: number;

  @Property({
    fieldName: 'unqDate',
    type: 'datetime',
    nullable: false,
    default: '2001-01-01 00:00:00',
  })
  unqDate!: Date;

  @Property({
    fieldName: 'isSupplierEnable',
    type: 'boolean',
    default: true,
  })
  isSupplierEnable = true;

  @Property({
    fieldName: 'externalSupplierOrder',
    type: 'decimal',
    precision: 10,
    scale: 5,
    nullable: true,
  })
  externalSupplierOrder?: string;

  @Property({
    fieldName: 'legalName',
    type: 'string',
    length: 255,
    nullable: true,
  })
  legalName?: string;

  @Property({
    fieldName: 'rmaPackingslipRequireManagementApproval',
    type: 'boolean',
    default: false,
  })
  rmaPackingslipRequireManagementApproval = false;

  @Property({
    fieldName: 'invNumSameAsPSNum',
    type: 'boolean',
    default: false,
  })
  invNumSameAsPSNum = false;

  @Property({
    fieldName: 'onPurchaseHold',
    type: 'boolean',
    default: false,
  })
  onPurchaseHold = false;

  @Property({
    fieldName: 'onMaterialReceiptHold',
    type: 'boolean',
    default: false,
  })
  onMaterialReceiptHold = false;

  @Property({
    fieldName: 'customerSince',
    type: 'date',
    nullable: true,
  })
  customerSince?: Date;

  @Property({
    fieldName: 'supplierBankRoutingNumber',
    type: 'string',
    length: 100,
    nullable: true,
  })
  supplierBankRoutingNumber?: string;

  @Property({
    fieldName: 'supplierAccountNumber',
    type: 'string',
    length: 100,
    nullable: true,
  })
  supplierAccountNumber?: string;

  @Property({
    fieldName: 'supplierBankName',
    type: 'string',
    length: 255,
    nullable: true,
  })
  supplierBankName?: string;

  @Property({
    fieldName: 'achPayeeName',
    type: 'string',
    length: 255,
    nullable: true,
  })
  achPayeeName?: string;

  // Relationships
  @OneToMany('MfgCodeAliasEntity', 'mfgCodeMaster')
  aliases = new Collection<MfgCodeAliasEntity>(this);
}