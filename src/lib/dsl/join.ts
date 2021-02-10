import { Condition } from '../condition';
import { Table } from '../table';
import { NotImplementedException } from '../exceptions';
import { IdentifierOptions } from '../utils';
import { DSL } from './dsl';
import { joinDefined } from './postgres/dsl.context.postgres';

export type JoinType =
  | 'inner'
  | 'left'
  | 'right'
  | 'left outer'
  | 'right outer'
  | 'full outer';

export interface JoinContext {
  table: Table;
  type: JoinType;
  conditions: Condition[];
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
  throw new NotImplementedException(`JoinType ${type}`);
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
