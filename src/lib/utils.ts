export interface IdentifierOptions {
  wrapIdentifier?: string;
}

export function identifierToSql(
  identifier: string,
  options?: IdentifierOptions,
): string {
  if (options?.wrapIdentifier) {
    return `${options.wrapIdentifier}${identifier}${options.wrapIdentifier}`;
  }
  return identifier;
}

export function fieldOf<T>(field: keyof T): keyof T {
  return field;
}
