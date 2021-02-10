import { TableFields } from '../types';
import { Field } from '../field/field';

export function mapRow<T>(row: any[], fields: TableFields): T {
  const object: any = {};
  let i = 0;
  for (const fieldName in fields) {
    const field = fields[fieldName];
    object[fieldName] = field.converter
      ? field.converter.fromDb(row[i++])
      : row[i++];
  }
  return object as T;
}

export function mapResult<T>(fields: TableFields, rows: any[][]): T[] {
  const result: T[] = [];
  for (const row of rows) {
    result.push(mapRow<T>(row, fields));
  }
  return result;
}
export function mapResultSingleField<T>(
  field: Field<unknown>,
  rows: any[][],
): T[] {
  const result: T[] = [];
  for (const row of rows) {
    result.push(field.converter ? field.converter.fromDb(row[0]) : row[0]);
  }
  return result;
}
