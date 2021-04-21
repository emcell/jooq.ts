import { IdentifierOptions } from '../utils';
import { DbTypes } from './dsl';
import { Field, FieldRaw } from './field';
import { mapFieldToDb } from './postgres/postgres-utils';

export type Converter<DbType extends DbTypes, FieldType> = {
  fromDb(value: DbType): FieldType;
  toDb(value: FieldType): DbType;
};

export class FieldTools {
  public static valueToField<
    T,
    DbType extends DbTypes = T extends DbTypes ? T : DbTypes
  >(
    value: T,
    options: IdentifierOptions | undefined,
    converter?: Converter<DbType, T>,
  ): Field<T, DbType> {
    return new FieldRaw<T, DbType>(
      `${mapFieldToDb(converter ? converter.toDb(value) : value, options)}`,
    );
  }
}

export class UnionTypeConverter<
  T extends string,
  M extends { [P in T]: number } = { [P in T]: number }
> implements Converter<number, T> {
  constructor(private valueMapper: M) {}
  fromDb(value: number): T {
    for (const key in this.valueMapper) {
      if (this.valueMapper[key] === value) {
        return (key as unknown) as T;
      }
    }
    throw new Error(
      `Value ${value} not present in fields of ${JSON.stringify(
        this.valueMapper,
        null,
        4,
      )}`,
    );
  }
  toDb(value: T): number {
    if (this.valueMapper[value] === undefined) {
      throw new Error(
        `Value ${value} not present in fields of ${JSON.stringify(
          this.valueMapper,
          null,
          4,
        )}`,
      );
    }
    return this.valueMapper[value];
  }
}
