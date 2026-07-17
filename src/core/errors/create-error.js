import { AppError } from './app-error.js';

export function createError(options) {
  return new AppError(options);
}