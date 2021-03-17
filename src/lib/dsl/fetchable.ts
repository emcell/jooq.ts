import { Table, TableAliased, TableWithFields } from '../table';
import { FieldsForType, TableFields } from '../types';
import { IdentifierOptions } from '../utils';
import { DbTypes } from './dsl';
import { Field, FieldTable } from './field';
import { mapFieldToDb } from './postgres/postgres-utils';

export interface Fetchable<T> {
  fetch(): Promise<T[]>;
  fetchOne(): Promise<T | undefined>;
  fetchOneOrThrow(): Promise<T>;
  asTable<
    F extends TableFields = T extends DbTypes
      ? { value: Field<T> }
      : FieldsForType<T>
  >(
    alias: string,
  ): TableWithFields<T, F>;
  toSql(options?: IdentifierOptions): string;
  fetchMap<K extends keyof T>(key: K): Promise<Map<K, T>>;
}

export class FetchableData<T> implements Fetchable<T> {
  constructor(private data: T[]) {}
  async fetch(): Promise<T[]> {
    return this.data;
  }

  async fetchOne(): Promise<T | undefined> {
    return this.data.length == 0 ? undefined : this.data[0];
  }

  async fetchOneOrThrow(): Promise<T> {
    if (this.data.length === 0) {
      throw new Error('Zero rows fetched. Cannot return first row');
    }
    return this.data[0];
  }

  dataToTable(): string {
    return this.data
      .map((value) => `select ${mapFieldToDb(value, undefined)}`)
      .join(' UNION ALL ');
  }
  asTable<
    F extends TableFields = T extends DbTypes
      ? { value: Field<T> }
      : FieldsForType<T>
  >(alias: string): TableWithFields<T, F> {
    const valueField = new FieldTable<T>(new Table(alias), 'value') as Field<T>;
    const t: TableWithFields<unknown, { value: Field<T> }> = {
      table: new TableAliased(alias, this.dataToTable()),
      fields: { value: valueField },
      value: valueField,
    };
    return t as any;
  }

  async fetchMap<K extends keyof T>(key: K): Promise<Map<K, T>> {
    const map = new Map<K, T>();
    this.data.forEach((d: any) => map.set(d[key], d));
    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toSql(_options?: IdentifierOptions): string {
    if (this.data.length === 0) {
      return '()';
    }
    if (typeof this.data[0] === 'string') {
      return `(${this.data
        .map((value) => mapFieldToDb(value, _options))
        .join(',')})`;
    }
    return `${this.data.join(',')}`;
  }
}
