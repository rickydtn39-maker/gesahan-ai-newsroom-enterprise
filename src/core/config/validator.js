import { AppError } from '../errors/index.js';
import { ERROR_CODE } from '../errors/index.js';

export function validateConfiguration(configuration) {
  if (!configuration) {
    throw new AppError({
      message: 'Configuration is required.',
      code: ERROR_CODE.CONFIGURATION,
    });
  }

  return configuration;
}
