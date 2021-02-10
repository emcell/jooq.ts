import { Fetchable } from './fetchable';
import { MapTableFieldsToValue, TableFields } from '../types';
import { Field } from '../field/field';

export interface ReturningStep {
  returning<NewType>(): Fetchable<NewType>;
  returning<F extends TableFields>(
    _fields: F,
  ): Fetchable<MapTableFieldsToValue<F>>;
  returning<F>(_field: Field<F>): Fetchable<F>;
}
