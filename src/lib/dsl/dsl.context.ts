import { Field } from '../field/field';
import {
  MapTableFieldsToValue,
  MapValueToFieldOrValue,
  TableFields,
} from '../types';
import { Table, TableWithFields } from '../table';
import { Fetchable } from './fetchable';
import { SelectFromStep, SelectStep } from './select';
import { InsertStep } from './insert';
import { UpdateStep } from './update';

export interface DSLContext {
  select<T, F extends Field<T>>(
    _field: F,
  ): SelectStep<F extends Field<infer U> ? U : never>;
  select<T extends TableFields>(
    _fields: T,
  ): SelectStep<MapTableFieldsToValue<T>>;

  selectFrom(table: Table): SelectFromStep<any>;
  selectFrom<T>(table: TableWithFields<T>): SelectFromStep<T>;

  // I've removed that one because I don't know how to differenciate
  // between Fetchable<T> and T since Fetchable isn't a class
  // insertInto<T>(table: Table, object: T): InsertStep<T>;
  insertInto<T>(table: Table, objects: T[]): InsertStep<T>;
  insertInto<T>(table: Table, query: Fetchable<T>): InsertStep<T>;

  update<T>(
    table: Table,
    object: Partial<MapValueToFieldOrValue<T>>,
  ): UpdateStep<T>;
}
