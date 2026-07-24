import { HTTP_STATUS, CONTENT_TYPE } from '../../core/constants/index.js';
import { TOKENS } from '../../core/container/tokens.js';

export class Router {
  #routes = [];

  register(method, path, handler) {
    this.#routes.push({
      method: method.toUpperCase(),
      path,
      handler,
    });

    return this;
  }

  async handle(request, context) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    const route = this.#routes.find((item) => item.method === method && item.path === url.pathname);

    if (!route) {
      return new Response(
        JSON.stringify({
          error: 'NOT_FOUND',
          message: 'Route not found.',
        }),
        {
          status: HTTP_STATUS.NOT_FOUND,
          headers: {
            'content-type': CONTENT_TYPE.JSON,
          },
        }
      );
    }

    try {
      return await route.handler(request, context);
    } catch (error) {
      const logger = context.container.resolve(TOKENS.LOGGER);
      const metrics = context.container.resolve(TOKENS.METRICS);

      const status = error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const code = error.code || 'INTERNAL_ERROR';

      logger.error('Unhandled Exception caught by Global Router Middleware', {
        message: error.message,
        code,
        status,
        stack: error.stack,
        cause: error.cause ? error.cause.message : null,
      });

      metrics.increment('router_errors', 1, { code, status });

      return new Response(
        JSON.stringify(
          {
            error: code,
            message: error.message || 'An unexpected error occurred.',
            correlationId: context.correlationId,
          },
          null,
          2
        ),
        {
          status,
          headers: {
            'content-type': CONTENT_TYPE.JSON,
          },
        }
      );
    }
  }
}
