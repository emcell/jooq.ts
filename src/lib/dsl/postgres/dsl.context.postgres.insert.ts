import { Table, TableLike } from '../../table';
import {
  FieldOrValueMap,
  FieldsForType,
  MapValueToFieldOrValue,
  TableFields,
} from '../../types';
import { IdentifierOptions, identifierToSql } from '../../utils';
import { DSL } from '../dsl';
import { AbstractExecutableImpl, Executable } from '../executable';
import { Fetchable } from '../fetchable';
import { Field } from '../field';
import { InsertStep } from '../insert';
import { AbstractReturningStepImpl, ReturningStep } from '../returning';
import {
  OnConflictStep,
  OnConflictUpdateReturningStep,
  OnConflictUpdateSetStep,
} from '../update';
import { PostgresContext } from './dsl.context.postgres';
import {
  fieldOrValueMapToSql,
  generateFields,
  mapFieldToDb,
  PostgresFetchableImpl,
} from './postgres-utils';

export interface InsertContextOnConflict {
  id: string;
  do: 'nothing' | 'update';
  fields?: FieldOrValueMap<any>;
}

export interface InsertContext extends PostgresContext {
  table: TableLike;
  fields?: TableFields;
  values: Fetchable<any> | any[];
  onConflict?: InsertContextOnConflict;
  returning?: TableFields | Field<any>;
}

export function createInsertContext<T>(
  table: TableLike,
  fields: FieldsForType<T>,
  values: T[] | Fetchable<T>,
  postgresContext: PostgresContext,
): InsertContext {
  return {
    table,
    fields,
    values,
    ...postgresContext,
  };
}

function copyContext(context: InsertContext): InsertContext {
  return {
    runtime: context.runtime,
    options: context.options,
    table: context.table,
    fields: { ...context.fields },
    values: Array.isArray(context.values)
      ? [...context.values]
      : context.values,
    onConflict: context.onConflict,
    returning: context.returning,
  };
}

function objectToValues(
  object: any,
  fields: InsertContext['fields'],
  options: IdentifierOptions | undefined,
): string {
  const sqlValues: string[] = [];
  for (const key in fields) {
    const field = fields[key];
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      const value = object[key];
      if (value === null || value === undefined) {
        sqlValues.push('null');
      } else {
        if (field.converter) {
          sqlValues.push(mapFieldToDb(field.converter.toDb(value), options));
        } else {
          sqlValues.push(mapFieldToDb(value, options));
        }
      }
    }
  }
  return `(${sqlValues.join(',')})`;
}

function toSql(context: InsertContext): string {
  const query: string[] = ['INSERT INTO', context.table.toSql(context.options)];
  if (!context.fields) {
    throw new Error('cannot insert without knowning Fields');
  }
  query.push(`(${generateFields(context.fields, context.options)})`);
  if (Array.isArray(context.values)) {
    query.push(
      'VALUES',
      context.values
        .map((object) =>
          objectToValues(object, context.fields, context.options),
        )
        .join(','),
    );
  } else {
    query.push(`(${context.values.toSql(context.options)})`);
  }
  if (context.onConflict) {
    query.push(
      `ON CONFLICT (${identifierToSql(
        context.onConflict.id,
        context.options,
      )})`,
    );
    if (context.onConflict.do === 'nothing') {
      query.push('DO NOTHING');
    } else {
      if (!context.onConflict.fields) {
        throw new Error('need fields to do update on conflict');
      }
      query.push('DO UPDATE SET');
      query.push(
        fieldOrValueMapToSql(
          context.onConflict.fields,
          context.fields,
          context.options,
        ),
      );
    }
  }
  if (context.returning) {
    if (context.returning instanceof Field) {
      query.push(
        'RETURNING',
        generateFields({ dummy: context.returning }, context.options),
      );
    } else {
      query.push(
        'RETURNING',
        generateFields(context.returning, context.options),
      );
    }
  }
  return query.join(' ');
}

function UpdateExecutableImpl(context: InsertContext): Executable {
  return AbstractExecutableImpl(() => toSql(context), context);
}

function InsertFetchableImpl<T>(_context: InsertContext): Fetchable<T> {
  if (!_context.returning) {
    throw new Error(
      'implementation error. Fetchable without returning in context is no possible',
    );
  }
  return PostgresFetchableImpl<T>(
    () => {
      return toSql(_context);
    },
    _context.runtime.pool,
    _context.returning,
  );
}

function UpdateReturningStepImpl<T>(context: InsertContext): ReturningStep<T> {
  return AbstractReturningStepImpl<T, InsertContext>(
    context,
    copyContext,
    InsertFetchableImpl,
    context.fields,
  );
}

function OnConflictUpdateReturningStepImpl<T>(
  context: InsertContext,
): OnConflictUpdateReturningStep<T> {
  return {
    ...UpdateExecutableImpl(context),
    ...UpdateReturningStepImpl(context),
  };
}

function OnConflictUpdateSetStepImpl<T>(
  context: InsertContext,
): OnConflictUpdateSetStep<T> {
  return {
    set(
      object: Partial<MapValueToFieldOrValue<T>>,
    ): OnConflictUpdateReturningStep<T> {
      return OnConflictUpdateReturningStepImpl({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          fields: object,
        },
      });
    },
    setExcluded(): OnConflictUpdateReturningStep<T> {
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
    doNothing(): OnConflictUpdateReturningStep<T> {
      return OnConflictUpdateReturningStepImpl({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          do: 'nothing',
        },
      });
    },
    doUpdate(): OnConflictUpdateSetStep<T> {
      return OnConflictUpdateSetStepImpl<T>({
        ...copyContext(context),
        onConflict: {
          ...(context.onConflict as InsertContextOnConflict),
          do: 'update',
        },
      });
    },
  };
}

export function InsertStepImpl<T>(context: InsertContext): InsertStep<T> {
  return {
    ...UpdateExecutableImpl(context),
    ...UpdateReturningStepImpl(context),
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
