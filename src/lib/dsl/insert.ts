import { Executable } from './executable';
import { Field } from './field';
import { ReturningStep } from './returning';
import { OnConflictStep, OnConflictUpdateReturningStep } from './update';

export interface InsertStep<T> extends Executable, ReturningStep<T> {
  onConflictDoNothing(): OnConflictUpdateReturningStep<T>;
  onConflict(name: keyof T | string): OnConflictStep<T>;
  onConflict(fields: Field<unknown>[]): OnConflictStep<T>;
  onConflictConstraint(constraintName: string): OnConflictStep<T>;
}
