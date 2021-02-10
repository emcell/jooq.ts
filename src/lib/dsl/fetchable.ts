import { IdentifierOptions } from '../utils';

export interface Fetchable<T> {
  fetch(): Promise<T[]>;
  fetchOne(): Promise<T | undefined>;
  fetchOneOrThrow(): Promise<T>;
  toSql(options?: IdentifierOptions): string;
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

  toSql(_options?: IdentifierOptions): string {
    if (this.data.length === 0) {
      return '()';
    }
    if (typeof this.data[0] === 'string') {
      return `(${this.data.map((value) => `'${value}'`).join(',')})`;
    }
    return `${this.data.join(',')}]`;
  }
}
