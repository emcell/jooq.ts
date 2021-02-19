import { Except } from 'type-fest';
import {
  Condition,
  ConditionAnd,
  ConditionOr,
  objectToConditions,
} from '../condition';
import { makeTableDefinition, Table, TableWithFields } from '../table';
import { FieldsForType, TableFields } from '../types';
import { DSLContext } from './dsl.context';
import { Field, FieldExcluded, FieldRaw, FieldTable } from './field';
import { Converter } from './field-tools';
import {
  DslContextPostgres,
  PostgresConfig,
} from './postgres/dsl.context.postgres';

export type DbTypes =
  | number
  | string
  | Date
  | boolean
  //| unknown // json fields are serialized that way
  | (number | undefined)
  | (string | undefined)
  | (Date | undefined)
  | (boolean | undefined);
//| (unknown | undefined);

interface DSLContextConfig<Type extends 'postgres'> {
  type: Type;
  config: PostgresConfig;
}

// noinspection JSUnusedGlobalSymbols
export class DSL {
  static context<TConfig extends 'postgres'>(
    config: DSLContextConfig<TConfig>,
  ): DSLContext {
    if (config.type === 'postgres') {
      return new DslContextPostgres(config.config);
    } else throw new Error('not implemented');
  }

  static count(): Field<number> {
    return new FieldRaw('count(*)');
  }

  static or(_conditions: Condition[]): Condition;
  static or<T>(object: T, operator?: string): Condition;
  static or<T>(
    objectOrConditions: T | Condition[],
    operator?: string,
  ): Condition {
    if (!Array.isArray(objectOrConditions)) {
      objectOrConditions = objectToConditions(
        objectOrConditions,
        operator || '=',
      );
    }
    return new ConditionOr(objectOrConditions);
  }

  static and(_conditions: Condition[]): Condition;
  static and<T>(object: T, operator?: string): Condition;
  static and<T>(
    objectOrConditions: T | Condition[],
    operator?: string,
  ): Condition {
    if (!Array.isArray(objectOrConditions)) {
      objectOrConditions = objectToConditions(
        objectOrConditions,
        operator || '=',
      );
    }
    return new ConditionAnd(objectOrConditions);
  }

  static field<T, DbType extends DbTypes = T extends DbTypes ? T : DbTypes>(
    field: string,
    converter?: Converter<DbType, T>,
  ): Field<T, DbType> {
    return new FieldRaw<T, DbType>(field, converter);
  }

  static random(): Field<number> {
    return new FieldRaw<number>('random()');
  }

  static tableDefinition<T, F extends TableFields = FieldsForType<T>>(
    table: Table<T>,
    fields: (table: Table<T>, fields: (fields: F) => F) => F,
  ): TableWithFields<T, F> {
    return makeTableDefinition(table, fields);
  }

  static tableField<
    TableType,
    FieldType,
    DbType extends DbTypes = FieldType extends DbTypes ? FieldType : DbTypes
  >(
    table: Table,
    field: keyof TableType,
    converter?: Converter<DbType, FieldType>,
  ): Field<FieldType, DbType> {
    return new FieldTable<FieldType, DbType>(table, `${field}`, converter);
  }

  static withoutFields<T, Keys extends keyof T>(
    tableDefinition: TableWithFields<T>,
    ...keys: Array<Keys>
  ): TableWithFields<Except<T, Keys>> {
    const copy = { ...tableDefinition, fields: { ...tableDefinition.fields } };
    for (const key of keys) {
      delete copy[key];
      delete copy.fields[key];
    }

    return (copy as unknown) as TableWithFields<Except<T, Keys>>;
  }

  static excluded<T>(fieldName?: string): Field<T> {
    if (fieldName !== undefined) {
      return new FieldTable(new Table('excluded'), fieldName);
    }
    return new FieldExcluded();
  }
}
