import {
  APPLICATION,
  CONTENT_TYPE,
  HTTP_STATUS
} from '../../core/constants/index.js';

import { createConfiguration } from '../../core/config/index.js';
import { createContainer, TOKENS } from '../../core/container/index.js';
import { AppError } from '../../core/errors/index.js';

export async function bootstrap(_request, _env, _ctx) {
  try {
    const configuration = createConfiguration(_env);
    const container = createContainer(configuration);

    const logger = container.resolve(TOKENS.LOGGER);

    logger.info('Application bootstrap completed.', {
      environment: configuration.application.environment
    });

    const body = {
      service: APPLICATION.NAME,
      version: APPLICATION.VERSION,
      status: 'healthy',
      runtime: APPLICATION.RUNTIME,
      environment: configuration.application.environment,
      container: {
        initialized: true
      }
    };

    return new Response(JSON.stringify(body, null, 2), {
      status: HTTP_STATUS.OK,
      headers: {
        'content-type': CONTENT_TYPE.JSON
      }
    });
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError({
            message: 'Unexpected bootstrap error',
            cause: error
          });

    return new Response(
      JSON.stringify(
        {
          error: appError.code,
          message: appError.message
        },
        null,
        2
      ),
      {
        status: appError.status,
        headers: {
          'content-type': CONTENT_TYPE.JSON
        }
      }
    );
  }
}