import { TableFields } from '../../types';
import { Field, fieldsToStringOrAsterisk } from '../../field/field';
import { Table } from '../../table';
import { JoinContext, joinTablesToString, JoinType } from '../join';
import { Condition, objectToConditions } from '../../condition';
import { OrderField, orderFieldsToString, OrderStep } from '../order';
import { Fetchable } from '../fetchable';
import { SqlSyntaxException } from '../../exceptions';
import { mapResult, mapResultSingleField } from '../result-mapping';
import { DSL } from '../dsl';
import { GroupByStep, groupFieldsToString } from '../group';
import { LimitStep } from '../limit';
import {
  SelectFromStep,
  SelectJoinStep,
  SelectStep,
  SelectWhereChainStep,
  SelectWhereStep,
} from '../select';
import { FromStep } from '../from';
import { PostgresContext } from './dsl.context.postgres';

interface SelectContext extends PostgresContext {
  fields: TableFields | Field<unknown>;
  table?: Table;
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
    joinTables: context.joinTables.map((joinTable) => {
      return {
        table: joinTable.table,
        type: joinTable.type,
        conditions: [...joinTable.conditions],
      };
    }),
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

function FetchableImpl<T>(context: SelectContext): Fetchable<T> {
  async function queryObject(query: string): Promise<any[]> {
    try {
      const result = await context.runtime.pool.query(query);
      return result.rows;
    } catch (e) {
      throw new SqlSyntaxException(query, e);
    }
  }
  async function queryArray(query: string): Promise<any[][]> {
    try {
      const result = await context.runtime.pool.query({
        text: query,
        rowMode: 'array',
      });
      return result.rows;
    } catch (e) {
      throw new SqlSyntaxException(query, e);
    }
  }
  return {
    async fetch(): Promise<T[]> {
      const sql = this.toSql();
      if (context.fields instanceof Field) {
        return mapResultSingleField<T>(context.fields, await queryArray(sql));
      } else if (!Object.keys(context.fields).length) {
        return queryObject(sql);
      } else {
        return mapResult(context.fields, await queryArray(sql));
      }
    },
    async fetchOne(): Promise<T | undefined> {
      setLimitTo1(context);
      const result = await this.fetch();
      return result.length ? result[0] : undefined;
    },
    async fetchOneOrThrow(): Promise<T> {
      setLimitTo1(context);
      const result = await this.fetch();
      if (result.length) {
        return result[0];
      }
      throw new Error('Zero rows fetched. Cannot return first row');
    },
    toSql(): string {
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

function toConditions<T>(
  condition: Condition | Condition[] | Partial<T>,
  conditionOrOperator?: Condition | string,
  rest?: Condition[],
): Condition[] {
  if (!Array.isArray(condition)) {
    // noinspection SuspiciousTypeOfGuard
    if (condition instanceof Condition) {
      condition = [condition];
    } else {
      condition = objectToConditions(
        condition,
        conditionOrOperator ? (conditionOrOperator as string) : '=',
      );
    }
  }

  return [...condition, ...(rest ? rest : [])];
}

function OrderStepImpl<T>(context: SelectContext): OrderStep<T> {
  return {
    ...LimitStepImpl(context),
    orderBy(
      fields: Field<any> | Field<any>[] | OrderField<any>[],
    ): OrderStep<T> {
      let finalFields: OrderField<any>[] = [];
      if (!Array.isArray(fields)) {
        fields = [{ field: fields }];
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
  return {
    ...groupByStep,
    //WhereChainStep<T, SelectWhereChainStep<T>> {}

    //and(condition: Condition): WhereStep;
    //and(conditions: Condition[]): WhereStep;
    //and(...conditions: Condition[]): WhereStep;
    //and(fieldValues: Partial<T>, operator?: string): WhereStep;
    and(
      condition: Condition | Condition[] | Partial<T>,
      conditionOrOperator?: Condition | string,
      ...rest: Condition[]
    ): SelectWhereChainStep<T> {
      return SelectWhereChainStepImpl<T>({
        ...copyContext(context),
        conditions: [
          ...context.conditions,
          ...toConditions(condition, conditionOrOperator, rest),
        ],
      });
    },

    or(
      condition: Condition | Condition[] | Partial<T>,
      conditionOrOperator?: Condition | string,
      ...rest: Condition[]
    ): SelectWhereChainStep<T> {
      return SelectWhereChainStepImpl<T>({
        ...copyContext(context),
        conditions: [
          DSL.or([
            DSL.and(context.conditions),
            ...toConditions(condition, conditionOrOperator, rest),
          ]),
        ],
      });
    },
  };
}

function SelectWhereStepImpl<T>(context: SelectContext): SelectWhereStep<T> {
  const groupByStep: GroupByStep<T> = GroupByStepImpl(context);
  return {
    ...groupByStep,

    where(
      conditionsOrObject: Condition | Condition[] | Partial<T>,
      operator?: string | Condition,
      ..._rest: Condition[]
    ): SelectWhereChainStep<T> {
      return {
        ...SelectWhereChainStepImpl({
          ...copyContext(context),
          conditions: toConditions(conditionsOrObject, operator, _rest),
        }),
      };
    },
  };
}

function SelectJoinStepImpl<T>(context: SelectContext): SelectJoinStep<T> {
  const selectWhereStep: SelectWhereStep<T> = SelectWhereStepImpl<T>(context);
  return {
    ...selectWhereStep,
    on(
      condition: Condition | Condition[],
      ...rest: Condition[]
    ): SelectFromStep<T> {
      if (!Array.isArray(condition)) {
        condition = [condition];
      }
      condition.push(...rest);
      const newContext = { ...copyContext(context) };
      const joinTable = newContext.joinTables[newContext.joinTables.length - 1];
      joinTable.conditions = condition;
      return SelectFromStepImpl<T>(newContext);
    },
  };
}

function FromStepImpl<T>(
  context: SelectContext,
): FromStep<SelectFromStep<T>, SelectJoinStep<T>> {
  function addJoin(table: Table, type: JoinType, on?: Condition | Condition[]) {
    if (on && !Array.isArray(on)) {
      on = [on];
    }
    if (on) {
      return SelectFromStepImpl<T>({
        ...copyContext(context),
        joinTables: [...context.joinTables, { table, type, conditions: on }],
      });
    } else {
      return SelectJoinStepImpl<T>({
        ...copyContext(context),
        joinTables: [...context.joinTables, { table, type, conditions: [] }],
      });
    }
  }
  return {
    join(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'inner', on);
    },

    leftJoin(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'left', on);
    },
    rightJoin(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'right', on);
    },
    leftOuterJoin(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'left outer', on);
    },
    rightOuterJoin(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'right outer', on);
    },
    fullOuterJoin(table: Table, on?: Condition | Condition[]): any {
      return addJoin(table, 'full outer', on);
    },
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
    from(table: Table): SelectFromStep<T> {
      return SelectFromStepImpl<T>({ ...copyContext(context), table });
    },
  };
}
