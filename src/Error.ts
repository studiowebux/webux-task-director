export default class CustomError extends Error {
  name: string;
  cause: string;
  code: number;
  extra: object;
  devMessage: string;

  constructor(
    message: string,
    name: string,
    code: number,
    extra = {},
    devMessage = ''
  ) {
    super(message);

    this.name = name || 'UNKNOWN_ERROR';
    this.cause = name || 'UNKNOWN_ERROR';
    this.code = code || 500;
    this.extra = extra;
    this.devMessage = devMessage;
  }
}
