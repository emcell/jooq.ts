export class SqlSyntaxException extends Error {
  constructor(public query: string, message: any) {
    super(`${message} | query: ${query}`);
  }
}

export class NotImplementedException extends Error {
  constructor(what: string) {
    super(`${what} is not implemented`);
  }
}
