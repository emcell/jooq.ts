import {
  Condition,
  ConditionCompare,
  ConditionRightQuery,
  ConditionUnaryOperator,
} from '../condition';
import { DbTypes } from '../dsl/dsl';
import { Fetchable, FetchableData } from '../dsl/fetchable';
import { ToSql } from '../helpers';
import { TableLike } from '../table';
import { FieldToValue, TableFields } from '../types';
import { IdentifierOptions, identifierToSql } from '../utils';
import { Converter, FieldTools } from './field-tools';

export type FieldOptions = IdentifierOptions;

// noinspection JSUnusedGlobalSymbols
export abstract class Field<T, DbType extends DbTypes = DbTypes>
  implements ToSql<FieldOptions> {
  protected constructor(public converter?: Converter<DbType, T>) {}
  abstract getName(options?: FieldOptions): string;
  abstract toSql(options?: FieldOptions): string;
  abstract as(alias: string): Field<T, DbType>;

  abstract eq(value: Field<T> | T): Condition;
  abstract isNull(): Condition;
  abstract isNotNull(): Condition;
  abstract lessThan(value: Field<T> | T): Condition;
  abstract lt(value: Field<T> | T): Condition;
  abstract lessOrEqual(value: Field<T> | T): Condition;
  abstract le(value: Field<T> | T): Condition;
  abstract greaterThan(value: Field<T> | T): Condition;
  abstract gt(value: Field<T> | T): Condition;
  abstract greaterOrEqual(value: Field<T> | T): Condition;
  abstract ge(value: Field<T> | T): Condition;
  abstract in(values: T[]): Condition;
  abstract in(select: Fetchable<T>): Condition;
  abstract in(select: Fetchable<T> | T[]): Condition;
  abstract notIn(values: T[]): Condition;
  abstract notIn(select: Fetchable<T>): Condition;

  abstract count(): Field<number>;

  abstract concat(value: Field<string> | string): Field<string>;
  abstract add(value: Field<T> | T): Field<T>;
  abstract subtract(value: Field<T> | T): Field<T>;
  abstract multiply(value: Field<number> | number): Field<number>;
  abstract divide(value: Field<number> | number): Field<number>;
  abstract modulo(value: Field<number> | number): Field<number>;
  abstract bitNot(value: Field<number> | number): Field<number>;
  abstract bitAnd(value: Field<number> | number): Field<number>;
  abstract bitOr(value: Field<number> | number): Field<number>;
  abstract bitXor(value: Field<number> | number): Field<number>;
  abstract bitNand(value: Field<number> | number): Field<number>;
  abstract bitNor(value: Field<number> | number): Field<number>;
  abstract bitXNor(value: Field<number> | number): Field<number>;
  abstract bitShiftLeft(value: Field<number> | number): Field<number>;
  abstract bitShiftRight(value: Field<number> | number): Field<number>;

  abstract avg(value: Field<T>): Field<number>;
  abstract min(value: Field<T>): Field<number>;
  abstract max(value: Field<T>): Field<number>;
  abstract sum(value: Field<T>): Field<number>;

  abstract operator(operator: string, value: Field<T> | T): Condition;

  abstract like(value: string): Condition;
  abstract ilike(value: string): Condition;
}

export abstract class FieldAbstract<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends Field<T, DbType> {
  protected constructor(converter?: Converter<DbType, T>) {
    super(converter);
  }
  eq<T>(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '=', value);
  }
  isNull(): Condition {
    return new ConditionUnaryOperator(this, 'is null');
  }
  isNotNull(): Condition {
    return new ConditionUnaryOperator(this, 'is not null');
  }
  lessThan(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '<', value);
  }
  lt(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '<', value);
  }
  lessOrEqual(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '<=', value);
  }
  le(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '<=', value);
  }
  greaterThan(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '>', value);
  }
  gt(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '>', value);
  }
  greaterOrEqual(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '>=', value);
  }
  ge(value: Field<T> | T): Condition {
    return new ConditionCompare(this, '>=', value);
  }
  in(_values: T[]): Condition;
  in(_select: Fetchable<T>): Condition;
  in(selectOrValues: Fetchable<T> | T[]): Condition {
    if (Array.isArray(selectOrValues)) {
      selectOrValues = new FetchableData<T>(selectOrValues, this.converter);
    }
    return new ConditionRightQuery(this, 'in', selectOrValues);
  }
  notIn(_values: T[]): Condition;
  notIn(_select: Fetchable<T>): Condition;
  notIn(selectOrValues: Fetchable<T> | T[]): Condition {
    if (Array.isArray(selectOrValues)) {
      selectOrValues = new FetchableData<T>(selectOrValues, this.converter);
    }
    return new ConditionRightQuery(this, 'not in', selectOrValues);
  }

  count(): Field<number> {
    return new AggregationFunction(this, Aggregations.count);
  }

  as(alias: string): Field<T, DbType> {
    return new FieldAs<T, DbType>(this, alias, this.converter);
  }

  concat(value: Field<string> | string): Field<string> {
    return new Expression<any>(this, ExpressionOperators.concat, value);
  }
  add<T>(value: Field<T> | T): Field<T> {
    return new Expression<any>(this, ExpressionOperators.add, value);
  }
  subtract<T>(value: Field<T> | T): Field<T> {
    return new Expression<any>(this, ExpressionOperators.subtract, value);
  }
  multiply(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.multiply, value);
  }
  divide(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.divide, value);
  }
  modulo(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.modulo, value);
  }
  bitNot(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitNot, value);
  }
  bitAnd(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitAnd, value);
  }
  bitOr(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitOr, value);
  }
  bitXor(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitXor, value);
  }
  bitNand(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitNand, value);
  }
  bitNor(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitNor, value);
  }
  bitXNor(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitXNor, value);
  }
  bitShiftLeft(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitShiftLeft, value);
  }
  bitShiftRight(value: Field<number> | number): Field<number> {
    return new Expression<any>(this, ExpressionOperators.bitShiftRight, value);
  }

  avg<T>(value: Field<T>): Field<number> {
    return new AggregationFunction<T>(value, Aggregations.avg);
  }
  min<T>(value: Field<T>): Field<number> {
    return new AggregationFunction<T>(value, Aggregations.min);
  }
  max<T>(value: Field<T>): Field<number> {
    return new AggregationFunction<T>(value, Aggregations.max);
  }
  sum<T>(value: Field<T>): Field<number> {
    return new AggregationFunction<T>(value, Aggregations.sum);
  }

  operator(operator: string, value: Field<T> | T): Condition {
    return new ConditionCompare(this, operator, value);
  }

  like(value: string): Condition {
    return new ConditionCompare(this, 'LIKE', value);
  }
  ilike(value: string): Condition {
    return new ConditionCompare(this, 'ILIKE', value);
  }
}

export class FieldName<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends FieldAbstract<T, DbType> {
  constructor(private field: string, converter?: Converter<DbType, T>) {
    super(converter);
  }
  // eslint-disable-next-line
  toSql(_options?: FieldOptions): string {
    return this.field;
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

export class FieldRaw<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends FieldAbstract<T, DbType> {
  constructor(private field: string, converter?: Converter<DbType, T>) {
    super(converter);
  }
  // eslint-disable-next-line
  toSql(options?: FieldOptions): string {
    return identifierToSql(this.field, options);
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

export class FieldTable<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends FieldAbstract<T, DbType> {
  constructor(
    public table: TableLike,
    public field: string,
    public converter?: Converter<DbType, T>,
  ) {
    super(converter);
  }
  toSql(options?: FieldOptions): string {
    return `${this.table.toSql(options)}.${identifierToSql(
      this.field,
      options,
    )}`;
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

export class FieldAs<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends FieldAbstract<T, DbType> {
  constructor(
    public field: Field<T, DbType>,
    public alias: string,
    public converter?: Converter<DbType, T>,
  ) {
    super(converter);
  }
  toSql(options?: FieldOptions): string {
    return `${this.field.toSql()} as ${identifierToSql(this.alias, options)}`;
  }

  getName(options?: FieldOptions): string {
    return identifierToSql(this.alias, options);
  }

  as(alias: string): Field<T, DbType> {
    return new FieldAs<T, DbType>(this.field, alias, this.converter);
  }
}

export class FieldGroup<
  T extends Field<unknown>[],
  TupleFields extends [...T],
  Tuple extends {
    [Index in keyof TupleFields]: FieldToValue<TupleFields[Index]>;
  } & { length: TupleFields['length'] }
> extends FieldAbstract<Tuple> {
  constructor(public fields: TupleFields) {
    super();
  }
  toSql(options?: FieldOptions): string {
    return `(${this.fields.map((f) => f.toSql(options)).join(',')})`;
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

interface ExpressionOperator {
  operator: string;
}

function getConverter<T, DbType extends DbTypes>(
  fields: (Field<T, DbType> | T)[],
): Converter<DbType, T> | undefined {
  const onlyFields = fields
    .filter((field) => field instanceof Field)
    .map((field) => field as Field<T, DbType>)
    .filter((field) => field.converter);
  if (!onlyFields.length) {
    return undefined;
  }
  return onlyFields[0].converter;
}

export const ExpressionOperators = {
  concat: <ExpressionOperator>{ operator: '||' },
  add: <ExpressionOperator>{ operator: '+' },
  subtract: <ExpressionOperator>{ operator: '-' },
  multiply: <ExpressionOperator>{ operator: '*' },
  divide: <ExpressionOperator>{ operator: '/' },
  modulo: <ExpressionOperator>{ operator: '%' },
  bitNot: <ExpressionOperator>{ operator: '~' },
  bitAnd: <ExpressionOperator>{ operator: '&' },
  bitOr: <ExpressionOperator>{ operator: '|' },
  bitXor: <ExpressionOperator>{ operator: '^' },
  bitNand: <ExpressionOperator>{ operator: '~&' },
  bitNor: <ExpressionOperator>{ operator: '~|' },
  bitXNor: <ExpressionOperator>{ operator: '~^' },
  bitShiftLeft: <ExpressionOperator>{ operator: '<<' },
  bitShiftRight: <ExpressionOperator>{ operator: '>>' },
};

export class Expression<
    T,
    DbType extends DbTypes = T extends DbTypes ? T : DbTypes
  >
  extends FieldAbstract<T, DbType>
  implements Field<T, DbType> {
  constructor(
    public readonly left: Field<T, DbType> | T,
    public readonly _operator: ExpressionOperator,
    public readonly right: Field<T, DbType> | T,
  ) {
    super(
      getConverter<T, DbType>([left, right]),
    );
  }

  fieldToSql(field: Field<T, DbType> | T, options?: FieldOptions): string {
    if (!(field instanceof Field)) {
      field = FieldTools.valueToField(field, options);
    }
    return field.toSql(options);
  }

  toSql(options?: FieldOptions): string {
    return `${this.fieldToSql(this.left, options)} ${
      this._operator.operator
    } ${this.fieldToSql(this.right, options)}`;
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

interface Aggregation {
  aggregation: string;
}

export const Aggregations = {
  avg: <Aggregation>{ aggregation: 'avg' },
  min: <Aggregation>{ aggregation: 'min' },
  max: <Aggregation>{ aggregation: 'max' },
  sum: <Aggregation>{ aggregation: 'sum' },
  count: <Aggregation>{ aggregation: 'count' },
};

export class AggregationFunction<T>
  extends FieldAbstract<number>
  implements Field<number> {
  constructor(
    private readonly field: Field<T>,
    private readonly aggregation: Aggregation,
  ) {
    super();
  }

  toSql(options?: FieldOptions): string {
    return `${this.aggregation}(${this.field.toSql(options)})`;
  }

  getName(options?: FieldOptions): string {
    return this.toSql(options);
  }
}

export function fieldsToString(
  fields: TableFields,
  options?: IdentifierOptions,
): string {
  return Object.keys(fields)
    .map((key) => fields[key].toSql(options))
    .join(', ');
}

export function fieldsToStringOrAsterisk(
  fields: TableFields,
  options?: IdentifierOptions,
): string {
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return '*';
  }
  return fieldsToString(fields, options);
}

export class FieldExcluded<
  T,
  DbType extends DbTypes = T extends DbTypes ? T : DbTypes
> extends FieldAbstract<T, DbType> {
  constructor() {
    super();
  }
  toSql(): string {
    throw new Error('this should be handeleded togehter with the fields array');
  }

  getName(): string {
    throw new Error('this should be handeleded togehter with the fields array');
  }
}
