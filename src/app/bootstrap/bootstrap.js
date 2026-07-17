import {
  APPLICATION,
  CONTENT_TYPE,
  HTTP_STATUS
} from '../../core/constants/index.js';

export async function bootstrap(_request, _env, _ctx) {
  const body = {
    service: APPLICATION.NAME,
    version: APPLICATION.VERSION,
    status: 'healthy',
    runtime: APPLICATION.RUNTIME
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: HTTP_STATUS.OK,
    headers: {
      'content-type': CONTENT_TYPE.JSON
    }
  });
}