import { DbTypes } from './dsl';
import { Field } from './dsl/field';

export interface TableFields {
  [P: string]: Field<unknown>;
}

export type FieldsForType<T> = {
  [P in keyof T]-?: P extends keyof T ? Field<T[P], DbTypes> : never;
};

export type MapTableFieldsToValue<T extends TableFields> = {
  [P in keyof T]: T[P] extends Field<infer U> ? U : never;
};

export type MapValueToFieldOrValue<T> = {
  [P in keyof T]: T[P] | Field<T[P]>;
};

export type FieldOrValueMap<T> = {
  [P in keyof T]: T[P] | Field<T[P]>;
};

export interface Assignment<T> {
  field: Field<T>;
  value: Field<T> | T;
}

export type Subset<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Page = {
  offset?: number;
  count?: number;
};
