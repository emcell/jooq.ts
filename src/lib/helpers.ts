export interface ToSql<T = any> {
  toSql(options?: T): string;
}
