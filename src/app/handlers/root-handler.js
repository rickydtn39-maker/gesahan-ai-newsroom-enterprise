import { APPLICATION, CONTENT_TYPE, HTTP_STATUS } from '../../core/constants/index.js';

export async function rootHandler(_request, context) {
  return new Response(
    JSON.stringify(
      {
        service: APPLICATION.NAME,
        version: APPLICATION.VERSION,
        runtime: APPLICATION.RUNTIME,
        environment: context.configuration.application.environment,
        status: 'healthy',
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
