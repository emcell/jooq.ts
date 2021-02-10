import { Table } from '../../table';
import { Fetchable } from '../fetchable';
import { Field } from '../../field/field';
import { InsertStep } from '../insert';
import {
  OnConflictStep,
  OnConflictUpdateReturningStep,
  OnConflictUpdateSetStep,
} from '../update';
import { Executable } from '../executable';
import { ReturningStep } from '../returning';
import {
  Assignment,
  FieldOrValueMap,
  MapValueToFieldOrValue,
} from '../../types';

interface Fields {
  [P: string]: Field<any>;
}

export interface InsertContextOnConflict {
  id: string;
  do: 'nothing' | 'excluded';
  fields?: Assignment<any>[];
}

export interface InsertContext {
  table: Table;
  fields?: Fields;
  values: Fetchable<any> | any[];
  onConflict?: InsertContextOnConflict;
  returning?: Fields;
}

export function createInsertContext<T>(
  table: Table,
  values: T[] | Fetchable<T>,
): InsertContext {
  return {
    table,
    values,
  };
}

function copyContext(context: InsertContext): InsertContext {
  return context;
}

function ExecutableImpl(_context: InsertContext): Executable {
  return {} as any;
}

function ReturningStepImpl(_context: InsertContext): ReturningStep {
  return {} as any;
}

function OnConflictUpdateReturningStepImpl(
  _context: InsertContext,
): OnConflictUpdateReturningStep {
  return {} as any;
}

// function mapToAssignment<T>(fields: object: FieldOrValueMap<T>): Assignment<any>[] {
//   const assignments: Assignment<any>[] = [];
//   Object.keys(object).map(fieldOrValue =>{
//     assignments.push({})
//   })
// }

function OnConflictUpdateSetStepImpl<T>(
  context: InsertContext,
): OnConflictUpdateSetStep<T> {
  return {
    set(): //      object: Partial<MapValueToFieldOrValue<T>>,
    OnConflictUpdateReturningStep {
      return OnConflictUpdateReturningStepImpl({ ...copyContext(context) });
    },
    setExcluded(): OnConflictUpdateReturningStep {
      return {} as any;
    },
  };
}

function OnConflictStepImpl<T>(context: InsertContext): OnConflictStep<T> {
  return {
    doNothing(): OnConflictUpdateReturningStep {
      return OnConflictUpdateReturningStepImpl({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          do: 'nothing',
        },
      });
    },
    doUpdate(): OnConflictUpdateSetStep<T> {
      return OnConflictUpdateSetStepImpl<T>(context);
    },
  };

  return {} as any;
}

export function InsertStepImpl<T>(context: InsertContext): InsertStep<T> {
  return {
    ...ExecutableImpl(context),
    ...ReturningStepImpl(context),
    onConflict(name: keyof T | string): OnConflictStep<T> {
      return OnConflictStepImpl<T>({
        ...copyContext(context),
        onConflict: {
          id: name as string,
          do: 'nothing',
        },
      }) as any;
    },
  };
}
