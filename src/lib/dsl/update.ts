import { Executable } from './executable';
import { WhereChainStep, WhereStep } from './where';
import { JoinStep } from './join';
import { FromStep } from './from';
import { TableLike } from '../table';
import { ReturningStep } from './returning';
import { MapValueToFieldOrValue } from '../types';

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
  doNothing(): OnConflictUpdateReturningStep<T>;
  doUpdate(): OnConflictUpdateSetStep<T>;
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
