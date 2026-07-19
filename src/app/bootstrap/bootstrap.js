import { createConfiguration } from '../../core/config/index.js';
import { createContainer } from '../../core/container/index.js';

import { Router } from '../router/router.js';
import { registerRoutes } from '../router/routes.js';

export async function bootstrap(request, env, ctx) {
  // 🚀 GENERATE CORRELATION ID UNTUK TRACING LOG MULTI-LAYER
  const correlationId = request.headers.get('cf-ray') || crypto.randomUUID();

  const configuration = createConfiguration(env);

  const container = createContainer(configuration, env, correlationId);

  const router = registerRoutes(new Router());

  return router.handle(request, {
    env,
    ctx,
    container,
    configuration,
    correlationId,
  });
}
