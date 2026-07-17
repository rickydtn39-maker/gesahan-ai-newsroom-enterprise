import { bootstrap } from './app/bootstrap/bootstrap.js';

export default {
  async fetch(request, env, ctx) {
    return bootstrap(request, env, ctx);
  }
};