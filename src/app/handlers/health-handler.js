import { CONTENT_TYPE, HTTP_STATUS } from '../../core/constants/index.js';

export async function healthHandler(_request, context) {
  return new Response(
    JSON.stringify(
      {
        healthy: true,
        timestamp: new Date().toISOString(),
        environment: context.configuration.application.environment,
      },
      null,
      2
    ),
    {
      status: HTTP_STATUS.OK,
      headers: {
        'content-type': CONTENT_TYPE.JSON,
      },
    }
  );
}
