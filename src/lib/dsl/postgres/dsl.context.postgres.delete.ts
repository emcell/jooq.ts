import { Condition } from '../../condition';
import { TableLike } from '../../table';
import { TableFields } from '../../types';
import { DeleteStep, DeleteWhereChainStep, DeleteWhereStep } from '../delete';
import { DSL } from '../dsl';
import { AbstractExecutableImpl, Executable } from '../executable';
import { Fetchable } from '../fetchable';
import { Field } from '../field';
import {
  AbstractReturningStepImpl,
  ReturningStepUnknownFields,
} from '../returning';
import { AbstractWhereChainStepImpl, AbstractWhereStepImpl } from '../where';
import { PostgresContext } from './dsl.context.postgres';
import { generateFields, PostgresFetchableImpl } from './postgres-utils';

export interface DeleteContext extends PostgresContext {
  table: TableLike;
  conditions: Condition[];
  returning?: TableFields | Field<any>;
}

export function createUpdateContext(
  table: TableLike,
  postgresContext: PostgresContext,
): DeleteContext {
  return {
    table,
    ...postgresContext,
    conditions: [],
  };
}

function copyContext(context: DeleteContext) {
  return {
    ...context,
    conditions: [...context.conditions],
  };
}

export function createDeleteContext(
  table: TableLike,
  postgresContext: PostgresContext,
): DeleteContext {
  return {
    ...postgresContext,
    table: table,
    conditions: [],
  };
}

function toSql(context: DeleteContext): string {
  const sql: string[] = [];
  sql.push('DELETE FROM');
  sql.push(context.table.toSql(context.options));
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

function DeleteExecuteImpl(context: DeleteContext): Executable {
  return AbstractExecutableImpl(() => {
    return toSql(context);
  }, context);
}

function DeleteFetchableImpl<T>(context: DeleteContext): Fetchable<T> {
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

function DeleteWhereChainStepImpl(
  context: DeleteContext,
): DeleteWhereChainStep {
  return {
    ...DeleteExecuteImpl(context),
    ...DeleteReturningStepUnknownFields(context),
    ...AbstractWhereChainStepImpl(
      context,
      {},
      copyContext,
      DeleteWhereChainStepImpl,
    ),
  };
}

function DeleteWhereStepImpl(context: DeleteContext): DeleteWhereStep {
  return AbstractWhereStepImpl(
    context,
    {},
    copyContext,
    DeleteWhereChainStepImpl,
  );
}

function DeleteReturningStepUnknownFields(
  context: DeleteContext,
): ReturningStepUnknownFields {
  return AbstractReturningStepImpl(context, copyContext, DeleteFetchableImpl);
}

export function DeleteStepImpl(context: DeleteContext): DeleteStep {
  return {
    ...DeleteExecuteImpl(context),
    ...DeleteWhereStepImpl(context),
    ...DeleteReturningStepUnknownFields(context),
  };
}
