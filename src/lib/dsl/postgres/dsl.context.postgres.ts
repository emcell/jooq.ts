import { Pool, PoolConfig } from 'pg';
import { Table, TableLike, TableWithFields } from '../../table';
import {
  FieldOrValueMap,
  FieldsForType,
  MapTableFieldsToValue,
  TableFields,
} from '../../types';
import { IdentifierOptions } from '../../utils';
import { DeleteStep } from '../delete';
import { DSLContext } from '../dsl.context';
import { Fetchable } from '../fetchable';
import { Field } from '../field';
import { InsertStep } from '../insert';
import { SelectFromStep, SelectStep } from '../select';
import { UpdateStep } from '../update';
import {
  createDeleteContext,
  DeleteStepImpl,
} from './dsl.context.postgres.delete';
import {
  createInsertContext,
  InsertStepImpl,
} from './dsl.context.postgres.insert';
import {
  SelectFromStepImpl,
  SelectStepImpl,
} from './dsl.context.postgres.select';
import {
  createUpdateContext,
  UpdateStepImpl,
} from './dsl.context.postgres.update';

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
  public postgresContext: PostgresContext;
  constructor(config: PostgresConfig) {
    this.options = {
      wrapIdentifier: '"',
    };
    this.runtime = {
      config,
      pool: new Pool(config),
    };
    this.postgresContext = {
      runtime: this.runtime,
      options: this.options,
    };
  }
  insertInto<T>(
    table: Table,
    fields: FieldsForType<T>,
    objects: T[],
  ): InsertStep<T>;
  insertInto<T>(
    table: Table,
    fields: FieldsForType<T>,
    query: Fetchable<T>,
  ): InsertStep<T>;
  insertInto<T>(table: TableWithFields<T>, values: T[]): InsertStep<T>;
  insertInto<T>(table: TableWithFields<T>, query: Fetchable<T>): InsertStep<T>;

  insertInto<T>(
    table: Table | TableWithFields<T>,
    valuesOrFields: T[] | Fetchable<T> | FieldsForType<T>,
    values?: T[] | Fetchable<T>,
  ): InsertStep<T> {
    if (table instanceof Table) {
      if (!values) {
        throw new Error('Not possible by type definitions');
      }
      return InsertStepImpl(
        createInsertContext(
          table,
          valuesOrFields as FieldsForType<T>,
          values,
          this.postgresContext,
        ),
      );
    } else {
      return InsertStepImpl(
        createInsertContext(
          table.table,
          table.fields,
          valuesOrFields as T[] | Fetchable<T>,
          this.postgresContext,
        ),
      );
    }
    return {} as any;
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
    table: TableLike,
    fields: FieldsForType<T>,
    values: FieldOrValueMap<T>,
  ): UpdateStep<T>;
  update<T, U extends { [P in keyof T]: T[P] }>(
    tableDefinition: TableWithFields<T>,
    values: FieldOrValueMap<U>,
  ): UpdateStep<U>;

  update<
    T,
    TableType extends TableLike | TableWithFields<T>,
    U extends { [P in keyof T]: T[P] }
  >(
    table: TableType,
    fieldsOrValues: FieldsForType<T> | FieldOrValueMap<U>,
    values?: FieldOrValueMap<T>,
  ): TableType extends TableLike ? UpdateStep<T> : UpdateStep<U> {
    if (table instanceof TableLike) {
      return UpdateStepImpl<T>(
        createUpdateContext(
          table,
          fieldsOrValues as FieldsForType<T>,
          values as FieldOrValueMap<T>,
          this.postgresContext,
        ),
      ) as any;
    } else {
      const fields: any = {};
      const t: TableWithFields<T> = table as TableWithFields<T>;
      Object.keys(fieldsOrValues).forEach((key) => {
        if ((t.fields as any)[key]) fields[key] = (t.fields as any)[key];
      });
      return UpdateStepImpl<U>(
        createUpdateContext(
          t.table,
          fields,
          fieldsOrValues as FieldOrValueMap<U>,
          this.postgresContext,
        ),
      ) as any;
    }
  }

  delete(table: TableLike): DeleteStep {
    return DeleteStepImpl(createDeleteContext(table, this.postgresContext));
  }

  async end(): Promise<void> {
    await this.runtime.pool.end();
  }

  async executeRaw(sql: string): Promise<any> {
    return await this.runtime.pool.query(sql);
  }
}
