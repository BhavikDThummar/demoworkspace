import { Entity, Property, PrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity({ collection: 'test_documents' })
export class TestDocumentEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @Property({ type: 'string' })
  name!: string;

  @Property({ type: 'number', nullable: true })
  value?: number;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
