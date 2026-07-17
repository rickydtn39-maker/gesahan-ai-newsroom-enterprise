import { HTTP_STATUS } from '../constants/index.js';
import { ERROR_CODE } from './error-codes.js';

export class AppError extends Error {
  constructor({
    message,
    code = ERROR_CODE.UNKNOWN,
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details = null,
    cause = null
  }) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.cause = cause;

    Error.captureStackTrace?.(this, this.constructor);
  }
}