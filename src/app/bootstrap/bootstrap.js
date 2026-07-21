// FILE: src/app/bootstrap/bootstrap.js

import { createConfiguration } from '../../core/config/index.js';
import { createContainer } from '../../core/container/index.js';
import { Router } from '../router/router.js';
import { registerRoutes } from '../router/routes.js';
import { HTTP_STATUS, CONTENT_TYPE } from '../../core/constants/index.js';

export async function bootstrap(request, env, ctx) {
  const correlationId = request.headers.get('cf-ray') || crypto.randomUUID();

  try {
    const configuration = createConfiguration(env);
    // 🚀 MEWARISKAN CTX RUNTIME KE CONTAINER
    const container = createContainer(configuration, env, ctx, correlationId);
    const router = registerRoutes(new Router());

    return await router.handle(request, {
      env,
      ctx,
      container,
      configuration,
      correlationId,
    });
  } catch (error) {
    console.error(`[FATAL SYSTEM INITIALIZATION ERROR] CorrelationID: ${correlationId}`, {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        error: error.code || 'SYSTEM_INITIALIZATION_ERROR',
        message: error.message || 'Fatal system initialization error.',
        correlationId,
        diagnostics: 'Please verify if ENCRYPTION_SECRET is correctly set using wrangler secrets.'
      }, null, 2),
      {
        status: error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: {
          'content-type': CONTENT_TYPE.JSON,
        },
      }
    );
  }
}