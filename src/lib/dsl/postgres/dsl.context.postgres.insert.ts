import { Field } from '../../field/field';
import { Table } from '../../table';
import {
  FieldOrValueMap,
  MapValueToFieldOrValue
} from '../../types';
import { DSL } from '../dsl';
import { Executable } from '../executable';
import { Fetchable } from '../fetchable';
import { InsertStep } from '../insert';
import { ReturningStep } from '../returning';
import {
  OnConflictStep,
  OnConflictUpdateReturningStep,
  OnConflictUpdateSetStep
} from '../update';

interface Fields {
  [P: string]: Field<any>;
}

export interface InsertContextOnConflict {
  id: string;
  do: 'nothing' | 'update';
  fields?: FieldOrValueMap<any>;
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

function OnConflictUpdateSetStepImpl<T>(
  context: InsertContext,
): OnConflictUpdateSetStep<T> {
  return {
    set(
      object: Partial<MapValueToFieldOrValue<T>>,
    ): OnConflictUpdateReturningStep {
      return OnConflictUpdateReturningStepImpl({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          fields: object,
        },
      });
    },
    setExcluded(): OnConflictUpdateReturningStep {
      const object: any = {};
      if (!context.fields) {
        throw new Error('dafuq');
      }
      const excluded = new Table('excluded');
      Object.keys(context.fields).forEach((field) => {
        object[field] = DSL.tableField(excluded, field);
      });
      return OnConflictUpdateReturningStepImpl({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          fields: object,
        },
      });
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
