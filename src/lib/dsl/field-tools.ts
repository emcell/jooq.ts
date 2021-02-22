import { DbTypes } from './dsl';
import { Field, FieldRaw } from './field';

export type Converter<DbType extends DbTypes, FieldType> = {
  fromDb(value: DbType): FieldType;
  toDb(value: FieldType): DbType;
};

function convertValueToRawSql<T>(value: T): string {
  if (typeof value === 'string') {
    return `'${value}'`;
  } else if (value === undefined) {
    return 'null';
  }
  return '' + value;
}

export class FieldTools {
  public static valueToField<
    T,
    DbType extends DbTypes = T extends DbTypes ? T : DbTypes
  >(value: T, toString?: (value: T) => string): Field<T, DbType> {
    return new FieldRaw<T, DbType>(
      toString ? toString(value) : `${convertValueToRawSql(value)}`,
    );
  }
}
