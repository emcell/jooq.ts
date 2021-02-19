import { Condition } from '../condition';
import { TableLike } from '../table';
import { JoinContext, JoinType } from './join';

export interface FromStep<TFromStep, TJoinStep> {
  join(table: TableLike, on: Condition | Condition[]): TFromStep;
  join(table: TableLike): TJoinStep;
  leftJoin(table: TableLike, on: Condition | Condition[]): TFromStep;
  leftJoin(table: TableLike): TJoinStep;
  rightJoin(table: TableLike, on: Condition | Condition[]): TFromStep;
  rightJoin(table: TableLike): TJoinStep;
  leftOuterJoin(table: TableLike, on: Condition | Condition[]): TFromStep;
  leftOuterJoin(table: TableLike): TJoinStep;
  rightOuterJoin(table: TableLike, on: Condition | Condition[]): TFromStep;
  rightOuterJoin(table: TableLike): TJoinStep;
  fullOuterJoin(table: TableLike, on: Condition | Condition[]): TFromStep;
  fullOuterJoin(table: TableLike): TJoinStep;
}

export interface ContextWithJoinTables {
  joinTables: JoinContext[];
}

export function AbstractFromStepImpl<
  FromStepType,
  JoinStepType,
  ContextType extends ContextWithJoinTables
>(
  context: ContextType,
  copyContext: (context: ContextType) => ContextType,
  fromStepImpl: (context: ContextType) => FromStepType,
  joinStepImpl: (context: ContextType) => JoinStepType,
): FromStep<FromStepType, JoinStepType> {
  function addJoin(
    table: TableLike,
    type: JoinType,
    on?: Condition | Condition[],
  ) {
    if (on && !Array.isArray(on)) {
      on = [on];
    }
    if (on) {
      return fromStepImpl({
        ...copyContext(context),
        joinTables: [...context.joinTables, { table, type, conditions: on }],
      });
    } else {
      return joinStepImpl({
        ...copyContext(context),
        joinTables: [...context.joinTables, { table, type, conditions: [] }],
      });
    }
  }
  return {
    join(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'inner', on);
    },

    leftJoin(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'left', on);
    },
    rightJoin(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'right', on);
    },
    leftOuterJoin(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'left outer', on);
    },
    rightOuterJoin(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'right outer', on);
    },
    fullOuterJoin(table: TableLike, on?: Condition | Condition[]): any {
      return addJoin(table, 'full outer', on);
    },
  };
}
