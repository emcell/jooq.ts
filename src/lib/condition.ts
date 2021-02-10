import { IdentifierOptions } from './utils';
import { Field } from './field/field';
import { Fetchable } from './dsl/fetchable';
import { FieldTools } from './field/field-tools';
import { DSL } from './dsl/dsl';

export abstract class Condition {
  abstract toSql(_options?: IdentifierOptions): string;
}

export class ConditionRaw extends Condition {
  constructor(private sql: string) {
    super();
  }
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
): Condition[] {
  //TODO: check against fields in context
  const obj = _obj as any;
  for (const key in obj) {
    DSL.field<unknown>(key).operator(_operator, obj[key] as unknown);
  }
  return [];
}
