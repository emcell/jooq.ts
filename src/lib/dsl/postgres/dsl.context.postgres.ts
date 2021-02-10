import { DSLContext } from '../dsl.context';
import { Table, TableWithFields } from '../../table';
import { InsertStep } from '../insert';
import { Fetchable } from '../fetchable';
import { Field } from '../../field/field';
import { SelectFromStep, SelectStep } from '../select';
import {
  MapTableFieldsToValue,
  MapValueToFieldOrValue,
  TableFields,
} from '../../types';
import { UpdateStep } from '../update';
import { IdentifierOptions } from '../../utils';
import { Pool, PoolConfig } from 'pg';
import {
  SelectFromStepImpl,
  SelectStepImpl,
} from './dsl.context.postgres.select';
import {
  createInsertContext,
  InsertStepImpl,
} from './dsl.context.postgres.insert';

export interface PostgresConfig extends PoolConfig {}

export interface PostgresRuntime {
  config: PostgresConfig;
  pool: Pool;
}

export interface PostgresContext {
  options?: IdentifierOptions;
  runtime: PostgresRuntime;
}

export class DslContextPostgres implements DSLContext {
  public options: IdentifierOptions;
  public runtime: PostgresRuntime;
  constructor(config: PostgresConfig) {
    this.options = {
      wrapIdentifier: '"',
    };
    this.runtime = {
      config,
      pool: new Pool(config),
    };
  }
  insertInto<T>(table: Table, objects: T[]): InsertStep<T>;
  insertInto<T>(table: Table, query: Fetchable<T>): InsertStep<T>;
  insertInto<T>(table: Table, values: T[] | Fetchable<T>): InsertStep<T> {
    return InsertStepImpl(createInsertContext(table, values));
  }

  select<T, F extends Field<T>>(
    _field: F,
  ): SelectStep<F extends Field<infer U> ? U : never>;
  select<T extends TableFields>(
    _fields: T,
  ): SelectStep<MapTableFieldsToValue<T>>;
  select<T, F extends Field<T>>(
    field: F | T,
  ): T extends TableFields
    ? SelectStep<MapTableFieldsToValue<T>>
    : SelectStep<F extends Field<infer U> ? U : never> {
    return SelectStepImpl({
      options: this.options,
      runtime: this.runtime,
      fields:
        field instanceof Field ? field : ((field as unknown) as TableFields),
      joinTables: [],
      groupFields: [],
      orderFields: [],
      conditions: [],
    }) as any;
  }

  selectFrom(table: Table): SelectFromStep<any>;
  selectFrom<T>(table: TableWithFields<T>): SelectFromStep<T>;
  selectFrom<T, ParaMeterType = TableWithFields<T> | Table>(
    table: ParaMeterType,
  ): ParaMeterType extends TableWithFields<T>
    ? SelectFromStep<T>
    : SelectFromStep<any> {
    if (table instanceof Table) {
      return SelectFromStepImpl<any>({
        options: this.options,
        runtime: this.runtime,
        fields: {},
        table,
        joinTables: [],
        groupFields: [],
        orderFields: [],
        conditions: [],
      }) as any;
    } else {
      const tableHelper: TableWithFields<T> = table as any;
      return SelectFromStepImpl<T>({
        options: this.options,
        runtime: this.runtime,
        fields: tableHelper.fields,
        table: tableHelper.table,
        joinTables: [],
        groupFields: [],
        orderFields: [],
        conditions: [],
      }) as any;
    }
  }

  update<T>(
    _table: Table,
    _object: Partial<MapValueToFieldOrValue<T>>,
  ): UpdateStep<T> {
    return {} as UpdateStep<T>;
  }
}
