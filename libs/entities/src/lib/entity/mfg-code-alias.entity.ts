import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

/**
 * Manufacturing Code Alias Entity
 * Represents aliases for manufacturing codes
 */
@Entity({ tableName: 'mfgcodealias' })
export class MfgCodeAliasEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @ManyToOne('MfgCodeMasterEntity', { nullable: true })
  mfgCodeMaster?: any;

  @Property({
    fieldName: 'alias',
    type: 'string',
    length: 255,
    nullable: true,
  })
  alias?: string;

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
    fieldName: 'systemGenerated',
    type: 'boolean',
    default: false,
  })
  systemGenerated = false;

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
    nullable: true,
    default: '2001-01-01 00:00:00',
  })
  unqDate?: Date;

  @Property({
    fieldName: 'mfgType',
    type: 'string',
    length: 5,
    nullable: false,
  })
  mfgType!: string;
}
