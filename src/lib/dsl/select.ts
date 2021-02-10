import { Fetchable } from './fetchable';
import { LimitStep } from './limit';
import { GroupByStep } from './group';
import { WhereChainStep, WhereStep } from './where';
import { JoinStep } from './join';
import { FromStep } from './from';
import { Table } from '../table';
import { OrderStep } from './order';

export interface SelectWhereChainStep<T>
  extends Fetchable<T>,
    LimitStep<T>,
    OrderStep<T>,
    GroupByStep<T>,
    WhereChainStep<T, SelectWhereChainStep<T>> {}

export interface SelectWhereStep<T>
  extends Fetchable<T>,
    LimitStep<T>,
    OrderStep<T>,
    GroupByStep<T>,
    WhereStep<T, SelectWhereChainStep<T>> {}

export interface SelectJoinStep<T>
  extends SelectWhereStep<T>,
    JoinStep<SelectFromStep<T>> {}

export interface SelectFromStep<T>
  extends SelectWhereStep<T>,
    FromStep<SelectFromStep<T>, SelectJoinStep<T>> {}

export interface SelectStep<T> extends Fetchable<T> {
  from(_table: Table): SelectFromStep<T>;
}
