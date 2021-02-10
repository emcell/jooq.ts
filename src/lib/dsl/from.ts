import { Table } from '../table';
import { Condition } from '../condition';

export interface FromStep<TFromStep, TJoinStep> {
  join(table: Table, on: Condition | Condition[]): TFromStep;
  join(table: Table): TJoinStep;
  leftJoin(table: Table, on: Condition | Condition[]): TFromStep;
  leftJoin(table: Table): TJoinStep;
  rightJoin(table: Table, on: Condition | Condition[]): TFromStep;
  rightJoin(table: Table): TJoinStep;
  leftOuterJoin(table: Table, on: Condition | Condition[]): TFromStep;
  leftOuterJoin(table: Table): TJoinStep;
  rightOuterJoin(table: Table, on: Condition | Condition[]): TFromStep;
  rightOuterJoin(table: Table): TJoinStep;
  fullOuterJoin(table: Table, on: Condition | Condition[]): TFromStep;
  fullOuterJoin(table: Table): TJoinStep;
}
