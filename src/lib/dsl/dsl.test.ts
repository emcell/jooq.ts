import { Table } from '../table';
import { DSL } from './dsl';
import { UnionTypeConverter } from './field-tools';

type ValueType = 'a' | 'b';

const valueTypeNumberMap: { [P in ValueType]: number } = {
  a: 0,
  b: 1,
};

export interface Test {
  id: number;
  value: ValueType;
}

describe('DSL', () => {
  it('should be possible to instanciate with converting types', () => {
    DSL.tableDefinition<Test>(new Table('test'), (table) => {
      return {
        id: table.field('id'),
        value: DSL.field<ValueType, number>(
          'value',
          new UnionTypeConverter<ValueType>(valueTypeNumberMap),
        ),
      };
    });
  });
});
