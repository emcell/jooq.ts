import { TableLike } from '../table';
import { MapValueToFieldOrValue } from '../types';
import { Executable } from './executable';
import { FromStep } from './from';
import { JoinStep } from './join';
import { ReturningStep } from './returning';
import { WhereChainStep, WhereStep } from './where';

export interface OnConflictUpdateReturningStep<T>
  extends ReturningStep<T>,
    Executable {}

export interface OnConflictUpdateSetStep<T> {
  set(
    object: Partial<MapValueToFieldOrValue<T>>,
  ): OnConflictUpdateReturningStep<T>;
  setExcluded(): OnConflictUpdateReturningStep<T>;
}

export interface OnConflictStep<T> {
  doUpdate(): OnConflictUpdateSetStep<T>;
  doNothing(): OnConflictUpdateReturningStep<T>;
}

export interface UpdateWhereChainStep<T>
  extends WhereChainStep<T, UpdateWhereChainStep<T>>,
    Executable,
    ReturningStep<T> {}
export interface UpdateWhereStep<T>
  extends WhereStep<T, UpdateWhereChainStep<T>> {}

export interface UpdateJoinStep<T>
  extends UpdateWhereStep<T>,
    JoinStep<UpdateFromStep<T>> {}

export interface UpdateFromStep<T>
  extends UpdateWhereStep<T>,
    FromStep<UpdateFromStep<T>, UpdateJoinStep<T>> {}

export interface UpdateStep<T>
  extends WhereStep<T, UpdateWhereChainStep<T>>,
    Executable {
  from(table: TableLike): UpdateFromStep<T>;
}
