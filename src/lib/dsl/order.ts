import { LimitStep } from './limit';
import { Field } from '../field/field';
import { IdentifierOptions } from '../utils';

export type SortDirection = 'asc' | 'desc';
export interface OrderField<T> {
  field: Field<T>;
  direction?: SortDirection;
}

export interface OrderStep<T> extends LimitStep<T> {
  orderBy(field: Field<any>, direction?: 'asc' | 'desc'): OrderStep<T>;
  orderBy(fields: Field<any>[]): OrderStep<T>;
  orderBy(fields: OrderField<any>[]): OrderStep<T>;
}

export function orderFieldToString(
  field: OrderField<any>,
  options?: IdentifierOptions,
) {
  if (field.direction) {
    return `${field.field.getName(options)} ${field.direction}`;
  }
  return field.field.getName(options);
}

export function orderFieldsToString(
  fields: OrderField<any>[],
  options?: IdentifierOptions,
) {
  return fields.map((field) => orderFieldToString(field, options)).join(', ');
}
