import { Executable } from './executable';
import { ReturningStep } from './returning';
import { OnConflictStep } from './update';

export interface InsertStep<T> extends Executable, ReturningStep<T> {
  onConflict(name: keyof T | string): OnConflictStep<T>;
}
