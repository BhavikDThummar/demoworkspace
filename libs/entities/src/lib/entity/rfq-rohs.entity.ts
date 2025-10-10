import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';

/**
 * RFQ RoHS Entity
 * Represents RoHS (Restriction of Hazardous Substances) status information
 */
@Entity({ tableName: 'rfq_rohsmst' })
export class RfqRohsEntity {
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
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

  @Property({
    fieldName: 'rohsIcon',
    type: 'string',
    length: 255,
    nullable: true,
  })
  rohsIcon?: string;

  @Property({
    fieldName: 'refMainCategoryID',
    type: 'int',
    nullable: true,
  })
  refMainCategoryID?: number;

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
    fieldName: 'refParentID',
    type: 'int',
    nullable: true,
  })
  refParentID?: number;

  @Property({
    fieldName: 'sourceName',
    type: 'string',
    length: 50,
    nullable: true,
  })
  sourceName?: string;

  @Property({
    fieldName: 'unqDate',
    type: 'datetime',
    nullable: false,
    default: '2001-01-01 00:00:00',
  })
  unqDate!: Date;

  // Relationships
  @ManyToOne('RfqRohsMainCategoryEntity', { nullable: true })
  mainCategory?: any;

  @ManyToOne('RfqRohsEntity', { nullable: true })
  parent?: any;

  @OneToMany('RfqRohsEntity', 'parent')
  children = new Collection<any>(this);
}