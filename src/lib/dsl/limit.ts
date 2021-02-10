import { Fetchable } from './fetchable';

export interface LimitStep<T> extends Fetchable<T> {
  limit(count: number): Fetchable<T>;
  limit(offset: number, count: number): Fetchable<T>;
  first(): Fetchable<T>;
}
