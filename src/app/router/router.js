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
          status: 404,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    return route.handler(request, context);
  }
}
