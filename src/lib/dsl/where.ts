import { Condition } from '../condition';
import { TableFields } from '../types';
import { DSL } from './dsl';
import { Field } from './field';
import { toConditions } from './postgres/postgres-utils';

export interface WhereChainStep<T, WhereStep> {
  and(condition: Condition): WhereStep;
  and(conditions: Condition[]): WhereStep;
  and(...conditions: Condition[]): WhereStep;
  and(fieldValues: Partial<T>, operator?: string): WhereStep;
  or(condition: Condition): WhereStep;
  or(conditions: Condition[]): WhereStep;
  or(...conditions: Condition[]): WhereStep;
  or(fieldValues: Partial<T>, operator?: string): WhereStep;
}

export interface WhereStep<T, WhereChainStep> {
  where(condition: Condition): WhereChainStep;
  where(condition: Condition[]): WhereChainStep;
  where(...condition: Condition[]): WhereChainStep;
  where(object: Partial<T>, operator?: string): WhereChainStep;
}

export interface ContextWithConditions {
  conditions: Condition[];
}

export function AbstractWhereStepImpl<
  T,
  NextStep,
  ContextType extends ContextWithConditions,
  FieldsType extends TableFields | Field<unknown>
>(
  context: ContextType,
  fields: FieldsType,
  copyContext: (context: ContextType) => ContextType,
  nextStep: (context: ContextType) => NextStep,
): WhereStep<T, NextStep> {
  return {
    where(
      conditionsOrObject: Condition | Condition[] | Partial<T>,
      operator?: string | Condition,
      ..._rest: Condition[]
    ): NextStep {
      return {
        ...nextStep({
          ...copyContext(context),
          conditions: toConditions(fields, conditionsOrObject, operator, _rest),
        }),
      };
    },
  };
}

export function AbstractWhereChainStepImpl<
  T,
  NextStep,
  ContextType extends ContextWithConditions,
  FieldsType extends TableFields | Field<unknown>
>(
  context: ContextType,
  fields: FieldsType,
  copyContext: (context: ContextType) => ContextType,
  nextStep: (context: ContextType) => NextStep,
): WhereChainStep<T, NextStep> {
  return {
    //and(condition: Condition): WhereStep;
    //and(conditions: Condition[]): WhereStep;
    //and(...conditions: Condition[]): WhereStep;
    //and(fieldValues: Partial<T>, operator?: string): WhereStep;
    and(
      condition: Condition | Condition[] | Partial<T>,
      conditionOrOperator?: Condition | string,
      ...rest: Condition[]
    ): NextStep {
      return nextStep({
        ...copyContext(context),
        conditions: [
          ...context.conditions,
          ...toConditions(fields, condition, conditionOrOperator, rest),
        ],
      });
    },

    or(
      condition: Condition | Condition[] | Partial<T>,
      conditionOrOperator?: Condition | string,
      ...rest: Condition[]
    ): NextStep {
      return nextStep({
        ...copyContext(context),
        conditions: [
          DSL.or([
            DSL.and(context.conditions),
            ...toConditions(fields, condition, conditionOrOperator, rest),
          ]),
        ],
      });
    },
  };
}
