export async function bootstrap(_request, _env, _ctx) {
  const body = {
    service: 'GESAHAN AI NEWSROOM ENTERPRISE',
    version: '0.1.0',
    status: 'healthy',
    runtime: 'cloudflare-workers'
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
}