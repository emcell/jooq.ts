import { DbTypes } from './dsl/dsl';
import { Fetchable } from './dsl/fetchable';
import { Field, FieldTable } from './dsl/field';
import { Converter } from './dsl/field-tools';
import { ToSql } from './helpers';
import { FieldsForType, TableFields } from './types';
import { IdentifierOptions, identifierToSql } from './utils';

export interface TableOptions extends IdentifierOptions {}

export abstract class TableLike implements ToSql {
  abstract toSql(options?: TableOptions): string;
}

export class Table<T = any> extends TableLike {
  constructor(protected table: string) {
    super();
  }

  toSql(options?: TableOptions): string {
    return identifierToSql(this.table, options);
  }

  field<
    K extends keyof T = keyof T,
    DbType extends DbTypes = T[K] extends DbTypes ? T[K] : never
  >(
    field: K,
    ...converter: T[K] extends DbTypes
      ? [Converter<DbType, T[K]>] | []
      : [Converter<DbType, T[K]>]
  ): Field<T[K], DbType> {
    return new FieldTable<T[K], DbType>(this, field as string, converter[0]);
  }
}

export class TableRaw<T = any> extends Table<T> {
  constructor(table: string) {
    super(table);
  }

  toSql(): string {
    return this.table;
  }
}

export class TableAliased extends TableLike {
  constructor(
    private alias: string,
    private tableSource: Fetchable<any> | string,
  ) {
    super();
  }
  toSql(options?: TableOptions): string {
    if (typeof this.tableSource === 'string') {
      return `(${this.tableSource}) as ${identifierToSql(this.alias)}`;
    } else {
      return `(${this.tableSource.toSql(options)}) as ${identifierToSql(
        this.alias,
      )}`;
    }
  }
}

export type TableWithFields<T, F extends TableFields = FieldsForType<T>> = {
  table: TableLike;
  fields: F;
} & F;

export function makeTableDefinition<
  T,
  F extends TableFields = FieldsForType<T>
>(
  table: Table,
  fields: (table: Table, fields: (fields: F) => F) => F,
): TableWithFields<T, F> {
  const _fields = fields(table, (fields) => fields);
  return {
    ..._fields,
    table,
    fields: _fields,
  };
}
