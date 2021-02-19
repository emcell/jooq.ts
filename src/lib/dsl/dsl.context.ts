import { Table, TableLike, TableWithFields } from '../table';
import {
  FieldOrValueMap,
  FieldsForType,
  MapTableFieldsToValue,
  Subset,
  TableFields,
} from '../types';
import { DeleteStep } from './delete';
import { Fetchable } from './fetchable';
import { Field } from './field';
import { InsertStep } from './insert';
import { SelectFromStep, SelectStep } from './select';
import { UpdateStep } from './update';

export interface DSLContext {
  select<T, F extends Field<T>>(
    _field: F,
  ): SelectStep<F extends Field<infer U> ? U : never>;
  select<T extends TableFields>(
    _fields: T,
  ): SelectStep<MapTableFieldsToValue<T>>;

  selectFrom(table: TableLike): SelectFromStep<any>;
  selectFrom<T>(table: TableWithFields<T>): SelectFromStep<T>;

  // I've removed that one because I don't know how to differenciate
  // between Fetchable<T> and T since Fetchable isn't a class
  // insertInto<T>(table: Table, object: T): InsertStep<T>;
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

  update<T>(
    table: TableLike,
    fields: FieldsForType<T>,
    values: FieldOrValueMap<T>,
  ): UpdateStep<T>;

  update<T, K extends keyof T>(
    tableDefinition: TableWithFields<T>,
    values: FieldOrValueMap<Subset<T, K>>,
  ): UpdateStep<Subset<T, K>>;

  delete(table: TableLike): DeleteStep;
  end(): Promise<void>;
}
