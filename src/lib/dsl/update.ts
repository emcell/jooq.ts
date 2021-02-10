import { Executable } from './executable';
import { WhereChainStep, WhereStep } from './where';
import { JoinStep } from './join';
import { FromStep } from './from';
import { Table } from '../table';
import { ReturningStep } from './returning';
import { MapValueToFieldOrValue } from '../types';

export interface OnConflictUpdateReturningStep
  extends ReturningStep,
    Executable {}

export interface OnConflictUpdateSetStep<T> {
  set(
    object: Partial<MapValueToFieldOrValue<T>>,
  ): OnConflictUpdateReturningStep;
  setExcluded(): OnConflictUpdateReturningStep;
}

export interface OnConflictStep<T> {
  doNothing(): OnConflictUpdateReturningStep;
  doUpdate(): OnConflictUpdateSetStep<T>;
}

export interface UpdateWhereChainStep<T>
  extends WhereChainStep<T, UpdateWhereChainStep<T>>,
    Executable,
    ReturningStep {}
export interface UpdateWhereStep<T>
  extends WhereStep<T, UpdateWhereChainStep<T>> {}

interface UpdateJoinStep<T>
  extends UpdateWhereStep<T>,
    JoinStep<UpdateJoinStep<T>> {}

export interface UpdateFromStep<T>
  extends UpdateWhereStep<T>,
    FromStep<UpdateFromStep<T>, UpdateJoinStep<T>> {}

export interface UpdateStep<T>
  extends WhereStep<T, UpdateWhereChainStep<T>>,
    Executable {
  from(table: Table): UpdateFromStep<T>;
}
