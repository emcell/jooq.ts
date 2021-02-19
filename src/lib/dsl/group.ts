import { IdentifierOptions } from '../utils';
import { Field } from './field';
import { LimitStep } from './limit';
import { OrderStep } from './order';

export interface GroupByStep<T> extends OrderStep<T>, LimitStep<T> {
  groupBy(field: Field<any>): GroupByStep<T>;
  groupBy(fields: Field<any>[]): GroupByStep<T>;
  groupBy(...fields: Field<any>[]): GroupByStep<T>;
}

export function groupFieldsToString(
  fields: Field<any>[],
  options?: IdentifierOptions,
): string {
  return fields.map((field) => field.getName(options)).join(',');
}
