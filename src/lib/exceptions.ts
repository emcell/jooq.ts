function toMessage(e: any): string {
  if (e instanceof Error) {
    return e.message;
  }
  return JSON.stringify(e);
}

export class JooqException extends Error {
  constructor(
    public originalError: any,
    public query?: string,
  ) {
    super(
      query
        ? `${toMessage(originalError)} | ${query}`
        : toMessage(originalError),
    );
  }
}
export class UniqueConstraintException extends JooqException {
  constructor(originalError: Error, query?: string) {
    super(originalError.message, query);
  }
}

export function convertException(e: any, query?: string): Error {
  if (e instanceof Error) {
    const a: any = e;
    if (a.code === '23505') {
      return new UniqueConstraintException(e, query);
    }
  }
  return new JooqException(e, query);
}
export class NotImplementedException extends Error {
  constructor(what: string) {
    super(`${what} is not implemented`);
  }
}
