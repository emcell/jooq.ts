import { DSL } from '.';
import { IdentifierOptions } from '../utils';

const options: IdentifierOptions = {
  wrapIdentifier: '"',
};

describe('field', () => {
  it('should average', () => {
    expect(DSL.field('test').avg().toSql(options)).toBe('avg("test")');
  });
  it('should min', () => {
    expect(DSL.field('test').min().toSql(options)).toBe('min("test")');
  });
  it('should max', () => {
    expect(DSL.field('test').max().toSql(options)).toBe('max("test")');
  });
  it('should sum', () => {
    expect(DSL.field('test').sum().toSql(options)).toBe('sum("test")');
  });
});
