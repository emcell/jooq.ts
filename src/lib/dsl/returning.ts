import { MapTableFieldsToValue, TableFields } from '../types';
import { Fetchable } from './fetchable';
import { Field } from './field';

export interface ReturningStepUnknownFields {
  returning<F extends TableFields>(
    _fields: F,
  ): Fetchable<MapTableFieldsToValue<F>>;
  returning<F>(_field: Field<F>): Fetchable<F>;
}

export interface ReturningStep<T> {
  returning<F extends TableFields>(
    _fields: F,
  ): Fetchable<MapTableFieldsToValue<F>>;
  returning<F>(_field: Field<F>): Fetchable<F>;
  returning(): Fetchable<T>;
}

export interface ContextWithReturning {
  returning?: TableFields | Field<any>;
}

export function AbstractReturningStepImpl<
  T,
  ContextType extends ContextWithReturning
>(
  context: ContextType,
  copyContext: (context: ContextType) => ContextType,
  nextStepImpl: (context: ContextType) => Fetchable<T>,
  fields?: TableFields,
): ReturningStep<T> {
  return {
    returning(fieldOrFields?: Field<any> | TableFields): Fetchable<any> {
      if (!fieldOrFields) {
        return nextStepImpl({
          ...copyContext(context),
          returning: { ...fields },
        });
      } else {
        return nextStepImpl({
          ...copyContext(context),
          returning: fieldOrFields,
        });
      }
    },
  };
}
