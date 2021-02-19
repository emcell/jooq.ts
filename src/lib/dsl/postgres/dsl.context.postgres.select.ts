import { Condition } from '../../condition';
import { TableLike } from '../../table';
import { TableFields } from '../../types';
import { DSL } from '../dsl';
import { Fetchable } from '../fetchable';
import { Field, fieldsToStringOrAsterisk } from '../field';
import { AbstractFromStepImpl, FromStep } from '../from';
import { GroupByStep, groupFieldsToString } from '../group';
import {
  AbstractJoinStepImpl,
  copyJoinTables,
  JoinContext,
  joinTablesToString,
} from '../join';
import { LimitStep } from '../limit';
import { OrderField, orderFieldsToString, OrderStep } from '../order';
import {
  SelectFromStep,
  SelectJoinStep,
  SelectStep,
  SelectWhereChainStep,
  SelectWhereStep,
} from '../select';
import { AbstractWhereChainStepImpl, AbstractWhereStepImpl } from '../where';
import { PostgresContext } from './dsl.context.postgres';
import { PostgresFetchableImpl } from './postgres-utils';

export interface SelectContext extends PostgresContext {
  fields: TableFields | Field<unknown>;
  table?: TableLike;
  joinTables: JoinContext[];
  conditions: Condition[];
  orderFields: OrderField<any>[];
  groupFields: Field<any>[];
  limit?: {
    offset?: number;
    count?: number;
  };
}

function copyContext(context: SelectContext): SelectContext {
  return {
    options: context.options,
    runtime: context.runtime,
    fields:
      context.fields instanceof Field ? context.fields : { ...context.fields },
    table: context.table,
    joinTables: copyJoinTables(context.joinTables),
    conditions: [...context.conditions],
    orderFields: [...context.orderFields],
    groupFields: [...context.groupFields],
    limit: {
      ...context.limit,
    },
  };
}

export function joinDefined(pieces: (string | undefined)[], separator = ' ') {
  return pieces.filter((piece) => piece !== undefined).join(separator);
}

function setLimitTo1(context: SelectContext) {
  if (!context.limit) {
    context.limit = {
      count: 1,
    };
  } else {
    context.limit.count = 1;
  }
}

function toSql(context: SelectContext): string {
  const qry: string[] = ['SELECT'];
  if (context.fields instanceof Field) {
    qry.push(context.fields.toSql(context.options));
  } else {
    qry.push(fieldsToStringOrAsterisk(context.fields, context.options));
  }
  if (context.table) {
    qry.push('FROM');
    qry.push(context.table.toSql(context.options));
  }
  if (context.joinTables.length) {
    qry.push(joinTablesToString(context.joinTables, context.options));
  }
  if (context.conditions.length) {
    qry.push('WHERE');
    qry.push(DSL.and(context.conditions).toSql(context.options));
  }
  if (context.groupFields.length) {
    qry.push('GROUP BY');
    qry.push(groupFieldsToString(context.groupFields, context.options));
  }
  if (context.orderFields.length) {
    qry.push('ORDER BY');
    qry.push(orderFieldsToString(context.orderFields, context.options));
  }
  if (context.limit) {
    if (context.limit.count) qry.push(`LIMIT ${context.limit.count}`);
    if (context.limit.offset) qry.push(`OFFSET ${context.limit.offset}`);
  }
  return qry.join(' ');
}

function FetchableImpl<T>(context: SelectContext): Fetchable<T> {
  const fetchable = PostgresFetchableImpl<T>(
    () => {
      return toSql(context);
    },
    context.runtime.pool,
    context.fields,
  );
  return {
    ...fetchable,
    async fetchOne(): Promise<T | undefined> {
      setLimitTo1(context);
      return fetchable.fetchOne();
    },
    async fetchOneOrThrow(): Promise<T> {
      setLimitTo1(context);
      return fetchable.fetchOneOrThrow();
    },
  };
}

function LimitStepImpl<T>(
  context: SelectContext,
  fetchable: Fetchable<T> = FetchableImpl(context),
): LimitStep<T> {
  return {
    ...fetchable,
    limit(countOrOffset: number, count?: number): Fetchable<T> {
      if (count === undefined) {
        return FetchableImpl({
          ...copyContext(context),
          limit: { count: countOrOffset },
        });
      }
      return FetchableImpl({
        ...copyContext(context),
        limit: { count: count, offset: countOrOffset },
      });
    },
    first(): Fetchable<T> {
      return FetchableImpl({
        ...copyContext(context),
        limit: { count: 1 },
      });
    },
  };
}

function GroupByStepImpl<T>(context: SelectContext): GroupByStep<T> {
  const orderStep: OrderStep<T> = OrderStepImpl(context);
  return {
    ...orderStep,
    groupBy(
      fieldOrFields: Field<T> | Field<T>[],
      ...rest: Field<T>[]
    ): GroupByStep<T> {
      if (!Array.isArray(fieldOrFields)) {
        fieldOrFields = [fieldOrFields];
      }
      fieldOrFields.push(...rest);
      return GroupByStepImpl({
        ...copyContext(context),
        groupFields: [...context.groupFields, ...fieldOrFields],
      });
    },
  };
}

function OrderStepImpl<T>(context: SelectContext): OrderStep<T> {
  return {
    ...LimitStepImpl(context),
    orderBy(
      fields: Field<any> | Field<any>[] | OrderField<any>[],
      direction?: 'asc' | 'desc',
    ): OrderStep<T> {
      let finalFields: OrderField<any>[] = [];
      if (!Array.isArray(fields)) {
        fields = [{ field: fields, direction }];
      }
      if (fields.length == 0) {
        return OrderStepImpl(context);
      }
      if (fields[0] instanceof Field) {
        const fieldHelper: Field<any>[] = fields as Field<any>[];
        finalFields = fieldHelper.map((field) => {
          return <OrderField<T>>{ field };
        });
      } else finalFields = fields as OrderField<any>[];
      return OrderStepImpl({
        ...copyContext(context),
        orderFields: [...context.orderFields, ...finalFields],
      });
    },
  };
}

function SelectWhereChainStepImpl<T>(
  context: SelectContext,
): SelectWhereChainStep<T> {
  const groupByStep: GroupByStep<T> = GroupByStepImpl(context);
  const whereChainStep = AbstractWhereChainStepImpl<
    T,
    SelectWhereChainStep<T>,
    SelectContext,
    SelectContext['fields']
  >(context, context.fields, copyContext, SelectWhereChainStepImpl);
  return {
    ...groupByStep,
    ...whereChainStep,
  };
}

function SelectWhereStepImpl<T>(context: SelectContext): SelectWhereStep<T> {
  const groupByStep: GroupByStep<T> = GroupByStepImpl(context);
  const selectWhereChainStep = AbstractWhereStepImpl<
    T,
    SelectWhereChainStep<T>,
    SelectContext,
    SelectContext['fields']
  >(context, context.fields, copyContext, SelectWhereChainStepImpl);
  return {
    ...groupByStep,
    ...selectWhereChainStep,
  };
}

function SelectJoinStepImpl<T>(context: SelectContext): SelectJoinStep<T> {
  const selectWhereStep: SelectWhereStep<T> = SelectWhereStepImpl<T>(context);
  const joinStep = AbstractJoinStepImpl<SelectFromStep<T>, SelectContext>(
    context,
    copyContext,
    SelectFromStepImpl,
  );
  return {
    ...selectWhereStep,
    ...joinStep,
  };
}

function FromStepImpl<T>(
  context: SelectContext,
): FromStep<SelectFromStep<T>, SelectJoinStep<T>> {
  return {
    ...AbstractFromStepImpl<
      SelectFromStep<T>,
      SelectJoinStep<T>,
      SelectContext
    >(context, copyContext, SelectFromStepImpl, SelectJoinStepImpl),
  };
}

export function SelectFromStepImpl<T>(
  context: SelectContext,
): SelectFromStep<T> {
  return {
    ...SelectWhereStepImpl(context),
    ...FromStepImpl(context),
  };
}

export function SelectStepImpl<T>(context: SelectContext): SelectStep<T> {
  return {
    ...FetchableImpl<T>(context),
    from(table: TableLike): SelectFromStep<T> {
      return SelectFromStepImpl<T>({ ...copyContext(context), table });
    },
  };
}
