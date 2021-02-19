import { DSL } from './dsl/dsl';
import { Fetchable } from './dsl/fetchable';
import { Field } from './dsl/field';
import { FieldTools } from './dsl/field-tools';
import { TableFields } from './types';
import { IdentifierOptions } from './utils';

export abstract class Condition {
  abstract toSql(_options?: IdentifierOptions): string;
}

export class ConditionRaw extends Condition {
  constructor(private sql: string) {
    super();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toSql(_options?: IdentifierOptions): string {
    return this.sql;
  }
}

export class ConditionCompare<T> extends Condition {
  constructor(
    public readonly left: Field<T>,
    public readonly operator: string,
    public readonly right: Field<T> | T,
  ) {
    super();
  }

  toSql(options?: IdentifierOptions): string {
    const rValue: Field<T> =
      this.right instanceof Field
        ? this.right
        : FieldTools.valueToField(this.right);

    return `${this.left.toSql(options)} ${this.operator} ${rValue.toSql(
      options,
    )}`;
  }
}

export class ConditionRightQuery<T> extends Condition {
  constructor(
    public readonly left: Field<T>,
    public readonly operator: string,
    public readonly right: Fetchable<T>,
  ) {
    super();
  }

  toSql(options?: IdentifierOptions): string {
    return `${this.left.toSql(options)} ${this.operator} (${this.right.toSql(
      options,
    )})`;
  }
}

export class ConditionUnaryOperator<T> extends Condition {
  constructor(
    public readonly left: Field<T>,
    public readonly operator: string,
  ) {
    super();
  }

  toSql(options?: IdentifierOptions): string {
    return `${this.left.toSql(options)} ${this.operator}`;
  }
}

export class ConditionField<T> extends Condition {
  constructor(
    private fieldA: Field<T>,
    private operator: string,
    private fieldB: Field<T> | unknown,
  ) {
    super();
  }

  toSql(options?: IdentifierOptions): string {
    return `${this.fieldA.toSql(options)} ${this.operator} ${this.fieldB}`;
  }
}

export class ConditionOr extends Condition {
  constructor(public conditions: Condition[]) {
    super();
  }
  toSql(options?: IdentifierOptions): string {
    if (this.conditions.length === 1) {
      return this.conditions[0].toSql(options);
    } else if (this.conditions.length === 0) {
      return '';
    }
    return `(${this.conditions
      .map((condition) => `${condition.toSql(options)}`)
      .join(' or ')})`;
  }
}

export class ConditionAnd extends Condition {
  constructor(public conditions: Condition[]) {
    super();
  }
  toSql(options?: IdentifierOptions): string {
    if (this.conditions.length == 1) {
      return this.conditions[0].toSql(options);
    } else if (this.conditions.length == 0) {
      return '';
    }
    return `(${this.conditions
      .map((condition) => `${condition.toSql(options)}`)
      .join(' and ')})`;
  }
}

export function objectToConditions(
  _obj: unknown,
  _operator: string,
  fields?: TableFields | Field<unknown>,
): Condition[] {
  const conditions: Condition[] = [];
  const obj = _obj as any;
  for (const key in obj) {
    if (fields) {
      if (!(fields instanceof Field)) {
        if (fields[key]) {
          conditions.push(fields[key].operator(_operator, obj[key] as unknown));
          continue;
        }
      }
    }
    conditions.push(
      DSL.field<unknown>(key).operator(_operator, obj[key] as unknown),
    );
  }
  return conditions;
}
