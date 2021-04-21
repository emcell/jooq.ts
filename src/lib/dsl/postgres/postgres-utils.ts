import { FieldDef, Pool, QueryArrayResult } from 'pg';
import { Condition, objectToConditions } from '../../condition';
import { SqlSyntaxException } from '../../exceptions';
import { Table, TableAliased, TableWithFields } from '../../table';
import { FieldOrValueMap, FieldsForType, TableFields } from '../../types';
import { IdentifierOptions, identifierToSql } from '../../utils';
import { DbTypes, DSL } from '../dsl';
import { Fetchable } from '../fetchable';
import { Field, FieldAs, FieldExcluded, FieldTable } from '../field';
import { Converter } from '../field-tools';

const pgFieldTypes = {
  int8: 20,
};

function convertField(
  value: any,
  fieldDefinition: FieldDef,
  converter?: Converter<any, any>,
) {
  if (converter) {
    return converter.fromDb(value);
  } else if (fieldDefinition.dataTypeID === pgFieldTypes.int8) {
    return parseInt(value, 10);
  } else {
    return value;
  }
}

export function mapRow<T>(
  row: any[],
  fields: TableFields,
  fieldDefinition: FieldDef[],
): T {
  const object: any = {};
  let i = 0;
  for (const fieldName in fields) {
    const field = fields[fieldName];
    if (row[i] !== null) {
      object[fieldName] = convertField(
        row[i],
        fieldDefinition[i],
        field.converter,
      );
    }
    i++;
  }
  return object as T;
}

export function mapResult<T>(
  fields: TableFields,
  queryResult: QueryArrayResult,
): T[] {
  const result: T[] = [];
  for (const row of queryResult.rows) {
    result.push(mapRow<T>(row, fields, queryResult.fields));
  }
  return result;
}
export function mapResultSingleField<T>(
  field: Field<unknown>,
  queryResult: QueryArrayResult,
): T[] {
  const result: T[] = [];
  for (const row of queryResult.rows) {
    result.push(convertField(row[0], queryResult.fields[0], field.converter));
  }
  return result;
}

export async function queryObject(pool: Pool, query: string): Promise<any[]> {
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (e) {
    throw new SqlSyntaxException(query, e);
  }
}

export async function queryArray(
  pool: Pool,
  query: string,
): Promise<QueryArrayResult> {
  try {
    const result = await pool.query({
      text: query,
      rowMode: 'array',
    });
    return result;
  } catch (e) {
    throw new SqlSyntaxException(query, e);
  }
}

export function aliasField<T>(field: Field<T>, tableAlias: string): Field<T> {
  if (field instanceof FieldTable) {
    return new FieldTable(new Table(tableAlias), field.field);
  } else if (field instanceof FieldAs) {
    return new FieldTable(new Table(tableAlias), field.alias);
  }
  return new FieldTable(new Table(tableAlias), field.getName());
}

export function aliasFields(
  fields: TableFields,
  tableAlias: string,
): TableFields {
  const convertedFields: TableFields = {};
  for (const key in fields) {
    convertedFields[key] = aliasField(fields[key], tableAlias);
  }
  return convertedFields;
}

export function PostgresFetchableImpl<T>(
  toSql: () => string,
  pool: Pool,
  fields: TableFields | Field<unknown>,
): Fetchable<T> {
  return {
    async fetch(): Promise<T[]> {
      const sql = this.toSql();
      if (fields instanceof Field) {
        return mapResultSingleField<T>(fields, await queryArray(pool, sql));
      } else if (!Object.keys(fields).length) {
        return queryObject(pool, sql);
      } else {
        return mapResult(fields, await queryArray(pool, sql));
      }
    },
    async fetchOne(): Promise<T | undefined> {
      const result = await this.fetch();
      return result.length ? result[0] : undefined;
    },
    async fetchOneOrThrow(): Promise<T> {
      const result = await this.fetch();
      if (result.length) {
        return result[0];
      }
      throw new Error('Zero rows fetched. Cannot return first row');
    },
    toSql(): string {
      return toSql();
    },
    asTable<
      F extends TableFields = T extends DbTypes
        ? { value: Field<T> }
        : FieldsForType<T>
    >(alias: string): TableWithFields<T, F> {
      const table = new TableAliased(alias, this);
      if (fields instanceof Field) {
        return ({
          value: aliasField(fields, alias),
          table,
          fields: { value: fields },
        } as unknown) as TableWithFields<T, F>;
      } else {
        const aliasedFields = aliasFields(fields, alias);
        return ({
          ...aliasedFields,
          table,
          fields: aliasedFields,
        } as unknown) as TableWithFields<T, F>;
      }
    },
    async fetchMap<K extends keyof T>(key: K): Promise<Map<K, T>> {
      const map = new Map<K, T>();
      const data = await this.fetch();
      data.forEach((d: any) => {
        map.set(d[key], d);
      });
      return map;
    },
  };
}

export function mapFieldToDb(
  value: unknown,
  options: IdentifierOptions | undefined,
): string {
  if (typeof value === 'number') {
    return '' + value;
  } else if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  } else if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'null';
  } else if (value instanceof Field) {
    return value.toSql(options);
  }
  return `'${value}'`;
}

export function toConditions<T>(
  fields: TableFields | Field<unknown>,
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
        fields,
      );
    }
  }

  return [...condition, ...(rest ? rest : [])];
}

export function fieldToInsertField(
  field: Field<any>,
  options?: IdentifierOptions,
): string {
  if (field instanceof FieldTable) {
    return identifierToSql(field.field, options);
  } else {
    return field.getName(options);
  }
}

export function fieldOrValueMapToSql<T>(
  fieldsOrValues: FieldOrValueMap<T>,
  fields: FieldsForType<T>,
  options?: IdentifierOptions,
): string {
  const sql: string[] = [];
  for (const key in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      if (Object.prototype.hasOwnProperty.call(fieldsOrValues, key)) {
        const value = fieldsOrValues[key];
        const field = fields[key];
        if (value instanceof FieldExcluded) {
          sql.push(
            `${fieldToInsertField(field, options)}=${DSL.excluded(
              fieldToInsertField(field, { wrapIdentifier: undefined }),
            ).toSql(options)}`,
          );
        } else if (value instanceof Field) {
          sql.push(
            `${fieldToInsertField(field, options)}=${value.toSql(options)}`,
          );
        } else {
          sql.push(
            `${fieldToInsertField(field, options)}=${mapFieldToDb(
              field.converter ? field.converter.toDb(value as any) : value,
              options,
            )}`,
          );
        }
      }
    }
  }
  return sql.join(', ');
}

export function generateFields(
  fields: TableFields,
  options?: IdentifierOptions,
): string {
  const sqlFields: string[] = [];
  for (const key in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      const field = fields[key];
      sqlFields.push(fieldToInsertField(field, options));
    }
  }
  return `${sqlFields.join(',')}`;
}
