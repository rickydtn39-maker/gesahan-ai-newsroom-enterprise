import { createConfiguration } from '../../core/config/index.js';
import { createContainer } from '../../core/container/index.js';

import { Router } from '../router/router.js';
import { registerRoutes } from '../router/routes.js';

export async function bootstrap(request, env, ctx) {
  const configuration = createConfiguration(env);

  const container = createContainer(
    configuration,
    env
  );

  const router = registerRoutes(
    new Router()
  );

  return router.handle(request, {
    env,
    ctx,
    container,
    configuration
  });
}