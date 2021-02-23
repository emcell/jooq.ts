import { Page } from '../types';
import { Fetchable } from './fetchable';

export interface LimitStep<T> extends Fetchable<T> {
  limit(count: number): Fetchable<T>;
  limit(offset: number, count: number): Fetchable<T>;
  limit(page?: Page): Fetchable<T>;
  first(): Fetchable<T>;
}
