import { Condition } from '../condition';

export interface WhereChainStep<T, WhereStep> {
  and(condition: Condition): WhereStep;
  and(conditions: Condition[]): WhereStep;
  and(...conditions: Condition[]): WhereStep;
  and(fieldValues: Partial<T>, operator?: string): WhereStep;
  or(condition: Condition): WhereStep;
  or(conditions: Condition[]): WhereStep;
  or(...conditions: Condition[]): WhereStep;
  or(fieldValues: Partial<T>, operator?: string): WhereStep;
}

export interface WhereStep<T, WhereChainStep> {
  where(condition: Condition): WhereChainStep;
  where(condition: Condition[]): WhereChainStep;
  where(...condition: Condition[]): WhereChainStep;
  where(object: Partial<T>, operator?: string): WhereChainStep;
}
