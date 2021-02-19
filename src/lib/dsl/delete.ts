import { Executable } from './executable';
import { ReturningStepUnknownFields } from './returning';
import { WhereChainStep, WhereStep } from './where';

export interface DeleteStep
  extends Executable,
    ReturningStepUnknownFields,
    DeleteWhereStep {}

export interface DeleteWhereChainStep
  extends WhereChainStep<any, DeleteWhereChainStep>,
    Executable,
    ReturningStepUnknownFields {}

export interface DeleteWhereStep extends WhereStep<any, DeleteWhereChainStep> {}
