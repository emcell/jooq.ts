import { Condition } from '../../condition';
import { TableLike } from '../../table';
import { FieldOrValueMap, TableFields } from '../../types';
import { DSL } from '../dsl';
import { AbstractExecutableImpl, Executable } from '../executable';
import { Fetchable } from '../fetchable';
import { Field } from '../field';
import { AbstractFromStepImpl } from '../from';
import {
  AbstractJoinStepImpl,
  copyJoinTables,
  JoinContext,
  joinTablesToString,
} from '../join';
import { AbstractReturningStepImpl, ReturningStep } from '../returning';
import {
  UpdateFromStep,
  UpdateJoinStep,
  UpdateStep,
  UpdateWhereChainStep,
  UpdateWhereStep,
} from '../update';
import { AbstractWhereChainStepImpl, AbstractWhereStepImpl } from '../where';
import { PostgresContext } from './dsl.context.postgres';
import {
  fieldOrValueMapToSql,
  generateFields,
  PostgresFetchableImpl,
} from './postgres-utils';

export interface UpdateContext extends PostgresContext {
  table: TableLike;
  fields: TableFields;
  values: FieldOrValueMap<any>;
  fromTable?: TableLike;
  joinTables: JoinContext[];
  conditions: Condition[];
  returning?: TableFields | Field<any>;
}

export function createUpdateContext(
  table: TableLike,
  fields: TableFields,
  values: FieldOrValueMap<any>,
  postgresContext: PostgresContext,
): UpdateContext {
  return {
    table,
    fields,
    values,
    ...postgresContext,
    conditions: [],
    joinTables: [],
  };
}

function copyContext(context: UpdateContext) {
  return {
    ...context,
    fields: { ...context.fields },
    joinTables: copyJoinTables(context.joinTables),
    conditions: [...context.conditions],
  };
  return context;
}

export function toSql(context: UpdateContext): string {
  const sql: string[] = [];
  sql.push('UPDATE');
  sql.push(context.table.toSql(context.options));
  sql.push('SET');
  sql.push(
    fieldOrValueMapToSql(context.values, context.fields, context.options),
  );
  if (context.fromTable) {
    sql.push('FROM');
    sql.push(context.fromTable.toSql(context.options));
  }
  if (context.joinTables) {
    sql.push(joinTablesToString(context.joinTables, context.options));
  }
  if (context.conditions.length) {
    sql.push('WHERE');
    sql.push(DSL.and(context.conditions).toSql(context.options));
  }
  if (context.returning) {
    if (context.returning instanceof Field) {
      sql.push(
        'RETURNING',
        generateFields({ dummy: context.returning }, context.options),
      );
    } else {
      sql.push('RETURNING', generateFields(context.returning, context.options));
    }
  }
  return sql.join(' ');
}

function UpdateExecutableImpl(context: UpdateContext): Executable {
  return AbstractExecutableImpl(() => toSql(context), context);
}
function UpdateFetchableImpl<T>(context: UpdateContext): Fetchable<T> {
  if (!context.returning) {
    throw new Error(
      'implementation error. Fetchable without returning in context is no possible',
    );
  }
  return PostgresFetchableImpl<T>(
    () => {
      return toSql(context);
    },
    context.runtime.pool,
    context.returning,
  );
}

function UpdateReturningStepImpl<T>(context: UpdateContext): ReturningStep<T> {
  return AbstractReturningStepImpl<T, UpdateContext>(
    context,
    copyContext,
    UpdateFetchableImpl,
    context.fields,
  );
}

function UpdateWhereChainStepImpl<T>(
  context: UpdateContext,
): UpdateWhereChainStep<T> {
  const whereChainStep = AbstractWhereChainStepImpl<
    T,
    UpdateWhereChainStep<T>,
    UpdateContext,
    UpdateContext['fields']
  >(context, context.fields, copyContext, UpdateWhereChainStepImpl);
  return {
    ...whereChainStep,
    ...UpdateReturningStepImpl<T>(context),
    ...UpdateExecutableImpl(context),
  };
}

function UpdateWhereStepImpl<T>(context: UpdateContext): UpdateWhereStep<T> {
  const selectWhereChainStep = AbstractWhereStepImpl<
    T,
    UpdateWhereChainStep<T>,
    UpdateContext,
    UpdateContext['fields']
  >(context, context.fields, copyContext, UpdateWhereChainStepImpl);
  return {
    ...selectWhereChainStep,
  };
}

function UpdateJoinStepImpl<T>(context: UpdateContext): UpdateJoinStep<T> {
  const joinStep = AbstractJoinStepImpl<UpdateFromStep<T>, UpdateContext>(
    context,
    copyContext,
    UpdateFromStepImpl,
  );

  return {
    ...UpdateWhereStepImpl(context),
    ...joinStep,
  };
}
function UpdateFromStepImpl<T>(context: UpdateContext): UpdateFromStep<T> {
  return {
    ...AbstractFromStepImpl<
      UpdateFromStep<T>,
      UpdateJoinStep<T>,
      UpdateContext
    >(context, copyContext, UpdateFromStepImpl, UpdateJoinStepImpl),
    ...UpdateWhereStepImpl(context),
  };
}

export function UpdateStepImpl<T>(context: UpdateContext): UpdateStep<T> {
  return {
    ...UpdateWhereStepImpl<T>(context),
    ...UpdateExecutableImpl(context),
    from(table: TableLike): UpdateFromStep<T> {
      return UpdateFromStepImpl<T>({
        ...copyContext(context),
        fromTable: table,
      });
    },
  } as UpdateStep<T>;
}
