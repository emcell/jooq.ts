import { ToSql } from './helpers';
import { IdentifierOptions, identifierToSql } from './utils';
import { FieldsForType } from './types';
import { Field, FieldTable } from './field/field';
import { DbTypes } from './dsl/dsl';
import { Converter } from './field/field-tools';

export interface TableOptions extends IdentifierOptions {}

export class Table<T = any> implements ToSql {
  constructor(private table: string) {}

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

export type TableWithFields<T, F = FieldsForType<T>> = {
  table: Table;
  fields: F;
} & F;

export function makeTableDefinition<T, F = FieldsForType<T>>(
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
