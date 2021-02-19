import { Condition } from '../condition';
import { TableLike } from '../table';
import { IdentifierOptions } from '../utils';
import { DSL } from './dsl';
import { ContextWithJoinTables } from './from';
import { joinDefined } from './postgres/dsl.context.postgres.select';

export type JoinType =
  | 'inner'
  | 'left'
  | 'right'
  | 'left outer'
  | 'right outer'
  | 'full outer';

export interface JoinContext {
  table: TableLike;
  type: JoinType;
  conditions: Condition[];
}

export function copyJoinTables(joinTables: JoinContext[]): JoinContext[] {
  return joinTables.map((joinTable) => {
    return {
      table: joinTable.table,
      type: joinTable.type,
      conditions: [...joinTable.conditions],
    };
  });
}

export function joinTypeToSql(type: JoinType) {
  switch (type) {
    case 'inner':
      return 'INNER JOIN';
    case 'left':
      return 'LEFT JOIN';
    case 'right':
      return 'RIGHT JOIN';
    case 'left outer':
      return 'LEFT OUTER JOIN';
    case 'right outer':
      return 'RIGHT OUTER JOIN';
    case 'full outer':
      return 'FULL OUTER JOIN';
  }
}

export function joinTablesToString(
  joinTables: JoinContext[],
  options?: IdentifierOptions,
): string {
  return joinTables
    .map((joinTable) => {
      return joinDefined([
        joinTypeToSql(joinTable.type),
        joinTable.table.toSql(options),
        joinTable.conditions
          ? `ON ${DSL.and(joinTable.conditions).toSql(options)}`
          : undefined,
      ]);
    })
    .join(' ');
}

export interface JoinStep<TSelectStep> {
  on(condition: Condition): TSelectStep;
  on(condition: Condition[]): TSelectStep;
  on(...condition: Condition[]): TSelectStep;
}

export function AbstractJoinStepImpl<
  FromStep,
  ContextType extends ContextWithJoinTables
>(
  context: ContextType,
  copyContext: (context: ContextType) => ContextType,
  fromStepImpl: (context: ContextType) => FromStep,
): JoinStep<FromStep> {
  return {
    on(condition: Condition | Condition[], ...rest: Condition[]): FromStep {
      if (!Array.isArray(condition)) {
        condition = [condition];
      }
      condition.push(...rest);
      const newContext = { ...copyContext(context) };
      const joinTable = newContext.joinTables[newContext.joinTables.length - 1];
      joinTable.conditions = condition;
      return fromStepImpl(newContext);
    },
  };
}
