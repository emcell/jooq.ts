import { SqlSyntaxException } from '../exceptions';
import { PostgresContext } from './postgres/dsl.context.postgres';

export interface Executable {
  execute(): Promise<number>;
  toSql(): string;
}

export function AbstractExecutableImpl(
  toSql: () => string,
  context: PostgresContext,
): Executable {
  return {
    async execute(): Promise<number> {
      const sql = toSql();
      try {
        const result = await context.runtime.pool.query(sql);
        return result.rowCount;
      } catch (e) {
        throw new SqlSyntaxException(sql, e);
      }
    },
    toSql,
  };
}
